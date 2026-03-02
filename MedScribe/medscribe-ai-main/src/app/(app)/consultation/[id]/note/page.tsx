"use client";

/**
 * Clinical Note Editor Page
 *
 * Split-view interface for reviewing and editing AI-generated clinical notes.
 * - Left panel (40%): Transcript segments with speaker labels
 * - Right panel (60%): Editable note sections with auto-save and billing codes
 * - Status workflow: draft → reviewed → finalized
 * - Responsive layout: splits horizontally on mobile
 *
 * Features:
 * - Real-time content editing with debounced auto-save (2s delay)
 * - Yellow highlight for [?] placeholders indicating uncertainty
 * - Regenerate individual sections or entire note
 * - Copy to clipboard with formatting
 * - PDF export placeholder
 * - Status transitions with read-only finalized notes
 * - Billing code suggestions (ICD-10 and CPT) with accept/reject
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDuration, getStatusColor, cn } from "@/lib/utils";
import { ReferralModal } from "@/components/referral/ReferralModal";
import type {
  ClinicalNote,
  Transcript,
  TranscriptSegment,
  NoteStatus,
  NoteSection,
  BillingCode,
} from "@/types";

interface PageState {
  note: ClinicalNote | null;
  transcript: Transcript | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [pageState, setPageState] = useState<PageState>({
    note: null,
    transcript: null,
    loading: true,
    error: null,
    saving: false,
  });

  const [sections, setSections] = useState<NoteSection[]>([]);
  const [status, setStatus] = useState<NoteStatus>("draft");
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [referralOpen, setReferralOpen] = useState(false);

  // Track content changes for debounced save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setPageState((prev) => ({ ...prev, loading: true, error: null }));

        // Fetch transcript
        const { data: transcriptData, error: transcriptError } = await supabase
          .from("transcripts")
          .select("*")
          .eq("consultation_id", id)
          .single();

        if (transcriptError && transcriptError.code !== "PGRST116") {
          throw transcriptError;
        }

        // Fetch clinical note
        const { data: noteData, error: noteError } = await supabase
          .from("clinical_notes")
          .select("*")
          .eq("consultation_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (noteError && noteError.code !== "PGRST116") {
          throw noteError;
        }

        if (noteData) {
          const typedNote = noteData as ClinicalNote;
          setSections(typedNote.sections || []);
          setStatus(typedNote.status || "draft");
          setBillingCodes(typedNote.billing_codes || []);

          // Initialize content ref
          typedNote.sections?.forEach((section) => {
            contentRef.current.set(section.title, section.content);
          });

          setPageState((prev) => ({
            ...prev,
            note: typedNote,
            transcript: transcriptData as Transcript,
            loading: false,
          }));
        } else {
          setPageState((prev) => ({
            ...prev,
            transcript: transcriptData as Transcript,
            loading: false,
            error: "No clinical note found for this consultation.",
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load data";
        setPageState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, supabase]);

  // Debounced auto-save on section content changes
  const handleSectionChange = useCallback(
    (title: string, newContent: string) => {
      contentRef.current.set(title, newContent);

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new debounced save
      saveTimerRef.current = setTimeout(async () => {
        if (!pageState.note || status === "finalized") {
          return;
        }

        try {
          setPageState((prev) => ({ ...prev, saving: true }));

          // Update sections array with new content
          const updatedSections = sections.map((section) => ({
            ...section,
            content: contentRef.current.get(section.title) || section.content,
          }));

          const { error } = await supabase
            .from("clinical_notes")
            .update({
              sections: updatedSections,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pageState.note.id);

          if (error) throw error;

          // Update local state
          setSections(updatedSections);
          setPageState((prev) => ({
            ...prev,
            note: prev.note
              ? { ...prev.note, sections: updatedSections }
              : null,
            saving: false,
          }));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to save note";
          setPageState((prev) => ({
            ...prev,
            saving: false,
            error: errorMessage,
          }));
        }
      }, 2000);
    },
    [pageState.note, sections, status, supabase]
  );

  // Handle status transitions
  const handleStatusChange = async (newStatus: NoteStatus) => {
    if (!pageState.note) return;

    try {
      setPageState((prev) => ({ ...prev, saving: true }));

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "finalized") {
        updateData.finalized_at = new Date().toISOString();
        updateData.finalized_by = (
          await supabase.auth.getUser()
        ).data.user?.id;
      }

      const { error } = await supabase
        .from("clinical_notes")
        .update(updateData)
        .eq("id", pageState.note.id);

      if (error) throw error;

      setStatus(newStatus);
      setPageState((prev) => ({
        ...prev,
        note: prev.note ? { ...prev.note, status: newStatus } : null,
        saving: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update status";
      setPageState((prev) => ({
        ...prev,
        saving: false,
        error: errorMessage,
      }));
    }
  };

  // Regenerate single section
  const handleRegenerateSection = useCallback(
    async (title: string) => {
      if (!pageState.note || !pageState.transcript) return;

      try {
        setPageState((prev) => ({ ...prev, saving: true }));

        // Call regenerate API endpoint
        const response = await fetch("/api/notes/regenerate-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: id,
            noteId: pageState.note.id,
            sectionTitle: title,
            transcript: pageState.transcript,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to regenerate section");
        }

        const { content } = await response.json();

        // Update section content
        const updatedSections = sections.map((section) =>
          section.title === title ? { ...section, content } : section
        );

        setSections(updatedSections);
        contentRef.current.set(title, content);

        const { error } = await supabase
          .from("clinical_notes")
          .update({
            sections: updatedSections,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pageState.note.id);

        if (error) throw error;

        setPageState((prev) => ({
          ...prev,
          note: prev.note
            ? { ...prev.note, sections: updatedSections }
            : null,
          saving: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to regenerate section";
        setPageState((prev) => ({
          ...prev,
          saving: false,
          error: errorMessage,
        }));
      }
    },
    [id, pageState.note, pageState.transcript, sections, supabase]
  );

  // Regenerate entire note
  const handleRegenerateAll = useCallback(async () => {
    if (!pageState.note || !pageState.transcript) return;

    try {
      setPageState((prev) => ({ ...prev, saving: true }));

      const response = await fetch("/api/notes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: id,
          noteId: pageState.note.id,
          transcript: pageState.transcript,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate note");
      }

      const { sections: newSections, billingCodes: newBillingCodes } =
        await response.json();

      setSections(newSections || []);
      setBillingCodes(newBillingCodes || []);

      // Update content ref
      newSections?.forEach((section: NoteSection) => {
        contentRef.current.set(section.title, section.content);
      });

      const { error } = await supabase
        .from("clinical_notes")
        .update({
          sections: newSections,
          billing_codes: newBillingCodes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageState.note.id);

      if (error) throw error;

      setPageState((prev) => ({
        ...prev,
        note: prev.note
          ? {
              ...prev.note,
              sections: newSections,
              billing_codes: newBillingCodes,
            }
          : null,
        saving: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to regenerate note";
      setPageState((prev) => ({
        ...prev,
        saving: false,
        error: errorMessage,
      }));
    }
  }, [id, pageState.note, pageState.transcript, supabase]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(() => {
    try {
      const formattedText = sections
        .map((section) => `${section.title}\n${section.content}`)
        .join("\n\n");

      navigator.clipboard.writeText(formattedText);
      alert("Clinical note copied to clipboard");
    } catch (err) {
      alert("Failed to copy to clipboard");
    }
  }, [sections]);

  const escapeHtml = useCallback((str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }, []);

  const handleExportPDF = useCallback(() => {
    if (sections.length === 0) return;

    const patientName = escapeHtml(
      String((pageState.note?.generation_metadata as Record<string, unknown>)?.patient_name || "Patient")
    );
    const visitType = escapeHtml(
      String((pageState.note?.generation_metadata as Record<string, unknown>)?.visit_type || "")
    );
    const template = escapeHtml(
      String((pageState.note?.generation_metadata as Record<string, unknown>)?.template || "Clinical Note")
    );
    const createdAt = pageState.note?.created_at
      ? new Date(pageState.note.created_at).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : new Date().toLocaleDateString();

    const sectionsHtml = sections
      .map(
        (s) =>
          `<div class="section"><h2>${escapeHtml(s.title)}</h2><p>${escapeHtml(s.content).replace(/\n/g, "<br/>").replace(/\[\?\]/g, '<mark style="background:#fef08a;padding:0 2px">[?]</mark>')}</p></div>`
      )
      .join("");

    const acceptedCodes = billingCodes.filter((c) => c.accepted);
    const billingHtml =
      acceptedCodes.length > 0
        ? `<div class="section"><h2>Billing Codes</h2><table><tr><th>Code</th><th>System</th><th>Description</th></tr>${acceptedCodes
            .map(
              (c) =>
                `<tr><td><strong>${escapeHtml(c.code)}</strong></td><td>${escapeHtml(c.system)}</td><td>${escapeHtml(c.description)}</td></tr>`
            )
            .join("")}</table></div>`
        : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${template} - ${patientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 14px; line-height: 1.6; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1e40af; margin-bottom: 4px; }
  .header .meta { color: #6b7280; font-size: 13px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 15px; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .section p { white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <h1>${template}</h1>
    <div class="meta">Patient: ${patientName} &nbsp;|&nbsp; Visit: ${visitType} &nbsp;|&nbsp; Date: ${createdAt} &nbsp;|&nbsp; Status: ${status}</div>
  </div>
  ${sectionsHtml}
  ${billingHtml}
  <div class="footer">Generated by MedScribe AI &mdash; ${createdAt}</div>
</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Wait for content to render, then trigger print dialog
      printWindow.onload = () => printWindow.print();
      // Fallback for browsers where onload doesn't fire reliably
      setTimeout(() => printWindow.print(), 500);
    }
  }, [sections, billingCodes, pageState.note, status, escapeHtml]);

  // Handle billing code acceptance/rejection
  const handleBillingCodeToggle = useCallback(
    async (codeIndex: number, accepted: boolean) => {
      if (!pageState.note) return;

      try {
        const updatedCodes = billingCodes.map((code, idx) =>
          idx === codeIndex ? { ...code, accepted } : code
        );

        setBillingCodes(updatedCodes);

        const { error } = await supabase
          .from("clinical_notes")
          .update({
            billing_codes: updatedCodes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pageState.note.id);

        if (error) throw error;

        setPageState((prev) => ({
          ...prev,
          note: prev.note
            ? { ...prev.note, billing_codes: updatedCodes }
            : null,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update billing code";
        setPageState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    },
    [pageState.note, billingCodes, supabase]
  );

  // Render highlighted text with [?] markers
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(\[\?\])/);
    return parts.map((part, idx) =>
      part === "[?]" ? (
        <mark
          key={idx}
          className="bg-yellow-200 font-medium text-yellow-900"
        >
          {part}
        </mark>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  if (pageState.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600"></div>
          <p className="text-medical-muted">Loading clinical note...</p>
        </div>
      </div>
    );
  }

  const isFinalized = status === "finalized";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-medical-border bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-medical-text">
            Clinical Note
          </h1>
          <StatusBadge status={status} />
          {pageState.saving && (
            <span className="text-xs text-medical-muted">Saving...</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateAll}
            disabled={isFinalized || pageState.saving}
            title="Regenerate all sections from transcript"
          >
            Regenerate All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            disabled={sections.length === 0}
            title="Copy all sections as formatted text"
          >
            Copy to Clipboard
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            title="Export note as PDF"
          >
            Export PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert("Link copied to clipboard. Share it with colleagues who have access to this consultation.");
            }}
            title="Share this note"
          >
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReferralOpen(true)}
            title="Refer to specialist or clinic by email"
          >
            Refer
          </Button>

          {status === "draft" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange("reviewed")}
              disabled={pageState.saving}
            >
              Mark as Reviewed
            </Button>
          )}

          {status === "reviewed" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange("finalized")}
              disabled={pageState.saving}
            >
              Finalize
            </Button>
          )}

          {isFinalized && (
            <span className="inline-flex items-center rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {pageState.error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {pageState.error}
        </div>
      )}

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Transcript (40% on desktop, stacked on mobile) */}
        <div className="hidden w-2/5 flex-col overflow-y-auto border-r border-medical-border bg-gray-50 md:flex">
          {/* Transcript Header */}
          <div className="sticky top-0 border-b border-medical-border bg-white px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-medical-muted">
              Transcript
            </h2>
            {pageState.transcript?.segments && (
              <p className="mt-2 text-xs text-medical-muted">
                Duration:{" "}
                {formatDuration(
                  Math.max(
                    ...pageState.transcript.segments.map((s) => s.end_time || 0)
                  )
                )}
              </p>
            )}
          </div>

          {/* Transcript Segments */}
          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {pageState.transcript?.segments && pageState.transcript.segments.length > 0 ? (
              pageState.transcript.segments.map((segment: TranscriptSegment, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg border border-medical-border bg-white p-4 text-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                        segment.speaker === "doctor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {segment.speaker === "doctor" ? "Doctor" : "Patient"}
                    </span>
                    {segment.confidence && (
                      <span className="text-xs text-medical-muted">
                        {Math.round(segment.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed text-medical-text">
                    {segment.text}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-white p-4 text-center text-sm text-medical-muted">
                No transcript available
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Note Editor (60% on desktop, full width on mobile) */}
        <div className="w-full flex-1 overflow-y-auto p-6 md:w-3/5">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Note Sections */}
            {sections && sections.length > 0 ? (
              sections.map((section, idx) => (
                <Card key={idx}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{section.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerateSection(section.title)}
                      disabled={isFinalized || pageState.saving}
                      className="text-xs"
                    >
                      Regenerate section
                    </Button>
                  </CardHeader>

                  <CardContent>
                    {isFinalized ? (
                      <div className="prose prose-sm max-w-none text-medical-text">
                        {renderHighlightedText(
                          contentRef.current.get(section.title) ||
                            section.content
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={
                          contentRef.current.get(section.title) ||
                          section.content
                        }
                        onChange={(e) =>
                          handleSectionChange(section.title, e.target.value)
                        }
                        className="min-h-[150px] w-full resize-none rounded-lg border border-medical-border bg-white p-3 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder={`Enter ${section.title} content...`}
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-medical-muted">
                    No sections available. Please generate a note first.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Billing Codes Section */}
            <Card>
              <CardHeader>
                <CardTitle>Suggested Billing Codes</CardTitle>
              </CardHeader>

              <CardContent>
                {billingCodes && billingCodes.length > 0 ? (
                  <div className="space-y-4">
                    {/* ICD-10 Codes */}
                    {billingCodes
                      .filter((code) => code.system === "ICD-10")
                      .map((code, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-2 rounded-lg border border-medical-border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-medical-text">
                                {code.code}
                              </span>
                              <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                {code.system}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-medical-text">
                              {code.description}
                            </p>
                            {code.rationale && (
                              <p className="mt-1 text-xs text-medical-muted italic">
                                {code.rationale}
                              </p>
                            )}
                            {/* Confidence Bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    code.confidence >= 0.8
                                      ? "bg-green-500"
                                      : code.confidence >= 0.6
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  )}
                                  style={{
                                    width: `${code.confidence * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-medical-muted">
                                {Math.round(code.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          {!isFinalized && (
                            <div className="flex gap-2 sm:ml-4">
                              <Button
                                variant={code.accepted ? "primary" : "outline"}
                                size="sm"
                                onClick={() =>
                                  handleBillingCodeToggle(
                                    billingCodes.indexOf(code),
                                    true
                                  )
                                }
                                disabled={pageState.saving}
                              >
                                Accept
                              </Button>
                              <Button
                                variant={!code.accepted ? "danger" : "outline"}
                                size="sm"
                                onClick={() =>
                                  handleBillingCodeToggle(
                                    billingCodes.indexOf(code),
                                    false
                                  )
                                }
                                disabled={pageState.saving}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* CPT Codes */}
                    {billingCodes.filter((code) => code.system === "CPT")
                      .length > 0 && (
                      <div className="mt-4 border-t border-medical-border pt-4">
                        <h4 className="mb-3 text-sm font-semibold text-medical-text">
                          CPT Codes
                        </h4>
                        <div className="space-y-3">
                          {billingCodes
                            .filter((code) => code.system === "CPT")
                            .map((code, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col gap-2 rounded-lg border border-medical-border p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold text-medical-text">
                                      {code.code}
                                    </span>
                                    <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                                      {code.system}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-medical-text">
                                    {code.description}
                                  </p>
                                  {code.rationale && (
                                    <p className="mt-1 text-xs text-medical-muted italic">
                                      {code.rationale}
                                    </p>
                                  )}
                                  {/* Confidence Bar */}
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          code.confidence >= 0.8
                                            ? "bg-green-500"
                                            : code.confidence >= 0.6
                                              ? "bg-amber-500"
                                              : "bg-red-500"
                                        )}
                                        style={{
                                          width: `${code.confidence * 100}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-medical-muted">
                                      {Math.round(code.confidence * 100)}%
                                    </span>
                                  </div>
                                </div>

                                {!isFinalized && (
                                  <div className="flex gap-2 sm:ml-4">
                                    <Button
                                      variant={
                                        code.accepted ? "primary" : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleBillingCodeToggle(
                                          billingCodes.indexOf(code),
                                          true
                                        )
                                      }
                                      disabled={pageState.saving}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      variant={
                                        !code.accepted ? "danger" : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleBillingCodeToggle(
                                          billingCodes.indexOf(code),
                                          false
                                        )
                                      }
                                      disabled={pageState.saving}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-medical-muted">
                    No billing codes suggested yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ReferralModal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        documentTitle={String((pageState.note?.generation_metadata as Record<string, unknown>)?.template || "Clinical Note")}
        documentContent={sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}
        documentType="Clinical Note"
        patientName={String((pageState.note?.generation_metadata as Record<string, unknown>)?.patient_name || "")}
      />
    </div>
  );
}
