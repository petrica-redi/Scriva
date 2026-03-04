"use client";

import { useEffect, useState } from "react";
import { Mic, Check, AlertCircle } from "lucide-react";
import type { VoiceCommand } from "@/hooks/useVoiceCommands";

interface VoiceCommandIndicatorProps {
  lastCommand: VoiceCommand | null;
  isListening: boolean;
}

const actionLabels: Record<string, string> = {
  add_allergy: "Allergy Added",
  add_medication: "Medication Added",
  correction: "Correction Applied",
  flag_followup: "Flagged for Follow-up",
  mark_urgent: "Marked as Urgent",
  add_diagnosis: "Diagnosis Added",
  pause: "Recording Paused",
  resume: "Recording Resumed",
  bookmark: "Bookmark Added",
};

const actionColors: Record<string, string> = {
  add_allergy: "bg-orange-500",
  add_medication: "bg-blue-500",
  correction: "bg-yellow-500",
  flag_followup: "bg-purple-500",
  mark_urgent: "bg-red-500",
  add_diagnosis: "bg-green-500",
  pause: "bg-gray-500",
  resume: "bg-green-500",
  bookmark: "bg-brand-500",
};

export function VoiceCommandIndicator({ lastCommand, isListening }: VoiceCommandIndicatorProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [displayCommand, setDisplayCommand] = useState<VoiceCommand | null>(null);

  useEffect(() => {
    if (lastCommand) {
      setDisplayCommand(lastCommand);
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCommand]);

  return (
    <>
      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs text-brand-700">
          <Mic className="w-3 h-3 animate-pulse" />
          Voice commands active
        </div>
      )}

      {/* Command notification */}
      {showNotification && displayCommand && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300 ${actionColors[displayCommand.action] || "bg-brand-600"}`}>
          <Check className="w-4 h-4" />
          <div>
            <p className="text-sm font-medium">{actionLabels[displayCommand.action] || displayCommand.action}</p>
            {displayCommand.payload && (
              <p className="text-xs opacity-90">{displayCommand.payload}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
