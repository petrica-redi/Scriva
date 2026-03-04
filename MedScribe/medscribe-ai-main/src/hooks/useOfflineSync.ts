"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface OfflineQueueItem {
  id: string;
  action: string;
  resource_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface UseOfflineSyncResult {
  isOnline: boolean;
  queueLength: number;
  addToQueue: (action: string, resourceType: string, payload: Record<string, unknown>) => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: string | null;
  clearQueue: () => void;
}

const STORAGE_KEY = "medscribe_offline_queue";
const LAST_SYNC_KEY = "medscribe_last_sync";

function getQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineQueueItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    setQueueLength(getQueue().length);
    setLastSyncAt(localStorage.getItem(LAST_SYNC_KEY));

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToQueue = useCallback((action: string, resourceType: string, payload: Record<string, unknown>) => {
    const queue = getQueue();
    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      action,
      resource_type: resourceType,
      payload,
      created_at: new Date().toISOString(),
    };
    queue.push(item);
    saveQueue(queue);
    setQueueLength(queue.length);
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    const queue = getQueue();
    const failed: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        const endpoint = `/api/${item.resource_type}`;
        const method = item.action === "create" ? "POST" : item.action === "update" ? "PATCH" : "DELETE";

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (!response.ok) {
          failed.push(item);
        }
      } catch {
        failed.push(item);
      }
    }

    saveQueue(failed);
    setQueueLength(failed.length);

    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, now);
    setLastSyncAt(now);

    syncingRef.current = false;
    setIsSyncing(false);
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setQueueLength(0);
  }, []);

  return {
    isOnline,
    queueLength,
    addToQueue,
    syncNow: syncQueue,
    isSyncing,
    lastSyncAt,
    clearQueue,
  };
}
