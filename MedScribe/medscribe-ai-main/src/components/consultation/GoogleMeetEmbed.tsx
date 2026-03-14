"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface GoogleMeetEmbedProps {
  consultationId: string;
  /** When true, shows compact draggable overlay instead of the inline launcher. */
  floating?: boolean;
  /** When true, renders inside a square embedded slot (draggable, integrated into layout). */
  slot?: boolean;
  isRecording?: boolean;
  duration?: string;
  streamingActive?: boolean;
  isMultichannel?: boolean;
  /** The captured tab video stream (Google Meet tab shared via getDisplayMedia). */
  remoteStream?: MediaStream | null;
}

const POPUP_W = 700;
const POPUP_H = 500;

const SLOT_SIZE = 320;

export function GoogleMeetEmbed({
  consultationId,
  floating = false,
  slot = false,
  isRecording = false,
  duration,
  streamingActive,
  isMultichannel,
  remoteStream,
}: GoogleMeetEmbedProps) {
  const [meetUrl, setMeetUrl] = useState("");
  const [popupAlive, setPopupAlive] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ---------- Draggable state (floating mode only) ----------
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [dragging, setDragging] = useState(false);

  // Attach remote stream to video element
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [remoteStream]);

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;

  // Poll popup status
  useEffect(() => {
    if (!popupAlive) return;
    const id = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        setPopupAlive(false);
        popupRef.current = null;
      }
    }, 800);
    return () => clearInterval(id);
  }, [popupAlive]);

  const openPopup = useCallback(
    (url: string) => {
      const left = Math.max(0, window.screenX + window.outerWidth - POPUP_W - 30);
      const top = window.screenY + 60;
      const win = window.open(
        url,
        `MedScribe-Meet-${consultationId.substring(0, 8)}`,
        `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=yes,status=no`
      );
      if (win) {
        popupRef.current = win;
        setPopupAlive(true);
        // Only store real meet links (abc-defg-hij), not meet.google.com/new
        if (!url.includes("/new")) {
          setMeetUrl(url);
        }
      }
    },
    [consultationId]
  );

  const handleNewMeeting = useCallback(() => {
    openPopup("https://meet.google.com/new");
  }, [openPopup]);

  const handleJoinMeeting = useCallback(() => {
    const link = prompt("Paste Google Meet link:");
    if (!link?.trim()) return;
    const url = link.trim().startsWith("http") ? link.trim() : `https://${link.trim()}`;
    openPopup(url);
  }, [openPopup]);

  const focusPopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
    } else if (meetUrl) {
      openPopup(meetUrl);
    }
  }, [meetUrl, openPopup]);

  // ---------- Drag handlers ----------
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const { mx, my, px, py } = dragOrigin.current;
      setPos({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // =====================================================================
  // SLOT MODE — dedicated video call PiP placeholder, fixed in layout
  // =====================================================================
  if (slot) {
    return (
      <div
        ref={panelRef}
        style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
        className="shrink-0 overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-md ring-1 ring-black/5"
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5z" />
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-700">Video call PiP</span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-red-600">REC</span>
            </div>
          )}
        </div>
        <div className="relative flex h-[calc(100%-40px)] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          {hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain bg-black"
            />
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-inner ring-1 ring-slate-200/50">
                <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">Patient video will appear here</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Share the <strong>Google Meet</strong> tab and enable &quot;Also share tab audio&quot; for live transcription.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================================
  // FLOATING MODE — during recording: shows live Google Meet tab capture
  // or compact bar if no tab video (fallback if slot not used)
  // =====================================================================
  if (floating) {
    // If we have the captured tab video, show it as a resizable floating panel
    if (hasRemoteVideo) {
      const style: React.CSSProperties = pos
        ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 50 }
        : { position: "fixed", top: 12, right: 12, zIndex: 50 };

      return (
        <div ref={panelRef} style={style} className="select-none">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-900">
            {/* Drag handle bar */}
            <div
              onMouseDown={onDragStart}
              className="flex items-center justify-between px-3 py-1.5 bg-gray-800 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
                <span className="text-[10px] font-medium text-gray-400">Google Meet — Patient view</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isRecording && (
                  <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-semibold text-red-400">REC {duration}</span>
                  </div>
                )}
                {isMultichannel && (
                  <div className="rounded-full bg-purple-500/20 px-2 py-0.5">
                    <span className="text-[9px] font-medium text-purple-400">Stereo</span>
                  </div>
                )}
                {streamingActive && (
                  <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5">
                    <span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[9px] font-medium text-green-400">Live</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video feed */}
            <div className="relative" style={{ width: 420, maxWidth: "90vw" }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-contain bg-black"
              />
              <button
                type="button"
                onClick={focusPopup}
                className="absolute bottom-2 right-2 rounded-md bg-black/50 hover:bg-black/70 text-white text-[10px] font-medium px-2 py-1 transition-colors backdrop-blur-sm"
              >
                Focus Meet
              </button>
            </div>
          </div>
        </div>
      );
    }

    // No tab video captured — compact status bar
    const style: React.CSSProperties = pos
      ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 50 }
      : { position: "fixed", top: 12, right: 12, zIndex: 50 };

    return (
      <div ref={panelRef} style={style} className="select-none">
        <div
          className={`flex items-center gap-2 rounded-xl shadow-2xl border px-3 py-2 ${
            popupAlive
              ? "bg-gray-900/95 border-gray-700 text-white backdrop-blur-md"
              : "bg-white border-gray-200 text-gray-700"
          }`}
        >
          <div onMouseDown={onDragStart} className="cursor-grab active:cursor-grabbing p-0.5 -ml-1" title="Drag to reposition">
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
            </svg>
          </div>

          <svg className="h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5zM2 6.5v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
          </svg>

          {popupAlive ? (
            <span className="text-xs font-medium text-green-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Google Meet active
            </span>
          ) : (
            <span className="text-xs text-gray-400">Meet not connected</span>
          )}

          {isRecording && (
            <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-red-400">REC {duration}</span>
            </div>
          )}

          {streamingActive && (
            <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5">
              <span className="text-[10px] font-medium text-green-400">Transcribing</span>
            </div>
          )}

          <button
            type="button"
            onClick={popupAlive ? focusPopup : handleNewMeeting}
            className={`ml-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              popupAlive
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {popupAlive ? "Focus" : "Open Meet"}
          </button>
        </div>
      </div>
    );
  }

  // =====================================================================
  // INLINE MODE — step-by-step setup with Meet link
  // =====================================================================
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-4 flex flex-col gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">How to record a remote consultation</h4>
          <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
            <li><strong>Open Google Meet</strong> in a new tab (button below). Create a meeting or join with a link.</li>
            <li><strong>Share the Meet link</strong> with your patient so they can join the call.</li>
            <li><strong>Stay on this MedScribe page.</strong> When you&apos;re ready, click the red Start Recording button.</li>
            <li><strong>When the browser asks &quot;Choose what to share&quot;</strong> — select the <strong>Google Meet</strong> tab (the one with your patient), <em>not</em> MedScribe.</li>
            <li><strong>Turn ON &quot;Also share tab audio&quot;</strong> — this captures your patient&apos;s voice for the transcript.</li>
            <li><strong>Done.</strong> The patient&apos;s video will appear in the box below. You&apos;ll see the live transcript here.</li>
          </ol>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewMeeting}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Open Google Meet
          </button>
          <button
            type="button"
            onClick={handleJoinMeeting}
            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 transition-colors"
          >
            Join with link
          </button>
          {popupAlive && (
            <button
              type="button"
              onClick={focusPopup}
              className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-medium px-3 py-2 transition-colors"
            >
              Focus Meet window
            </button>
          )}
        </div>
        {meetUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-500 truncate flex-1 font-mono">{meetUrl}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(meetUrl)}
              className="shrink-0 rounded-md bg-white border border-gray-200 hover:bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
            >
              Copy link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
