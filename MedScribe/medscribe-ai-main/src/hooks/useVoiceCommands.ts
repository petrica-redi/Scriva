"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface VoiceCommand {
  command: string;
  action: "add_allergy" | "add_medication" | "correction" | "flag_followup" | "mark_urgent" | "add_diagnosis" | "pause" | "resume" | "bookmark";
  payload: string;
  timestamp: number;
}

interface UseVoiceCommandsOptions {
  enabled?: boolean;
  commandPrefix?: string;
  onCommand?: (command: VoiceCommand) => void;
}

const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  action: VoiceCommand["action"];
  extractPayload: (match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*add allergy[:]?\s*(.+)/i,
    action: "add_allergy",
    extractPayload: (m) => m[1].trim(),
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*add medication[:]?\s*(.+)/i,
    action: "add_medication",
    extractPayload: (m) => m[1].trim(),
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*correction[:]?\s*(.+)/i,
    action: "correction",
    extractPayload: (m) => m[1].trim(),
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*flag (?:for )?follow[- ]?up[:]?\s*(.*)/i,
    action: "flag_followup",
    extractPayload: (m) => m[1]?.trim() || "Flagged for follow-up",
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*mark (?:as )?urgent[:]?\s*(.*)/i,
    action: "mark_urgent",
    extractPayload: (m) => m[1]?.trim() || "Marked as urgent",
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*add diagnosis[:]?\s*(.+)/i,
    action: "add_diagnosis",
    extractPayload: (m) => m[1].trim(),
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*pause/i,
    action: "pause",
    extractPayload: () => "",
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*resume/i,
    action: "resume",
    extractPayload: () => "",
  },
  {
    pattern: /(?:medscribe|med scribe|hey scribe)[,.]?\s*bookmark[:]?\s*(.*)/i,
    action: "bookmark",
    extractPayload: (m) => m[1]?.trim() || "Bookmark",
  },
];

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { enabled = true, onCommand } = options;
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const processedTextsRef = useRef(new Set<string>());

  const processTranscript = useCallback(
    (text: string) => {
      if (!enabled || !text) return;

      // Avoid processing the same text twice
      const normalized = text.toLowerCase().trim();
      if (processedTextsRef.current.has(normalized)) return;
      processedTextsRef.current.add(normalized);

      // Keep set from growing unbounded
      if (processedTextsRef.current.size > 1000) {
        const arr = Array.from(processedTextsRef.current);
        processedTextsRef.current = new Set(arr.slice(-500));
      }

      for (const { pattern, action, extractPayload } of COMMAND_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          const command: VoiceCommand = {
            command: match[0],
            action,
            payload: extractPayload(match),
            timestamp: Date.now(),
          };

          setCommands((prev) => [...prev, command]);
          setLastCommand(command);
          onCommand?.(command);
          break;
        }
      }
    },
    [enabled, onCommand]
  );

  const clearCommands = useCallback(() => {
    setCommands([]);
    setLastCommand(null);
  }, []);

  const undoLastCommand = useCallback(() => {
    setCommands((prev) => prev.slice(0, -1));
    setLastCommand(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processedTextsRef.current.clear();
    };
  }, []);

  return {
    commands,
    lastCommand,
    processTranscript,
    clearCommands,
    undoLastCommand,
    commandCount: commands.length,
  };
}
