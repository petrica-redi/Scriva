/**
 * IndexedDB-backed local audio backup.
 *
 * A recording is written to IDB *before* the transcription API is called.
 * If the call succeeds the record is marked 'transcribed' and eventually pruned.
 * If the call fails (network, provider outage, browser crash) the record stays
 * as 'saved', and the recovery UI can offer the doctor a retry path.
 *
 * Intentional limits:
 *  - Only the batch-transcription path saves a backup (streaming path already
 *    has a live transcript, so no backup is needed).
 *  - TTL is 7 days. pruneExpiredBackups() removes older records.
 *  - If IndexedDB is unavailable (Safari private browsing) every function
 *    resolves silently so the recorder continues working.
 */

export interface AudioBackupRecord {
  /** consultationId from URL, or a generated UUID for anonymous sessions. */
  id: string;
  consultationId: string;
  audioBlob: Blob;
  mimeType: string;
  language: string;
  isMultichannel: boolean;
  durationSeconds: number;
  /** 'saved'       — blob written, transcription not yet confirmed. */
  /** 'transcribed' — transcription succeeded, safe to prune. */
  status: "saved" | "transcribed";
  startedAt: number;
  savedAt: number;
}

const DB_NAME = "scriva-audio-backups";
const DB_VERSION = 1;
const STORE = "recordings";
const TTL_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

// ─── DB open ──────────────────────────────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });

  return _dbPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist an audio recording before transcription is attempted.
 * Returns the record ID (same as consultationId).
 */
export async function saveAudioBackup(
  record: Omit<AudioBackupRecord, "status" | "savedAt">
): Promise<string> {
  if (!isIDBAvailable()) return record.id;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    const full: AudioBackupRecord = {
      ...record,
      status: "saved",
      savedAt: Date.now(),
    };
    await idbRequest(tx.objectStore(STORE).put(full));
    return record.id;
  } catch (err) {
    console.warn("[AudioBackup] Failed to save:", err);
    return record.id;
  }
}

/**
 * Mark a backup as successfully transcribed.
 * It will be removed on the next pruneExpiredBackups() call.
 */
export async function markBackupTranscribed(id: string): Promise<void> {
  if (!isIDBAvailable()) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const existing = await idbRequest<AudioBackupRecord | undefined>(store.get(id));
    if (existing) {
      await idbRequest(store.put({ ...existing, status: "transcribed" }));
    }
  } catch (err) {
    console.warn("[AudioBackup] Failed to mark transcribed:", err);
  }
}

/**
 * Return all recordings with status = 'saved' (i.e. transcription not confirmed).
 * Ordered newest-first.
 */
export async function listPendingBackups(): Promise<AudioBackupRecord[]> {
  if (!isIDBAvailable()) return [];

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const all = await idbRequest<AudioBackupRecord[]>(
      tx.objectStore(STORE).index("status").getAll("saved")
    );
    return all.sort((a, b) => b.savedAt - a.savedAt);
  } catch (err) {
    console.warn("[AudioBackup] Failed to list pending:", err);
    return [];
  }
}

/** Delete a single backup record (used after successful retry or user dismiss). */
export async function deleteAudioBackup(id: string): Promise<void> {
  if (!isIDBAvailable()) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).delete(id));
  } catch (err) {
    console.warn("[AudioBackup] Failed to delete:", err);
  }
}

/** Retrieve a single backup by id (e.g. for retry transcription). */
export async function getAudioBackup(id: string): Promise<AudioBackupRecord | null> {
  if (!isIDBAvailable()) return null;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const record = await idbRequest<AudioBackupRecord | undefined>(
      tx.objectStore(STORE).get(id)
    );
    return record ?? null;
  } catch (err) {
    console.warn("[AudioBackup] Failed to get:", err);
    return null;
  }
}

/**
 * Remove records older than TTL_MS (7 days), regardless of status.
 * Also immediately removes 'transcribed' records older than 1 day.
 * Call this on app mount to keep storage bounded.
 */
export async function pruneExpiredBackups(): Promise<void> {
  if (!isIDBAvailable()) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const all = await idbRequest<AudioBackupRecord[]>(store.getAll());
    const now = Date.now();

    for (const record of all) {
      const age = now - record.savedAt;
      const tooOld = age > TTL_MS;
      const transcribedAndStale =
        record.status === "transcribed" && age > 24 * 60 * 60 * 1_000;

      if (tooOld || transcribedAndStale) {
        store.delete(record.id);
      }
    }
  } catch (err) {
    console.warn("[AudioBackup] Failed to prune:", err);
  }
}
