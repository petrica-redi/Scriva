# Prompt 4: Simplify recording page UX for doctors

## Context
`src/app/(app)/consultation/[id]/record/page.tsx` is the main page doctors use with patients. It currently shows too many panels and options. A doctor with a patient sitting across the desk needs ONE button to start, clear status, and minimal distractions.

## Task

### Pre-recording phase
- Default `consultationMode` to `"in-person"` (already is, good)
- Remember `selectedLanguage` in localStorage: on mount read `localStorage.getItem("medscribe-lang")`, on change write it
- Move these behind a collapsible "Advanced Settings" section (collapsed by default): mode selector, `IdentityVerification`, `ProblemTracker`, `PreVisitBrief`
- Keep visible: language selector, template selector, consent checkbox
- Make consent checkbox larger with patient-facing copy: "I consent to this consultation being recorded for medical documentation"
- Add a "Test Microphone" button:
  ```tsx
  const [micTesting, setMicTesting] = useState(false);
  const [micWorks, setMicWorks] = useState<boolean | null>(null);

  async function testMic() {
    setMicTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Record 2 seconds
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
      await new Promise((r) => setTimeout(r, 2000));
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      await new Promise((r) => (recorder.onstop = r));
      // Play back
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
      setMicWorks(true);
    } catch {
      setMicWorks(false);
    }
    setMicTesting(false);
  }
  ```
  Show as small link/button: "Test microphone" → while testing show spinner → after: green check "Microphone working" or red X "Microphone not detected"
- Make "Start Recording" button large, green, centered, prominent

### During recording
- Hide: `AIAssistantPanel`, `ClinicalDecisionSupport`, `GoogleMeetEmbed`, `PreVisitBrief`, `ProblemTracker`
- Show ONLY:
  - `AudioVisualizer` (keep)
  - Duration timer (keep, make larger font)
  - Live transcript scroll area (keep)
  - Pause / Stop buttons (keep)
  - Green pulsing dot with "Recording" label: `<span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" /> Recording</span>`
  - Connection status as small subtle badge (already have `connectionStatus`)

### Post-recording
- Show a summary card: recording duration, word count (`transcript.reduce((n, t) => n + t.text.split(" ").length, 0)`), number of transcript segments
- Editable transcript textarea (already exists? if not, add one)
- Template selector + large "Generate Note" button
- Secondary button: "Save & Generate Later" (saves consultation with status "transcribed" without generating note)

## Files to modify
- `src/app/(app)/consultation/[id]/record/page.tsx`
