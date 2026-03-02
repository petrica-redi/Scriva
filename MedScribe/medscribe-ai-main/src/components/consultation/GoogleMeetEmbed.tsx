"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GoogleMeetEmbedProps {
  isRecording: boolean;
}

export function GoogleMeetEmbed({ isRecording }: GoogleMeetEmbedProps) {
  const [meetUrl, setMeetUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [isEmbedded, setIsEmbedded] = useState(false);

  const handleCreateMeeting = () => {
    // Opens Google Meet's "new meeting" flow in a new tab
    window.open("https://meet.google.com/new", "_blank");
  };

  const handleJoinMeeting = () => {
    const url = inputUrl.trim();
    if (!url) return;

    // Normalize URL
    let normalized = url;
    if (!normalized.startsWith("http")) {
      normalized = `https://meet.google.com/${normalized}`;
    }

    // Validate it's a Google Meet URL
    if (!normalized.includes("meet.google.com")) {
      return;
    }

    setMeetUrl(normalized);
    setIsEmbedded(true);
  };

  const handleOpenInTab = () => {
    if (meetUrl) {
      window.open(meetUrl, "_blank");
    }
  };

  const handleDisconnect = () => {
    setMeetUrl("");
    setInputUrl("");
    setIsEmbedded(false);
  };

  if (!isRecording) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {!isEmbedded ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5zM2 6.5v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-medical-text">Google Meet</h3>
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
                Create New Meeting
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
                  placeholder="meet.google.com/abc-defg-hij"
                  className="flex-1 rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button
                  onClick={handleJoinMeeting}
                  disabled={!inputUrl.trim()}
                  variant="outline"
                  size="sm"
                >
                  Embed
                </Button>
              </div>

              <p className="text-[11px] text-medical-muted leading-relaxed">
                💡 Create a meeting, then paste the link above to embed. Audio is captured via screen share for transcription.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Meet toolbar */}
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.5 8.5v7l4.5 2.5V6l-4.5 2.5zM2 6.5v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-11c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2z" />
                </svg>
                <span className="text-xs text-gray-300 font-medium truncate max-w-[200px]">
                  {meetUrl.replace("https://", "")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenInTab}
                  className="rounded p-1 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Open in new tab"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="rounded p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                  title="Disconnect"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Meet iframe */}
            <iframe
              src={meetUrl}
              className="w-full border-0"
              style={{ height: "480px" }}
              allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
