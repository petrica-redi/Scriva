# Audit: Feature interconnection (IT programmer view)

**Scope:** MedScribe AI — which features are wired end-to-end vs. siloed (APIs or UI exist but are not connected to the rest of the flow).

**Date:** March 2026

---

## 1. Summary: what is NOT interconnected

| Area | Issue | Severity |
|------|--------|----------|
| **DSM-5 Criteria Tracker** | API `POST /api/ai/evaluate-criteria` exists; no UI calls it. Record page has no “Criteria Tracker” panel. | High |
| **Clinical Decision Support (CDS)** | Component `ClinicalDecisionSupport` and API `/api/ai/clinical-decision-support` exist; component is **never rendered** in any route. Record/note/prescription do not show CDS alerts. | High |
| **Pre-visit brief** | Component `PreVisitBrief` and API `/api/ai/pre-visit-brief` exist; **no page** imports or renders `PreVisitBrief` (e.g. not on New Consultation or patient detail). | Medium |
| **Visit summaries** | API `/api/visit-summaries` (GET/POST) and table `visit_summaries` exist; **no frontend** calls this API. Patient-friendly summaries are not generated or shown from notes. | Medium |
| **Follow-ups from workflow** | Follow-ups are created only manually in Follow-Up Management. No auto-creation when: saving a prescription (e.g. “SSRI review in 2 weeks”), finalizing a note, or completing a consultation. | Medium |
| **Standalone AI Assistant ↔ consultation** | AI Assistant (page) does not link to active consultation or record. Record page uses a different panel (`AIAssistantPanel` → analyze-consultation), not the global AI Assistant. No “open in AI Assistant” from record/note. | Low |
| **Prescription ↔ diagnosis from note** | Prescription page loads diagnosis from consultation metadata (and existing billing); it does **not** receive the current note or transcript, so no “suggest meds from this note” flow. | Low |
| **Analytics ↔ screening scores** | Analytics has placeholders for PHQ-9/GAD-7/BDI; no stored screening scores per consultation and no longitudinal tracking. | Low |

---

## 2. Feature-by-feature detail

### 2.1 Consultation record flow (core)

| Step | What exists | Interconnection |
|------|-------------|-----------------|
| New consultation | `consultation/new` creates consultation; no Pre-visit brief shown. | **Gap:** PreVisitBrief not used. |
| Record | `consultation/[id]/record`: Deepgram streaming, transcript, `AIAssistantPanel` (calls `analyze-consultation`). | **Gap:** No CDS panel; no DSM-5 Criteria Tracker (evaluate-criteria not called). |
| Generate note | Record page calls `POST /api/generate-note` with transcript + template; note saved to DB. | OK: consultation → note. |
| Note editor | `consultation/[id]/note`: loads transcript + note, edit, billing, status. | **Gap:** No CDS, no suggested follow-up from note. |
| Prescription | `consultation/[id]/prescription`: loads consultation metadata (diagnosis_code, etc.), `SmartPrescriptionPanel` (treatment-pathway, medications, dose-equivalence). | **Gap:** No transcript/note passed; no “suggest follow-up” after save. |
| Follow-ups | Dedicated page + `FollowUpManager`; API list/create/patch. | **Gap:** Follow-ups only manual; not created from prescription/note/consultation. |

**Conclusion:** Record and note are the backbone; CDS, evaluate-criteria, Pre-visit brief, and follow-up-from-workflow are not wired in.

---

### 2.2 AI / clinical intelligence

| Capability | Backend | Frontend usage |
|------------|---------|----------------|
| **Analyze consultation** | `POST /api/ai/analyze-consultation` | Used by `AIAssistantPanel` on record page. |
| **Clinical decision support** | `POST /api/ai/clinical-decision-support` | Exposed in `services/api.ts` as `cdsApi`; **ClinicalDecisionSupport** component is never imported in any page. |
| **Evaluate DSM-5 criteria** | `POST /api/ai/evaluate-criteria` | Not called from any component. |
| **AI Ask (Assistant)** | `POST /api/ai/ask` | Used by standalone AI Assistant page only. |
| **Pre-visit brief** | `GET /api/ai/pre-visit-brief?patient_id=...` | Used only inside `PreVisitBrief` component; **PreVisitBrief is not rendered anywhere**. |
| **Patient analysis** | `POST /api/ai/patient-analysis` | Need to confirm; likely used from one specific flow. |
| **Visit summaries** | `GET/POST /api/visit-summaries` | No UI calls it. |

