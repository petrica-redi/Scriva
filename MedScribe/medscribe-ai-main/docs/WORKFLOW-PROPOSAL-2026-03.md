# MedScribe Workflow Improvement Proposal

**Date:** March 2026  
**Based on:** CMS 2026 Physician Fee Schedule, NHS GP Connect (Oct 2025), USCDI v5, HL7 FHIR R4, AHIMA Telehealth Documentation Guidelines

---

## Current Workflow Audit

### What exists (3 stages)

```
Stage 1: New Consultation → Select Patient → Select Visit Type
Stage 2: Consent → Start Recording → Live Transcription + AI → End Recording
Stage 3: Review Transcript → Generate SOAP Note → Edit → Finalize
          └─── OR ──→ Write Prescription → Download PDF
```

### Identified gaps vs. US/UK telemedicine standards

| Gap | US Standard | UK Standard | Impact |
|-----|-------------|-------------|--------|
| **No pre-visit preparation** | CMS requires documented chart review for E/M billing | NHS GP Connect mandates prior record review | Missed drug interactions, duplicate tests, incomplete history |
| **No identity verification (telemedicine)** | Required by state medical boards | CQC requirement for remote consultations | Medicolegal liability |
| **No technology/modality documentation** | CMS 2026 PFS requires modality tracking | NHS Standards Directory requires tech logging | Billing compliance failure |
| **No medication reconciliation** | Joint Commission NPSG requirement | NICE CG76 (medicines reconciliation) | Patient safety risk — drug interactions undetected |
| **No structured discharge** | CMS Discharge Planning CoP | NHS GP Access Standards | Patient left without instructions, no follow-up scheduled |
| **No quality check before finalization** | AMA CPT requires documented MDM complexity | GMC Good Medical Practice | Under/over-coding, clinical errors pass to record |
| **No compliance/audit per-consultation** | HIPAA audit controls required | ICO / GDPR accountability principle | Regulatory exposure |

---

## Proposed 6-Stage Workflow

### Stage 1: PRE-VISIT PREPARATION (NEW)

**What happens:**
1. Patient intake form (sent via portal or waiting room) auto-populates
2. AI Pre-Visit Brief pulls previous consultations, active medications, open follow-ups, risk flags
3. Automated medication reconciliation checks current prescriptions against drug interaction database
4. Previous records summary with unresolved problems highlighted
5. Risk assessment score calculated from patient history

**Standards addressed:**
- CMS: Chart review documentation (required for time-based E/M billing)
- NHS: GP Connect prior record review
- Joint Commission: Medication reconciliation (NPSG.03.06.01)

**Data stored:** `pre_visit_brief` JSON in consultation metadata, `medication_reconciliation` array

### Stage 2: IDENTITY & TECHNOLOGY VERIFICATION (NEW — telemedicine only)

**What happens:**
1. Patient identity verified (name, DOB confirmation via portal or verbal)
2. Connection quality assessed (bandwidth, latency, audio/video quality score)
3. Visit modality documented automatically (in-person / video / audio-only / async)
4. Informed consent obtained with timestamp and modality-specific disclosures
5. Patient location documented (required for cross-state/cross-border telemedicine)

**Standards addressed:**
- CMS 2026 PFS: Telehealth modality tracking, supervision via audio-visual
- State Medical Board requirements: Patient location documentation
- CQC: Remote consultation identity verification
- HIPAA: Patient consent documentation

**Data stored:** `identity_verified`, `connection_quality_score`, `visit_modality`, `patient_location` in consultation metadata

### Stage 3: CONSULTATION (ENHANCED — existing + improvements)

**What happens:**
1. Start recording with AI copilot (existing)
2. Live transcript with speaker separation (existing)
3. Real-time Clinical Decision Support with drug interaction alerts (existing, enhanced)
4. **NEW:** Structured problem list tracking — each problem discussed is tagged
5. **NEW:** Time tracking per problem (for MDM-based E/M coding)
6. **NEW:** Safety alerts (critical lab values, allergy warnings) surfaced in real-time
7. End recording with auto-save (existing, now with reconnection resilience)

**Standards addressed:**
- CMS: Medical Decision Making complexity levels (straightforward → high)
- AMA: Problem-oriented documentation
- USCDI v5: Clinical notes, problems, allergies

**Data stored:** `problems_addressed[]`, `time_per_problem{}`, `safety_alerts_triggered[]`

### Stage 4: DOCUMENTATION (ENHANCED — existing + quality checks)

**What happens:**
1. Structured SOAP note generated with AI (existing)
2. ICD-10 diagnostic coding with confidence scoring (existing)
3. CPT procedure coding with E/M level justification (existing)
4. **NEW:** Prescription generated alongside note (not separate disconnected flow)
5. **NEW:** Drug interaction check at prescription time against current medications
6. **NEW:** Quality check — AI flags:
   - Missing assessment for documented symptoms
   - Plan items without corresponding assessment
   - Billing code / MDM level mismatch
   - Unsigned/unreviewed clinical alerts
