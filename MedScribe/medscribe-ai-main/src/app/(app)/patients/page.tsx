"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/types";
import Link from "next/link";
import { Search, Plus, Upload, X, ChevronDown, Download, Edit2, Trash2, User } from "lucide-react";

interface PatientConsultation {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface PatientNote {
  id: string;
  consultation_id: string;
  status: string;
  sections: { title: string; content: string }[];
  billing_codes: { code: string; system: string; description: string }[];
  created_at: string;
}

type PatientTab = "file" | "pending" | "consultations";
type ModalMode = "add" | "csv" | null;

function ageFromDOB(dob: string): number {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function dobFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split("T")[0];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    "bg-teal-100 text-teal-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

export default function PatientsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const csvRef = useRef<HTMLInputElement>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);

  // Add patient form state
  const [newName, setNewName] = useState("");
  const [newMRN, setNewMRN] = useState("");
  const [newDOB, setNewDOB] = useState("");
  const [newAge, setNewAge] = useState(35);
  const [newGender, setNewGender] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // CSV import state
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  // Expanded patient
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [patientTab, setPatientTab] = useState<PatientTab>("file");
  const [patientConsultations, setPatientConsultations] = useState<PatientConsultation[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMRN, setEditMRN] = useState("");
  const [editDOB, setEditDOB] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const url = search ? `/api/patients?search=${encodeURIComponent(search)}` : "/api/patients";
      const res = await fetch(url);
      const json = await res.json();
      setPatients(json.data || []);
    } catch {
      toast("Failed to load patients", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  // Sync age ↔ DOB
  const handleDOBChange = (dob: string) => {
    setNewDOB(dob);
    if (dob) setNewAge(ageFromDOB(dob));
  };
  const handleAgeChange = (age: number) => {
    setNewAge(age);
    setNewDOB(dobFromAge(age));
  };

  const resetForm = () => {
    setNewName(""); setNewMRN(""); setNewDOB(""); setNewAge(35);
    setNewGender(""); setNewPhone(""); setNewEmail("");
  };

  const handleAddPatient = async () => {
    if (!newName.trim()) { toast("Full name is required", "error"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newName.trim(),
          mrn: newMRN.trim() || null,
          date_of_birth: newDOB || null,
          gender: newGender || null,
          contact_info: {
            ...(newPhone ? { phone: newPhone } : {}),
            ...(newEmail ? { email: newEmail } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast("Patient added successfully", "success");
      setModal(null);
      resetForm();
      fetchPatients();
    } catch {
      toast("Failed to add patient", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // CSV parsing
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast("CSV must have a header row and at least one data row", "error"); return; }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, "_"));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",");
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
        return row;
      }).filter((r) => r["full_name"] || r["name"]);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCSVImport = async () => {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    let success = 0;
    for (const row of csvRows) {
      try {
        await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: row["full_name"] || row["name"] || "Unknown",
            mrn: row["mrn"] || row["medical_record_number"] || null,
            date_of_birth: row["date_of_birth"] || row["dob"] || row["birth_date"] || null,
            gender: row["gender"] || row["sex"] || null,
            contact_info: {
              ...(row["phone"] ? { phone: row["phone"] } : {}),
              ...(row["email"] ? { email: row["email"] } : {}),
            },
          }),
        });
        success++;
      } catch { /* skip failed rows */ }
    }
    toast(`Imported ${success} of ${csvRows.length} patients`, "success");
    setCsvImporting(false);
    setCsvRows([]);
    setModal(null);
    fetchPatients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this patient? This cannot be undone.")) return;
    try {
      await fetch(`/api/patients/${id}`, { method: "DELETE" });
      toast("Patient deleted", "success");
      if (expandedPatientId === id) setExpandedPatientId(null);
      fetchPatients();
    } catch {
      toast("Failed to delete patient", "error");
    }
  };

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) { toast(t("patients.nameRequired"), "error"); return; }
    try {
      await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editName.trim(),
          mrn: editMRN.trim() || null,
          date_of_birth: editDOB || null,
          gender: editGender || null,
          contact_info: {
            ...(editPhone ? { phone: editPhone } : {}),
            ...(editEmail ? { email: editEmail } : {}),
          },
        }),
      });
      toast("Patient updated", "success");
      setEditingId(null);
      fetchPatients();
    } catch {
      toast("Failed to update patient", "error");
    }
  };

  const expandPatient = async (patient: Patient) => {
    if (expandedPatientId === patient.id) { setExpandedPatientId(null); return; }
    setExpandedPatientId(patient.id);
    setPatientTab("file");
    setLoadingDetails(true);
    try {
      const { data: consultations } = await supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, metadata")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });
      setPatientConsultations(consultations || []);
      if (consultations && consultations.length > 0) {
        const { data: notes } = await supabase
          .from("clinical_notes")
          .select("id, consultation_id, status, sections, billing_codes, created_at")
          .in("consultation_id", consultations.map((c) => c.id))
          .order("created_at", { ascending: false });
        setPatientNotes((notes || []) as unknown as PatientNote[]);
      } else {
        setPatientNotes([]);
      }
    } catch {
      toast("Failed to load patient details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadPatientFile = (patient: Patient) => {
    const lines: string[] = [
      `PATIENT FILE — ${patient.full_name}`, "=".repeat(50),
      `MRN: ${patient.mrn || "N/A"}`,
      `DOB: ${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "N/A"}`,
      `Gender: ${patient.gender || "N/A"}`,
      ...(patient.contact_info?.phone ? [`Phone: ${patient.contact_info.phone}`] : []),
      ...(patient.contact_info?.email ? [`Email: ${patient.contact_info.email}`] : []),
    ];
    if (patientConsultations.length > 0) {
      lines.push("", "CONSULTATIONS", "-".repeat(50));
      patientConsultations.forEach((c) => lines.push(`• ${c.visit_type} — ${c.status} — ${formatDateTime(c.created_at)}`));
    }
    if (patientNotes.length > 0) {
      lines.push("", "CLINICAL NOTES", "-".repeat(50));
      patientNotes.forEach((note) => {
        lines.push(`\n--- Note (${note.status}) — ${formatDateTime(note.created_at)} ---`);
        (note.sections || []).forEach((s) => { lines.push(`\n[${s.title}]`, s.content); });
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-${patient.full_name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingActions = patientConsultations.filter((c) => ["transcribed", "note_generated"].includes(c.status));

  return (
    <div className="flex flex-col gap-5 py-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-medical-text">Patient Database</h1>
          <p className="text-sm text-medical-muted">{patients.length} patient{patients.length !== 1 ? "s" : ""} on record</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal("csv")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => { setModal("add"); resetForm(); }}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN, or condition…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-medical-text placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60"
        />
      </div>

      {/* Patient List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-medical-muted">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Loading patients…
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <User className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">{search ? "No patients match your search" : "No patients yet — add one to get started"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <div key={patient.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                    {editingId === patient.id ? (
                      <div className="flex-1 space-y-4 py-1">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {[
                            { label: "Full Name *", value: editName, setter: setEditName, placeholder: "Full name" },
                            { label: "MRN / ID", value: editMRN, setter: setEditMRN, placeholder: "Medical record number" },
                            { label: "Phone", value: editPhone, setter: setEditPhone, placeholder: "+40 7xx xxx xxx" },
                            { label: "Email", value: editEmail, setter: setEditEmail, placeholder: "patient@email.com" },
                          ].map(({ label, value, setter, placeholder }) => (
                            <div key={label}>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                              <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60" />
                            </div>
                          ))}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Date of Birth</label>
                            <input type="date" value={editDOB} onChange={(e) => setEditDOB(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                            <select value={editGender} onChange={(e) => setEditGender(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60">
                              <option value="">Select…</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other / Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(patient.id)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition">Save</button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Avatar */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(patient.full_name)}`}>
                          {getInitials(patient.full_name)}
                        </div>

                        {/* Info */}
                        <button onClick={() => expandPatient(patient)} className="flex-1 text-left">
                          <p className="text-sm font-semibold text-medical-text">{patient.full_name}</p>
                          <p className="mt-0.5 text-xs text-medical-muted">
                            {[
                              patient.mrn && `ID: ${patient.mrn}`,
                              patient.gender,
                              patient.date_of_birth && `Age ${ageFromDOB(patient.date_of_birth.slice(0, 10))}`,
                            ].filter(Boolean).join(" · ") || "No details yet"}
                          </p>
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => expandPatient(patient)} title="Expand"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                            <ChevronDown className={`h-4 w-4 transition ${expandedPatientId === patient.id ? "rotate-180" : ""}`} />
                          </button>
                          <button onClick={() => {
                            setEditingId(patient.id);
                            setEditName(patient.full_name); setEditMRN(patient.mrn || "");
                            setEditDOB(patient.date_of_birth?.slice(0, 10) || "");
                            setEditGender(patient.gender || ""); setEditPhone(patient.contact_info?.phone || "");
                            setEditEmail(patient.contact_info?.email || "");
                          }} title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(patient.id)} title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {expandedPatientId === patient.id && !editingId && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                      {loadingDetails ? (
                        <p className="py-3 text-center text-sm text-slate-400">Loading…</p>
                      ) : (
                        <>
                          <div className="mb-3 flex gap-1">
                            {(["file", "consultations", "pending"] as const).map((tab) => (
                              <button key={tab} onClick={() => setPatientTab(tab)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                  patientTab === tab ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-100"
                                }`}>
                                {tab === "file" ? "Patient File" : tab === "consultations" ? "Consultations" : `Pending${pendingActions.length > 0 ? ` (${pendingActions.length})` : ""}`}
                              </button>
                            ))}
                            <button onClick={() => handleDownloadPatientFile(patient)} title="Download file"
                              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>

                          {patientTab === "file" && (
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                              {[
                                { label: "Full Name", value: patient.full_name },
                                { label: "MRN / ID", value: patient.mrn || "—" },
                                { label: "Date of Birth", value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-GB") : "—" },
                                { label: "Age", value: patient.date_of_birth ? `${ageFromDOB(patient.date_of_birth.slice(0, 10))} years` : "—" },
                                { label: "Gender", value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—" },
                                { label: "Phone", value: patient.contact_info?.phone || "—" },
                                { label: "Email", value: patient.contact_info?.email || "—" },
                              ].map(({ label, value }) => (
                                <div key={label} className="rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium text-slate-700 truncate">{value}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {patientTab === "consultations" && (
                            <div className="space-y-2">
                              {patientConsultations.length === 0 ? (
                                <p className="py-4 text-center text-sm text-slate-400">No consultations yet</p>
                              ) : patientConsultations.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                                  <div>
                                    <p className="text-sm font-medium text-medical-text">{c.visit_type}</p>
                                    <p className="text-xs text-medical-muted">{formatDateTime(c.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <StatusBadge status={c.status} />
                                    <Link href={`/consultation/${c.id}/note`} className="text-xs font-medium text-teal-600 hover:underline">View</Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {patientTab === "pending" && (
                            <div className="space-y-2">
                              {pendingActions.length === 0 ? (
                                <div className="py-6 text-center">
                                  <svg className="mx-auto mb-2 h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                  <p className="text-sm font-medium text-green-600">All caught up</p>
                                </div>
                              ) : pendingActions.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                  <div>
                                    <p className="text-sm font-medium text-medical-text">{c.visit_type}</p>
                                    <p className="text-xs text-amber-700">{c.status === "transcribed" ? "Transcript review needed" : "Note approval needed"}</p>
                                  </div>
                                  <Link href={`/consultation/${c.id}/note`}>
                                    <button className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200">Review</button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Patient Modal ───────────────────────────────────────────── */}
      {modal === "add" && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">New Patient</h2>
                <p className="text-xs text-slate-400">Fill in the details below</p>
              </div>
              <button onClick={() => setModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Full name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name <span className="text-red-400">*</span></label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maria Ionescu"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60"
                />
              </div>

              {/* MRN + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Patient ID / MRN</label>
                  <input
                    value={newMRN}
                    onChange={(e) => setNewMRN(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Gender</label>
                  <div className="flex gap-2">
                    {[{ val: "female", label: "♀", full: "Female" }, { val: "male", label: "♂", full: "Male" }, { val: "other", label: "⊘", full: "Other" }].map(({ val, label, full }) => (
                      <button
                        key={val}
                        type="button"
                        title={full}
                        onClick={() => setNewGender(newGender === val ? "" : val)}
                        className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${
                          newGender === val
                            ? "border-teal-400 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Age slider + DOB */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">Age</label>
                  <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-700">{newAge} yr</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={110}
                  value={newAge}
                  onChange={(e) => handleAgeChange(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>110</span>
                </div>
              </div>

              {/* DOB */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Date of Birth</label>
                <input
                  type="date"
                  value={newDOB}
                  onChange={(e) => handleDOBChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/60"
                />
                <p className="mt-1 text-[11px] text-slate-400">Adjusting DOB updates the age slider and vice versa</p>
              </div>

              {/* Contact (collapsible) */}
              <details className="group rounded-xl border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Contact details (optional)
                  <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
                    <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+40 7xx xxx xxx"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="patient@email.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                  </div>
                </div>
              </details>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAddPatient}
                disabled={isSaving || !newName.trim()}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Add Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ────────────────────────────────────────────── */}
      {modal === "csv" && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Import Patients</h2>
                <p className="text-xs text-slate-400">Upload a CSV file or connect an external database</p>
              </div>
              <button onClick={() => { setModal(null); setCsvRows([]); }} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* CSV upload */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">CSV File</p>
                <p className="mb-3 text-[11px] text-slate-400 leading-relaxed">
                  Required column: <code className="rounded bg-slate-100 px-1 py-0.5">full_name</code>. Optional: <code className="rounded bg-slate-100 px-1 py-0.5">mrn</code>, <code className="rounded bg-slate-100 px-1 py-0.5">date_of_birth</code>, <code className="rounded bg-slate-100 px-1 py-0.5">gender</code>, <code className="rounded bg-slate-100 px-1 py-0.5">phone</code>, <code className="rounded bg-slate-100 px-1 py-0.5">email</code>
                </p>
                <input ref={csvRef} type="file" accept=".csv" onChange={handleCSVFile} className="hidden" />
                <button
                  onClick={() => csvRef.current?.click()}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm text-slate-400 transition hover:border-teal-300 hover:text-teal-500 hover:bg-teal-50/30"
                >
                  <Upload className="h-5 w-5" />
                  Click to choose a CSV file
                </button>
              </div>

              {/* Preview */}
              {csvRows.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">{csvRows.length} patients found — preview:</p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                    {csvRows.slice(0, 8).map((row, i) => (
                      <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(row["full_name"] || row["name"] || "?")}`}>
                          {getInitials(row["full_name"] || row["name"] || "?")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{row["full_name"] || row["name"]}</p>
                          <p className="text-[11px] text-slate-400">{[row["mrn"], row["date_of_birth"], row["gender"]].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    ))}
                    {csvRows.length > 8 && (
                      <p className="px-4 py-2 text-xs text-slate-400">…and {csvRows.length - 8} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">or connect a database</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Database options */}
              <div className="grid grid-cols-3 gap-2">
                {["HL7 FHIR", "Epic / MyChart", "Medisoft"].map((db) => (
                  <button key={db} disabled title="Coming soon"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-3 text-[11px] text-slate-300 transition hover:border-slate-300 cursor-not-allowed">
                    <div className="h-5 w-5 rounded bg-slate-100" />
                    {db}
                    <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-300">Soon</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => { setModal(null); setCsvRows([]); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleCSVImport}
                disabled={csvRows.length === 0 || csvImporting}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-40"
              >
                {csvImporting ? "Importing…" : `Import ${csvRows.length > 0 ? csvRows.length : ""} Patients`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
