"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface WaitingRoomData {
  consultation_id: string;
  status: "waiting" | "in-progress" | "completed";
  visit_type: string;
  patient_name: string | null;
  appointment_time: string;
  meet_link: string | null;
  doctor_name: string;
}

export default function WaitingRoomPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/waiting-room/${params?.id}`);
      if (!res.ok) {
        setError("Consultation not found");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load waiting room");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-md">
          <p className="text-lg font-medium text-gray-800">{error || "Something went wrong"}</p>
          <p className="mt-2 text-sm text-gray-500">Please check your link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Doctor Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white text-2xl font-bold shadow-lg">
            DP
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{data.doctor_name}&apos;s Office</h1>
          <p className="mt-1 text-sm text-gray-500">Medical Consultation</p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center space-y-5">
          {data.patient_name && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Patient</p>
              <p className="text-lg font-semibold text-gray-800">{data.patient_name}</p>
            </div>
          )}

          <div className="flex justify-center gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Type</p>
              <p className="text-sm font-medium text-gray-700">{data.visit_type || "General"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Scheduled</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(data.appointment_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          {data.status === "waiting" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
                </span>
                <span className="text-sm font-medium text-blue-700">Waiting</span>
              </div>
              <p className="text-lg font-medium text-gray-700">Your doctor will be with you shortly...</p>
              {/* Calming animation */}
              <div className="flex items-center justify-center gap-1.5 py-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s`, animationDuration: "1.5s" }}
                  />
                ))}
              </div>
            </div>
          )}

          {data.status === "in-progress" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700">Doctor is ready!</span>
              </div>
              <p className="text-lg font-medium text-gray-700">Your consultation is starting now</p>
              {data.meet_link ? (
                <a
                  href={data.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Join Video Call
                </a>
              ) : (
                <p className="text-sm text-gray-500">The doctor will share the meeting link shortly.</p>
              )}
            </div>
          )}

          {data.status === "completed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span className="text-sm font-medium text-green-700">Consultation Complete</span>
              </div>
              <p className="text-gray-600">Thank you for your visit. Take care!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Powered by Scriva · Secure & Private
        </p>
      </div>
    </div>
  );
}
