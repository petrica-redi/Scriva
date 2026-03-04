"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Wifi, WifiOff, RefreshCw, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineIndicator() {
  const { isOnline, queueLength, syncNow, isSyncing, lastSyncAt } = useOfflineSync();

  if (isOnline && queueLength === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm ${isOnline ? "bg-green-50 border border-green-200 text-green-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
      {isOnline ? (
        <>
          <Cloud className="w-4 h-4" />
          {queueLength > 0 ? (
            <>
              <span>{queueLength} items to sync</span>
              <Button size="sm" variant="ghost" onClick={syncNow} disabled={isSyncing} className="h-6 px-2">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              </Button>
            </>
          ) : (
            <span>All synced</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline mode {queueLength > 0 ? `(${queueLength} queued)` : ""}</span>
        </>
      )}
    </div>
  );
}
