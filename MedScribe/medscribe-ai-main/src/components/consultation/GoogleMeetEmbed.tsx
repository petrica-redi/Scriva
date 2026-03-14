"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface GoogleMeetEmbedProps {
  consultationId: string;
  /** When true, shows compact draggable overlay instead of the inline launcher. */
  floating?: boolean;
  isRecording?: boolean;
  duration?: string;
  streamingActive?: boolean;
  isMultichannel?: boolean;
  /** The captured tab video stream (Google Meet tab shared via getDisplayMedia). */
  remoteStream?: MediaStream | null;
  /** When true, closes the Meet popup window (used when the consultation ends). */
  shouldClose?: boolean;
}

const POPUP_W = 700;
const POPUP_H = 500;

const MEET_LINK_RE = /^https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;

function isValidMeetLink(url: string): boolean {
  return MEET_LINK_RE.test(url.trim());
}

function normalizeMeetLink(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http")) url = `https://${url}`;
  return url;
}

export function GoogleMeetEmbed({
  consultationId,
  floating = false,
  isRecording = false,
  duration,
  streamingActive,
  isMultichannel,
  remoteStream,
  shouldClose = false,
}: GoogleMeetEmbedProps) {
  const [meetUrl, setMeetUrl] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [popupAlive, setPopupAlive] = useState(false);
  const [popupOpened, setPopupOpened] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Close the popup when the consultation ends
  useEffect(() => {
    if (shouldClose && popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
      popupRef.current = null;
      setPopupAlive(false);
    }
  }, [shouldClose]);

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

  // Persist meet_link to consultation metadata when meetUrl changes
  useEffect(() => {
    if (!meetUrl || !consultationId) return;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("consultations")
        .select("metadata")
        .eq("id", consultationId)
        .single();
      const existing = (data?.metadata || {}) as Record<string, unknown>;
      await supabase
        .from("consultations")
        .update({ metadata: { ...existing, meet_link: meetUrl } })
        .eq("id", consultationId);
    })();
  }, [meetUrl, consultationId]);

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
      }
    },
    [consultationId]
  );

  const handleNewMeeting = useCallback(() => {
    openPopup("https://meet.google.com/new");
    setPopupOpened(true);
  }, [openPopup]);

  const handleSetLink = useCallback(
    (raw: string) => {
      const url = normalizeMeetLink(raw);
      if (!isValidMeetLink(url)) return;
      setMeetUrl(url);
      setLinkInput(url);
      if (!popupAlive) {
        openPopup(url);
      }
    },
    [popupAlive, openPopup]
  );

  const handleLinkInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSetLink(linkInput);
      }
    },
    [linkInput, handleSetLink]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        setTimeout(() => handleSetLink(text), 0);
      }
    },
    [handleSetLink]
  );

  const handleCopy = useCallback(() => {
    if (!meetUrl) return;
    navigator.clipboard.writeText(meetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [meetUrl]);

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

  const linkInputValid = isValidMeetLink(normalizeMeetLink(linkInput));

  // =====================================================================
  // FLOATING MODE — during recording: shows live Google Meet tab capture
  // or compact bar if no tab video
  // =====================================================================
  if (floating) {
    if (hasRemoteVideo) {
      const style: React.CSSProperties = pos
        ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 50 }
        : { position: "fixed", top: 12, right: 12, zIndex: 50 };

      return (
        <div ref={panelRef} style={style} className="select-none">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-900">
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
  // INLINE MODE — pre-recording setup
  // =====================================================================

  const showLinkInput = popupOpened && !meetUrl;

  return (
    <div className="w-full rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white overflow-hidden shadow-sm">
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center gap-5 px-6 py-10">
        {meetUrl ? (
          /* ---- STATE 3: Valid Meet link set — show share section ---- */
          <>
            <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-white flex items-center gap-2 justify-center">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Google Meet is ready
              </p>
              <p className="text-xs text-gray-400 max-w-sm">
                Share the link below with your patient so they can join the call.
              </p>
            </div>

            {/* Prominent shareable link section */}
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-4 py-3">
                <svg className="h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                <span className="text-sm text-white font-mono truncate flex-1">{meetUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full rounded-lg text-sm font-semibold px-5 py-3 transition-all ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-100"
                }`}
              >
                {copied ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Copied! Send this link to your patient
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Copy link to share with patient
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={focusPopup}
                className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2 transition-colors"
              >
                {popupAlive ? "Focus Meet window" : "Reopen Meet"}
              </button>
              <button
                type="button"
                onClick={() => { setMeetUrl(""); setLinkInput(""); setPopupOpened(false); }}
                className="rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium px-4 py-2 transition-colors border border-white/5"
              >
                Change link
              </button>
            </div>
          </>
        ) : showLinkInput ? (
          /* ---- STATE 2: Popup opened, waiting for real link ---- */
          <>
            <div className="h-14 w-14 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-white flex items-center gap-2 justify-center">
                {popupAlive && <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />}
                {popupAlive ? "Google Meet is open" : "Paste your Meet link"}
              </p>
              <p className="text-xs text-gray-400 max-w-sm">
                Copy the meeting link from your Google Meet window and paste it here.
                This is the link you&apos;ll share with your patient.
              </p>
            </div>

            <div className="w-full max-w-md space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={handleLinkInputKeyDown}
                  onPaste={handlePaste}
                  placeholder="meet.google.com/abc-defg-hij"
                  className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-gray-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSetLink(linkInput)}
                  disabled={!linkInputValid}
                  className={`rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    linkInputValid
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Set link
                </button>
              </div>
              {linkInput && !linkInputValid && (
                <p className="text-[11px] text-amber-400 pl-1">
                  Paste a Google Meet link like meet.google.com/abc-defg-hij
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={popupAlive ? focusPopup : handleNewMeeting}
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-1.5 transition-colors"
            >
              {popupAlive ? "Focus Meet window" : "Reopen Meet"}
            </button>
          </>
        ) : (
          /* ---- STATE 1: Initial — no popup, no link ---- */
          <>
            <div className="h-16 w-16 rounded-full bg-gray-700/60 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5zM2 6.5v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
              </svg>
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-gray-200">Start a video call with your patient</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Create a new Google Meet or paste an existing link. You&apos;ll get a shareable link to send to your patient.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleNewMeeting}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 transition-colors shadow-lg shadow-blue-600/30"
              >
                New meeting
              </button>
              <button
                type="button"
                onClick={() => setPopupOpened(true)}
                className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 transition-colors border border-white/10"
              >
                I have a link
              </button>
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
        <p className="text-[11px] text-amber-700 leading-relaxed">
          <strong>How it works:</strong> Open your Google Meet call first and share the link with your patient.
          When you click Record, the browser asks which tab to share — pick the Google Meet tab and
          check <strong>&quot;Also share tab audio&quot;</strong>.
          Your mic captures your voice (Channel 1) and the tab captures the patient&apos;s voice (Channel 2) for accurate transcription.
        </p>
      </div>
    </div>
  );
}
