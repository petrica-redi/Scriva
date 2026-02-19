"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/types";
import Link from "next/link";

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

export default function PatientsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // New patient form
  const [newName, setNewName] = useState("");
  const [newMRN, setNewMRN] = useState("");
  const [newDOB, setNewDOB] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMRN, setEditMRN] = useState("");

  // Expanded patient view
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [patientTab, setPatientTab] = useState<PatientTab>("file");
  const [patientConsultations, setPatientConsultations] = useState<PatientConsultation[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const handleAddPatient = async () => {
    if (!newName.trim()) { toast("Patient name is required", "error"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newName,
          mrn: newMRN || null,
          date_of_birth: newDOB || null,
          gender: newGender || null,
          contact_info: {
            ...(newPhone ? { phone: newPhone } : {}),
            ...(newEmail ? { email: newEmail } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to create patient");
      toast("Patient added successfully", "success");
      setShowAddForm(false);
      setNewName(""); setNewMRN(""); setNewDOB(""); setNewGender(""); setNewPhone(""); setNewEmail("");
      fetchPatients();
    } catch {
      toast("Failed to add patient", "error");
    } finally {
      setIsSaving(false);
    }
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
    try {
      await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, mrn: editMRN }),
      });
      toast("Patient updated", "success");
      setEditingId(null);
      fetchPatients();
    } catch {
      toast("Failed to update patient", "error");
    }
  };

  const expandPatient = async (patient: Patient) => {
    if (expandedPatientId === patient.id) {
      setExpandedPatientId(null);
      return;
    }
    setExpandedPatientId(patient.id);
    setPatientTab("file");
    setLoadingDetails(true);
    try {
      // Fetch consultations for this patient
      const { data: consultations } = await supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, metadata")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });
      setPatientConsultations(consultations || []);

      // Fetch clinical notes for this patient's consultations
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
    const sections: string[] = [];
    sections.push(`PATIENT FILE — ${patient.full_name}`);
    sections.push("=".repeat(50));
    sections.push(`MRN: ${patient.mrn || "N/A"}`);
    sections.push(`Date of Birth: ${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "N/A"}`);
    sections.push(`Gender: ${patient.gender || "N/A"}`);
    if (patient.contact_info?.phone) sections.push(`Phone: ${patient.contact_info.phone}`);
    if (patient.contact_info?.email) sections.push(`Email: ${patient.contact_info.email}`);
    sections.push("");

    if (patientConsultations.length > 0) {
      sections.push("CONSULTATIONS");
      sections.push("-".repeat(50));
      patientConsultations.forEach((c) => {
        sections.push(`• ${c.visit_type} — ${c.status} — ${formatDateTime(c.created_at)}`);
      });
      sections.push("");
    }

    if (patientNotes.length > 0) {
      sections.push("CLINICAL NOTES");
      sections.push("-".repeat(50));
      patientNotes.forEach((note) => {
        sections.push(`\n--- Note (${note.status}) — ${formatDateTime(note.created_at)} ---`);
        (note.sections || []).forEach((s) => {
          sections.push(`\n[${s.title}]`);
          sections.push(s.content);
        });
        if (note.billing_codes?.length > 0) {
          sections.push("\nBilling Codes:");
          note.billing_codes.forEach((bc) => {
            sections.push(`  ${bc.system}: ${bc.code} — ${bc.description}`);
          });
        }
      });
    }

    const blob = new Blob([sections.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-${patient.full_name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingActions = patientConsultations.filter((c) => ["transcribed", "note_generated"].includes(c.status));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-medical-text">Patient Database</h1>
          <p className="text-sm text-medical-muted mt-1">Manage patient records, files, and pending actions</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "Add Patient"}
        </Button>
      </div>

      {/* Add Patient Form */}
      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>New Patient</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input id="new-name" label="Full Name *" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Patient full name" />
              <Input id="new-mrn" label="MRN" value={newMRN} onChange={(e) => setNewMRN(e.target.value)} placeholder="Medical Record Number" />
              <Input id="new-dob" label="Date of Birth" type="date" value={newDOB} onChange={(e) => setNewDOB(e.target.value)} />
              <div>
                <label htmlFor="new-gender" className="block text-sm font-medium text-medical-text mb-1.5">Gender</label>
                <select id="new-gender" value={newGender} onChange={(e) => setNewGender(e.target.value)} className="block w-full rounded-lg border border-medical-border px-4 py-2.5 text-sm text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input id="new-phone" label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              <Input id="new-email" label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="patient@email.com" />
            </div>
            <Button onClick={handleAddPatient} disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Patient"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients by name or MRN..."
          className="w-full rounded-lg border border-medical-border bg-white px-4 py-2.5 pl-10 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medical-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>

      {/* Patient List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-medical-muted">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-medical-muted">
              {search ? "No patients found matching your search." : "No patients yet. Add your first patient above."}
            </div>
          ) : (
            <div className="divide-y divide-medical-border">
              {patients.map((patient) => (
                <div key={patient.id}>
                  <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
                    {editingId === patient.id ? (
                      <div className="flex flex-1 items-center gap-3">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded border border-medical-border px-3 py-1.5 text-sm" />
                        <input value={editMRN} onChange={(e) => setEditMRN(e.target.value)} placeholder="MRN" className="rounded border border-medical-border px-3 py-1.5 text-sm w-32" />
                        <Button size="sm" onClick={() => handleEditSave(patient.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => expandPatient(patient)} className="flex-1 text-left">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                              {patient.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-medical-text">{patient.full_name}</p>
                              <p className="text-xs text-medical-muted mt-0.5">
                                {[
                                  patient.mrn && `MRN: ${patient.mrn}`,
                                  patient.gender,
                                  patient.date_of_birth && `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}`,
                                ].filter(Boolean).join(" · ") || "No details"}
                              </p>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => expandPatient(patient)}>
                            <svg className={`h-4 w-4 transition ${expandedPatientId === patient.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(patient.id); setEditName(patient.full_name); setEditMRN(patient.mrn || ""); }}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(patient.id)} className="text-red-600 hover:text-red-700">
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expanded Patient Detail */}
                  {expandedPatientId === patient.id && (
                    <div className="border-t border-medical-border bg-gray-50 px-6 py-4">
                      {loadingDetails ? (
                        <div className="text-center py-4 text-medical-muted text-sm">Loading patient details...</div>
                      ) : (
                        <>
                          {/* Tabs */}
                          <div className="flex gap-1 mb-4 border-b border-medical-border">
                            {([
                              { key: "file" as const, label: "Patient File" },
                              { key: "consultations" as const, label: "Consultations" },
                              { key: "pending" as const, label: `Pending Actions${pendingActions.length > 0 ? ` (${pendingActions.length})` : ""}` },
                            ]).map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => setPatientTab(tab.key)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                                  patientTab === tab.key
                                    ? "border-brand-500 text-brand-600"
                                    : "border-transparent text-medical-muted hover:text-medical-text"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Patient File Tab */}
                          {patientTab === "file" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-medical-muted">Full Name</p><p className="font-medium text-medical-text">{patient.full_name}</p></div>
                                <div><p className="text-medical-muted">MRN</p><p className="font-medium text-medical-text">{patient.mrn || "—"}</p></div>
                                <div><p className="text-medical-muted">Date of Birth</p><p className="font-medium text-medical-text">{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"}</p></div>
                                <div><p className="text-medical-muted">Gender</p><p className="font-medium text-medical-text capitalize">{patient.gender || "—"}</p></div>
                                <div><p className="text-medical-muted">Phone</p><p className="font-medium text-medical-text">{patient.contact_info?.phone || "—"}</p></div>
                                <div><p className="text-medical-muted">Email</p><p className="font-medium text-medical-text">{patient.contact_info?.email || "—"}</p></div>
                              </div>

                              {/* Clinical Notes Summary */}
                              {patientNotes.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-medical-text mb-2">Medical Notes & Diagnoses</h4>
                                  <div className="space-y-2">
                                    {patientNotes.slice(0, 3).map((note) => (
                                      <div key={note.id} className="rounded-lg bg-white border border-medical-border p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <StatusBadge status={note.status} />
                                          <span className="text-xs text-medical-muted">{formatDateTime(note.created_at)}</span>
                                        </div>
                                        <div className="text-xs text-medical-muted space-y-0.5">
                                          {(note.sections || []).slice(0, 2).map((s, i) => (
                                            <p key={i}><span className="font-medium">{s.title}:</span> {s.content.substring(0, 100)}...</p>
                                          ))}
                                        </div>
                                        {note.billing_codes?.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {note.billing_codes.slice(0, 3).map((bc, i) => (
                                              <span key={i} className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                                {bc.system}: {bc.code}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <Link href={`/consultation/${note.consultation_id}/note`} className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                                          View Full Note
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Download */}
                              <Button size="sm" variant="outline" onClick={() => handleDownloadPatientFile(patient)}>
                                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                Download Patient File
                              </Button>
                            </div>
                          )}

                          {/* Consultations Tab */}
                          {patientTab === "consultations" && (
                            <div className="space-y-2">
                              {patientConsultations.length === 0 ? (
                                <p className="text-sm text-medical-muted py-4">No consultations for this patient.</p>
                              ) : (
                                patientConsultations.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-white border border-medical-border p-3">
                                    <div>
                                      <p className="text-sm font-medium text-medical-text">{c.visit_type}</p>
                                      <p className="text-xs text-medical-muted">{formatDateTime(c.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <StatusBadge status={c.status} />
                                      <Link href={`/consultation/${c.id}/note`} className="text-xs text-brand-600 hover:underline">View</Link>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Pending Actions Tab */}
                          {patientTab === "pending" && (
                            <div className="space-y-2">
                              {pendingActions.length === 0 ? (
                                <div className="text-center py-6">
                                  <div className="flex justify-center mb-2">
                                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                  </div>
                                  <p className="text-sm text-green-600 font-medium">No pending actions</p>
                                  <p className="text-xs text-medical-muted mt-0.5">All tasks for this patient are up to date.</p>
                                </div>
                              ) : (
                                pendingActions.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 p-3">
                                    <div>
                                      <p className="text-sm font-medium text-medical-text">{c.visit_type}</p>
                                      <p className="text-xs text-amber-700">
                                        {c.status === "transcribed" ? "Transcript needs review" : "Generated note needs review and finalization"}
                                      </p>
                                      <p className="text-xs text-medical-muted">{formatDateTime(c.created_at)}</p>
                                    </div>
                                    <Link href={`/consultation/${c.id}/note`}>
                                      <Button size="sm" variant="outline">Review</Button>
                                    </Link>
                                  </div>
                                ))
                              )}
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
    </div>
  );
}
