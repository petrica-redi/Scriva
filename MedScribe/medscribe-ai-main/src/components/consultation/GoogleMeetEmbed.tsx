"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GoogleMeetEmbedProps {
  isRecording: boolean;
}

export function GoogleMeetEmbed({ isRecording }: GoogleMeetEmbedProps) {
  const [meetUrl, setMeetUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [meetingActive, setMeetingActive] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openMeetingPopup = useCallback((url: string) => {
    const width = Math.round(screen.width * 0.38);
    const height = Math.round(screen.height * 0.65);
    const left = screen.width - width - 20;
    const top = 60;

    const popup = window.open(
      url,
      "MedScribe_Meeting",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (popup) {
      popupRef.current = popup;
      setMeetingActive(true);

      pollRef.current = setInterval(() => {
        if (popup.closed) {
          setMeetingActive(false);
          popupRef.current = null;
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 1000);
    } else {
      window.open(url, "_blank");
      setMeetingActive(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCreateMeeting = () => {
    openMeetingPopup("https://meet.google.com/new");
  };

  const handleJoinMeeting = () => {
    const url = inputUrl.trim();
    if (!url) return;

    let normalized = url;
    if (!normalized.startsWith("http")) {
      normalized = `https://meet.google.com/${normalized}`;
    }
    if (!normalized.includes("meet.google.com") && !normalized.includes("zoom.us")) {
      return;
    }

    setMeetUrl(normalized);
    openMeetingPopup(normalized);
  };

  const handleFocusMeeting = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
    } else if (meetUrl) {
      openMeetingPopup(meetUrl);
    }
  };

  const handleDisconnect = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setMeetUrl("");
    setInputUrl("");
    setMeetingActive(false);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  if (!isRecording) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {!meetingActive ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5zM2 6.5v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-medical-text">Video Call</h3>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCreateMeeting}
                variant="primary"
                size="sm"
                className="w-full"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Start Google Meet (Side Window)
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-medical-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-medical-muted">or paste a meeting link</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                  placeholder="meet.google.com/abc-defg-hij or zoom link"
                  className="flex-1 rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button
                  onClick={handleJoinMeeting}
                  disabled={!inputUrl.trim()}
                  variant="outline"
                  size="sm"
                >
                  Open
                </Button>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-800 leading-relaxed space-y-1">
                <p className="font-semibold">How it works:</p>
                <p>The meeting opens in a <strong>side window</strong> so you can see both the patient and the live transcript simultaneously.</p>
                <p>When recording starts, select the meeting window in the share dialog and check <strong>&quot;Also share tab audio&quot;</strong> to capture the patient&apos;s voice.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <span className="text-sm font-semibold text-green-700">Meeting in Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={handleFocusMeeting}
                  variant="outline"
                  size="sm"
                >
                  <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Focus Meeting
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  End
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-medical-muted">
              The meeting is running in a side window. Your live transcript and AI copilot remain visible here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
