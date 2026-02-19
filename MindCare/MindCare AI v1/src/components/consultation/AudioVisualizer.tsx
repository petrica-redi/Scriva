"use client";

import { useEffect, useRef, useCallback } from "react";

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

/**
 * Real-time audio visualization component.
 * Shows an animated frequency bar visualizer and a rolling waveform.
 */
export function AudioVisualizer({ audioLevel, isRecording, isPaused, duration }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(new Array(32).fill(0));
  const historyRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 32;
    const barWidth = (w / barCount) * 0.7;
    const barGap = (w / barCount) * 0.3;
    const maxBarHeight = h * 0.85;

    // Update bars with smooth decay
    for (let i = 0; i < barCount; i++) {
      const targetHeight = isPaused
        ? 2
        : Math.max(2, audioLevel * maxBarHeight * (0.5 + Math.random() * 0.8) * (1 - Math.abs(i - barCount / 2) / barCount * 0.4));
      barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3;
    }

    // Draw frequency bars
    for (let i = 0; i < barCount; i++) {
      const barH = barsRef.current[i];
      const x = i * (barWidth + barGap) + barGap / 2;
      const y = (h - barH) / 2;

      // Gradient from blue to purple based on height
      const intensity = barH / maxBarHeight;
      const r = Math.round(59 + intensity * 80);
      const g = Math.round(130 - intensity * 60);
      const b = Math.round(246 - intensity * 30);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + intensity * 0.4})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();
    }

    // Push audio level to history for the waveform
    historyRef.current.push(audioLevel);
    const maxHistory = Math.floor(w / 2);
    if (historyRef.current.length > maxHistory) {
      historyRef.current = historyRef.current.slice(-maxHistory);
    }

    // Draw waveform line at the bottom
    const waveY = h - 12;
    const waveHeight = 10;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth = 1.5;
    historyRef.current.forEach((level, i) => {
      const x = (i / maxHistory) * w;
      const y = waveY - level * waveHeight * 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (isRecording && !isPaused) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [audioLevel, isRecording, isPaused]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, isPaused, draw]);

  // Redraw whenever audioLevel changes
  useEffect(() => {
    if (isRecording && !isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [audioLevel, isRecording, isPaused, draw]);

  return (
    <div className="relative rounded-xl border border-medical-border bg-gradient-to-b from-gray-900 to-gray-800 p-4 overflow-hidden">
      {/* Pulse overlay when paused */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 z-10">
          <span className="text-sm font-semibold text-yellow-400 animate-pulse">PAUSED</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "120px" }}
      />
      {/* Activity indicator dots */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-150 ${
              isPaused
                ? "w-1.5 bg-yellow-500/40"
                : audioLevel > (i + 1) * 0.15
                  ? "w-3 bg-blue-400"
                  : "w-1.5 bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
