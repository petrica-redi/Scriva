"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SPECIALTIES = [
  "Psychiatry", "Psychology", "Clinical Psychology", "Psychotherapy", "Counseling",
  "Art Therapy", "Music Therapy", "Behavioral Therapy",
  "General Practice", "Internal Medicine", "Family Medicine",
  "Cardiology", "Neurology", "Dermatology", "Pediatrics",
  "Orthopedics", "Ophthalmology", "ENT", "Oncology",
  "Gastroenterology", "Endocrinology", "Pulmonology",
  "Obstetrics & Gynecology", "Urology", "Surgery",
  "Radiology", "Rheumatology", "Geriatrics",
  "Pain Management", "Sleep Medicine",
  "Occupational Therapy", "Speech & Language Therapy",
  "Physical Medicine & Rehabilitation",
  "Acupuncture", "Chiropractic", "Homeopathy", "Naturopathy", "Osteopathy",
  "Nutrition & Dietetics", "Dentistry", "Orthodontics",
];

interface Clinic {
  id: string;
  name: string;
  email?: string | null;
  city?: string;
  country?: string;
}

interface Physician {
  id: string;
  name: string;
  email?: string | null;
  specialty?: string;
}

export interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  documentType?: string;
  patientName?: string;
  onSuccess?: () => void;
}

export function ReferralModal({
  open,
  onClose,
  documentTitle,
  documentContent,
  documentType = "Clinical Note",
  patientName,
  onSuccess,
}: ReferralModalProps) {
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [physician, setPhysician] = useState<Physician | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSpecialty("");
    setClinic(null);
    setPhysician(null);
    setClinics([]);
    setPhysicians([]);
    setRecipientEmail("");
    setError(null);
    setSuccess(false);
  }, [open]);

  useEffect(() => {
    if (!specialty) {
      setClinics([]);
      setPhysicians([]);
      setClinic(null);
      setPhysician(null);
      setRecipientEmail("");
      return;
    }
    setOptionsLoading(true);
    fetch(`/api/referral/options?specialty=${encodeURIComponent(specialty)}`)
      .then((r) => r.json())
      .then((data) => {
        setClinics(data.clinics || []);
        setPhysicians(data.physicians || []);
        setClinic(null);
        setPhysician(null);
        setRecipientEmail("");
      })
      .catch(() => {
        setClinics([]);
        setPhysicians([]);
      })
      .finally(() => setOptionsLoading(false));
  }, [specialty]);

  useEffect(() => {
    if (!specialty) return;
    setOptionsLoading(true);
    const url = clinic
      ? `/api/referral/options?specialty=${encodeURIComponent(specialty)}&clinicId=${clinic.id}`
      : `/api/referral/options?specialty=${encodeURIComponent(specialty)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setPhysicians(data.physicians || []);
        if (clinic) {
          setPhysician(null);
          setRecipientEmail(clinic.email || "");
        } else {
          setPhysician(null);
          setRecipientEmail("");
        }
      })
      .finally(() => setOptionsLoading(false));
  }, [specialty, clinic]);

  useEffect(() => {
    if (physician?.email) setRecipientEmail(physician.email);
  }, [physician]);

  const handleSend = async () => {
    const email = recipientEmail?.trim();
    if (!email) {
      setError("Please enter a recipient email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referral/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          documentTitle,
          documentContent,
          documentType,
          patientName,
          specialty: specialty || undefined,
          clinicName: clinic?.name,
          physicianName: physician?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send referral");
      }
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Refer Document</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-medical-muted">
            Send this document to a specialist or clinic by email. Choose the specialty and clinic, then enter the recipient email.
          </p>

          <div>
            <label className="block text-sm font-medium text-medical-text mb-1">
              1. Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select specialty</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-medical-text mb-1">
              2. Clinic
            </label>
            <select
              value={clinic?.id ?? ""}
              onChange={(e) => {
                const c = clinics.find((x) => x.id === e.target.value);
                setClinic(c || null);
              }}
              disabled={!specialty || optionsLoading}
              className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            >
              <option value="">Select clinic</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.city ? `— ${c.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          {clinic && physicians.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-medical-text mb-1">
                Physician at clinic (optional)
              </label>
              <select
                value={physician?.id ?? ""}
                onChange={(e) => {
                  const p = physicians.find((x) => x.id === e.target.value);
                  setPhysician(p || null);
                }}
                className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select physician (optional)</option>
                {physicians.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-medical-text mb-1">
              3. Recipient email
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="specialist@clinic.com"
              className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {clinic?.email && (
              <p className="mt-1 text-xs text-medical-muted">
                Pre-filled from clinic. You can change it.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Referral sent successfully.
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={loading || !recipientEmail?.trim()}
              className="flex-1"
            >
              {loading ? "Sending…" : "Send by Email"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
