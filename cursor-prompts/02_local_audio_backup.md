# Prompt 2: Local audio backup (never lose a recording)

## Context
`src/hooks/useAudioRecorder.ts` records audio via MediaRecorder. If Deepgram WebSocket dies, the audio is lost. We need to ALWAYS save audio locally in IndexedDB as a safety net.

## Task
Add local audio persistence to `useAudioRecorder.ts`:

### 1. Create a small IndexedDB helper
New file `src/lib/audio-storage.ts`:

```ts
const DB_NAME = "medscribe-audio";
const STORE_NAME = "recordings";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioChunk(consultationId: string, chunk: Blob): Promise<void> {
  const db = await openDB();
  const key = `${consultationId}_${Date.now()}`;
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(chunk, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFullRecording(consultationId: string): Promise<Blob | null> {
  const db = await openDB();
  const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
  const allKeys: IDBValidKey[] = await new Promise((res, rej) => {
    const req = store.getAllKeys();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const matchingKeys = allKeys
    .filter((k) => String(k).startsWith(`${consultationId}_`))
    .sort();
  if (matchingKeys.length === 0) return null;

  const blobs: Blob[] = [];
  for (const key of matchingKeys) {
    const blob: Blob = await new Promise((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    blobs.push(blob);
  }
  return new Blob(blobs, { type: "audio/webm" });
}

export async function clearRecording(consultationId: string): Promise<void> {
  const db = await openDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const allKeys: IDBValidKey[] = await new Promise((res, rej) => {
    const req = store.getAllKeys();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  for (const key of allKeys) {
    if (String(key).startsWith(`${consultationId}_`)) store.delete(key);
  }
}
```

### 2. Wire into useAudioRecorder.ts
In `useAudioRecorder`:
- Import `{ saveAudioChunk, getFullRecording }` from `@/lib/audio-storage`
- Add prop `consultationId?: string` to `UseAudioRecorderOptions`
- In the existing `ondataavailable` handler (where `chunksRef.current.push(event.data)`), also call:
  ```ts
  if (consultationId) saveAudioChunk(consultationId, event.data).catch(() => {});
  ```
- Add to return interface: `localAudioAvailable: boolean`
- Expose `getLocalAudio: () => Promise<Blob | null>` that calls `getFullRecording(consultationId)`
- When recording stops: set `localAudioAvailable = true`

### 3. Use in record page
In `src/app/(app)/consultation/[id]/record/page.tsx`:
- Pass `consultationId` to `useAudioRecorder({ ..., consultationId })`
- In post phase, if transcription failed, show button: "Transcribe from saved recording"
- On click: `const audio = await getLocalAudio()` → POST to `/api/deepgram/transcribe`

## Files to create
- `src/lib/audio-storage.ts`

## Files to modify
- `src/hooks/useAudioRecorder.ts`
- `src/app/(app)/consultation/[id]/record/page.tsx`
