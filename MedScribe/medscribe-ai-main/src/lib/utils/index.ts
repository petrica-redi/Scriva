import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: "bg-gray-100 text-gray-700",
    recording: "bg-red-100 text-red-700",
    transcribed: "bg-blue-100 text-blue-700",
    note_generated: "bg-amber-100 text-amber-700",
    reviewed: "bg-emerald-100 text-emerald-700",
    finalized: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    recording: "Recording",
    transcribed: "Transcribed",
    note_generated: "Note Generated",
    reviewed: "Reviewed",
    finalized: "Finalized",
    draft: "Draft",
  };
  return labels[status] ?? status;
}