**Conclusion:** CDS, evaluate-criteria, pre-visit brief, and visit-summaries are implemented on the backend (and some have components) but are **not interconnected** with the main consultation/record/note/prescription flow.

---

### 2.3 Prescription and smart prescription

| Item | Status |
|------|--------|
| Prescription page | Loads consultation metadata (patient name, diagnosis_code, existing prescriptions from metadata). |
| SmartPrescriptionPanel | Uses treatment-pathway, medications, dose-equivalence APIs; diagnosis passed in. |
| **Gaps** | (1) No prefill of medications from note/transcript. (2) No “suggest follow-up” (e.g. SSRI 2 weeks, lithium levels) after save. (3) CDS (interactions) not shown on this page. |

---

### 2.4 Follow-ups

| Item | Status |
|------|--------|
| Follow-up list/create/patch | API and FollowUpManager work; used on `/follow-ups` page. |
| Dashboard / Analytics | Dashboard uses consultations; analytics uses follow_ups for “needs attention” and links to `/follow-ups`. |
| **Gaps** | No automatic creation of follow-ups when: completing a consultation, finalizing a note, or saving a prescription. No “medication-based” rules (e.g. SSRI → 2 weeks) in the UI or backend. |

---

### 2.5 Dashboard and analytics

| Item | Status |
|------|--------|
| Dashboard | Server component; consultations (today, pending, finalized), priority queue, patients at risk, today schedule, recent consultations. |
| Analytics | Client; consultations, notes, filters, drill-downs, advanced analytics API (follow_up_stats, etc.). |
| **Interconnection** | Both use consultations and notes; analytics uses follow_ups. No screening scores (PHQ-9/GAD-7) stored per consultation, so no longitudinal score tracking. |

---

### 2.6 Patient and templates

| Item | Status |
|------|--------|
| Patient list/detail | Patients page; detail page shows consultations, transcripts, notes. |
| Templates | Templates page and edit; used by generate-note. |
| **Gaps** | Patient detail does not show PreVisitBrief; no “start consultation with brief” from patient. |

---

## 3. Recommended wiring (priority)

1. **Record page**
   - Add **ClinicalDecisionSupport** (or equivalent) so CDS is called with current transcript/medications and alerts are shown during recording/post.
   - Add **DSM-5 Criteria Tracker**: call `POST /api/ai/evaluate-criteria` with transcript + selected diagnosis; show progress (e.g. 3/6 GAD) and suggested questions.

2. **New consultation / patient context**
   - Render **PreVisitBrief** when a patient is selected (e.g. on New Consultation or patient detail) so the pre-visit brief is visible before starting the record.

3. **Visit summaries**
   - After note finalization (or from note page), call `POST /api/visit-summaries` with consultation_id, patient_id, and note sections; optionally show or send patient-friendly summary.

4. **Follow-ups from workflow**
   - On prescription save (or from a “Suggest follow-up” action): suggest a follow-up based on medication (e.g. SSRI → 2 weeks) and allow one-click create.
   - Optionally: when finalizing a note, offer to create a follow-up from extracted plan (or from visit_summaries.follow_up_date if that is populated).

5. **Prescription page**
   - Optionally surface CDS (e.g. drug interactions) in the prescription flow.
   - Optionally prefill or suggest medications from the consultation note (e.g. via AI extraction or structured plan).

6. **AI Assistant**
   - Optional: link from record or note to “Ask in AI Assistant” with pre-filled context (e.g. transcript excerpt or note summary) so the same AI Ask is used with consultation context.

---

## 4. Files reference (for implementers)

| Feature | Backend / shared | Frontend (current usage) |
|---------|-------------------|---------------------------|
| CDS | `api/ai/clinical-decision-support/route.ts` | `components/features/ClinicalDecisionSupport.tsx` — **not used in any page** |
| Evaluate criteria | `api/ai/evaluate-criteria/route.ts`, `lib/dsm5-criteria/` | No component calls it |
| Pre-visit brief | `api/ai/pre-visit-brief/route.ts` | `components/features/PreVisitBrief.tsx` — **not used in any page** |
| Visit summaries | `api/visit-summaries/route.ts` | No UI calls |
| Analyze consultation | `api/ai/analyze-consultation/route.ts` | `components/consultation/AIAssistantPanel.tsx` (record page) |
| Follow-ups | `api/follow-ups/route.ts` | `components/features/FollowUpManager.tsx` (follow-ups page); no auto-create from prescription/note |
| Smart prescription | `api/smart-prescription/*` | `SmartPrescriptionPanel` on prescription page |

---

*Audit performed by static analysis of routes, components, and API call sites. Recommendations are implementation priorities, not spec.*