7. **NEW:** Co-sign workflow for supervisees (existing endpoint, not yet in workflow)

**Standards addressed:**
- AMA CPT: E/M documentation guidelines (2025 revision)
- CMS: Correct Coding Initiative (CCI) edits
- NHS: Clinical coding accuracy requirements
- NICE: Medicines optimization (CG76)

**Data stored:** `quality_check_results`, `drug_interactions_at_prescription`, `e_m_level_justification`

### Stage 5: PATIENT DISCHARGE (NEW)

**What happens:**
1. **Patient Summary** auto-generated from SOAP note in plain language (existing visit_summary endpoint)
2. **Education Materials** linked to diagnosed conditions (existing patient_education table)
3. **Follow-up Scheduling** — AI suggests next visit date based on diagnosis and treatment plan
4. **Medication Instructions** — dosage, timing, side effects in patient-friendly language
5. **Portal Sharing** — summary + instructions shared to patient portal
6. **Return Precautions** — conditions under which patient should return urgently

**Standards addressed:**
- CMS: Discharge Planning Conditions of Participation
- NHS: GP Access Standards (follow-up within defined timeframes)
- NICE: Patient experience guidelines (CG138)
- Health Literacy: Plain language requirement (ACA Section 1311)

**Data stored:** `discharge_summary`, `education_materials_sent[]`, `follow_up_scheduled`, `return_precautions`

### Stage 6: REVIEW & COMPLIANCE (NEW)

**What happens:**
1. Audit trail entry created for the complete consultation lifecycle
2. FHIR resources generated: Encounter, Composition, MedicationRequest, Condition
3. Compliance scorecard: consent ✓, identity ✓, modality documented ✓, note signed ✓
4. Analytics metrics updated: duration, outcome tracking, patient satisfaction
5. Peer review queue: flagged consultations routed for quality review

**Standards addressed:**
- HIPAA: Audit control requirements (§164.312(b))
- GDPR: Accountability principle (Article 5(2))
- NHS: Clinical governance requirements
- HL7 FHIR R4: Interoperability data package

**Data stored:** `compliance_scorecard`, `fhir_bundle_id`, `peer_review_status`

---

## Medical Notation Standards Implemented

| Standard | Description | Status in MedScribe |
|----------|-------------|---------------------|
| **SOAP** | Subjective, Objective, Assessment, Plan | Active — AI-generated structured notes |
| **ICD-10** | International Classification of Diseases, 10th Revision | Active — AI-suggested with confidence scoring |
| **CPT** | Current Procedural Terminology | Active — E/M codes with accept/reject |
| **HL7 FHIR R4** | Fast Healthcare Interoperability Resources | Ready — export endpoint implemented |
| **USCDI v5** | US Core Data for Interoperability | Partial — clinical notes, medications, problems |
| **SNOMED CT** | Systematized Nomenclature of Medicine | Planned — for clinical terminology standardization |
| **LOINC** | Logical Observation Identifiers | Planned — for lab results and vital signs |
| **RxNorm** | Normalized drug names | Planned — for medication normalization |
| **NHS GP Connect** | CareConnect FHIR profiles | Planned — for UK interoperability |

---

## Data Retention Standards

Per US/UK regulatory requirements:

| Data Type | Retention Period | Authority |
|-----------|-----------------|-----------|
| Clinical records (adults) | 10 years after last treatment | NHS Records Management Code 2021 |
| Clinical records (children) | Until 25th birthday or 10 years after last treatment | NHS / CMS |
| Prescriptions | 10 years | State pharmacy boards |
| Audit logs | 6 years | HIPAA §164.530(j) |
| Consent records | Duration of treatment + 6 years | GDPR Art. 7 / HIPAA |
| Telehealth recordings | 10 years (same as clinical records) | CMS / state law |

---

## Implementation Priority

| Phase | Changes | Effort | Impact |
|-------|---------|--------|--------|
| **Phase 1** (Done) | Admin panel, data retrieval, audit log viewing | 1 week | High — data accessibility |
| **Phase 2** | Pre-visit brief, medication reconciliation | 2 weeks | High — patient safety |
| **Phase 3** | Identity verification, modality tracking | 1 week | Medium — compliance |
| **Phase 4** | Quality check before finalization | 2 weeks | High — clinical accuracy |
| **Phase 5** | Patient discharge flow (summary + education + follow-up) | 2 weeks | High — patient outcomes |
| **Phase 6** | FHIR export, compliance scorecard, SNOMED CT | 3 weeks | Medium — interoperability |

---

*Proposal based on full source code audit and regulatory research, March 2026.*
