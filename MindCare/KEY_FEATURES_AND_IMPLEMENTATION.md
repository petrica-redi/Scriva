# MindCare AI — Key Features & Implementation Roadmap
**Date:** 18 February 2026

---

## KEY FEATURES TO INTEGRATE

Based on clinician interviews, competitor analysis, and market gaps:

### 🔴 MUST-HAVE (MVP — Weeks 1-4)

**1. Real-Time Psychiatric Symptom Detection**
- AI listens to consultation → identifies symptoms in real-time
- Maps symptoms to ICD-10 codes automatically
- Clinician confirms with one click → auto-populates structured exam
- Side panel shows: detected symptoms + "ask next" suggestions
- **Why:** Requested by psychiatrist (#2 interview), saves 15-17 min/consult, NO competitor does this
- **Effort:** ~2 weeks

**2. Smart Clinical Note Generation (Mental Health-Specific)**
- Templates: SOAP, Psychiatric Evaluation, Psychotherapy Progress Note, Fișă Consultații (RO)
- AI generates structured note from transcript, mapped to selected template
- Clinician edits/approves before saving
- Support for Romanian + English output
- **Why:** Core feature, all competitors have it — we need it to compete
- **Effort:** ✅ Already partially implemented, needs refinement ~1 week

**3. Patient Portal (Between-Session Engagement)**
- Patient login (separate from clinician)
- Journaling with guided prompts
- Mood tracking (daily mood score + notes)
- View session summaries + action points (shared by clinician)
- Upload reflections, voice notes
- Clinician can acknowledge with emoji/reaction ("feeling seen")
- **Why:** Requested by 3/4 clinicians, NO competitor offers this
- **Effort:** ~3 weeks

**4. AI Clinical Consultant ("Second Opinion")**
- Clinician describes a complex case
- AI suggests: potential diagnoses, differential diagnosis, treatment approaches, relevant literature
- Longitudinal analysis: "Based on 6 months of sessions, the pattern suggests..."
- Risk flags: suicide risk, medication interactions, deterioration signals
- **Why:** Requested by 3/4 clinicians, Mentalyc doesn't have it
- **Effort:** ~2 weeks (building on existing AI Assistant page)

**5. GP/Referral Letter Generation**
- Auto-generate referral letters to GPs, psychiatrists, or other specialists
- Based on session notes + patient history
- Customizable templates per country (UK NHS style, RO CNAS style)
- **Why:** Heidi has it, clinicians need it, saves significant time
- **Effort:** ~1 week

### 🟡 IMPORTANT (Growth — Months 2-3)

**6. Automated Scheduling + No-Show Prevention**
- Appointment reminders (SMS/email/push)
- Smart rescheduling suggestions
- Cancellation policy enforcement
- Waitlist management (fill cancelled slots)
- **Why:** Pain point #4 from interviews
- **Effort:** ~2 weeks

**7. Secure Between-Session Messaging**
- Clinician ↔ patient messaging (replaces WhatsApp)
- Async — clinician responds when available
- Boundary-respecting: configurable response hours, auto-replies
- End-to-end encrypted
- **Why:** All clinicians use WhatsApp now, it's not GDPR-compliant
- **Effort:** ~2 weeks

**8. Mental Status Exam Auto-Population**
- From transcript, auto-fill structured mental status exam fields:
  - Appearance, behavior, speech, mood, affect, thought process/content
  - Perception, cognition, insight, judgment
- Clinician reviews and edits
- **Why:** Psychiatrist (#2) built his own basic tool for this — strong validation
- **Effort:** ~2 weeks

**9. Progress Tracking & Analytics**
- Patient progress over time (mood trends, symptom severity)
- Clinician dashboard: outcomes per patient, session frequency, risk overview
- Exportable reports for insurance/CNAS
- **Why:** Differentiator vs. all competitors
- **Effort:** ~2 weeks

**10. Living Patient Dossier**
- All sessions, notes, transcripts, patient inputs, mood data in one evolving record
- Timeline view: chronological patient journey
- AI-powered insights: "Since medication change on [date], sleep scores improved 40%"
- Shared access: clinician sees all, patient sees their summaries/journals
- **Why:** "An interactive interface that pulls everything together" — Interview #3
- **Effort:** ~3 weeks

### 🟢 NICE-TO-HAVE (Scale — Months 3-6)

**11. EHR Integration (FHIR/HL7)**
- Connect with hospital systems, Hipocrate, InfoWorld
- Bidirectional data sync
- **Effort:** ~4 weeks

**12. Mobile App (iOS + Android)**
- Clinician: view notes, respond to messages, quick dictation
- Patient: journaling, mood tracking, session summaries
- **Effort:** ~6 weeks (React Native)

**13. Multi-Language AI**
- Full support: Romanian, English, French, German, Spanish
- AI generates notes in selected language
- **Effort:** ~2 weeks per language

**14. Billing & Insurance Integration**
- CNAS (Romania) reporting
- Private billing + invoicing
- Session tracking for insurance claims
- **Effort:** ~3 weeks

**15. Telehealth Integration**
- Built-in video calling (or Zoom/Teams integration)
- Record + transcribe during call
- **Effort:** ~3 weeks

---

## IMPLEMENTATION STEPS (What I Need to Do)

### Phase 1: Demo Polish (This Week)
| # | Task | Effort | Status |
|---|------|--------|--------|
| 1 | Test full flow: record → transcribe → generate note | 2h | 🔜 Next |
| 2 | Fix any bugs found during testing | 2-4h | 🔜 |
| 3 | Verify language switcher (EN/RO) works | 1h | 🔜 |
| 4 | Update patient names + verify all pages work | 1h | ✅ Done |
| 5 | Deploy on cloud (VPS + domain) | 4h | 🔜 |
| 6 | Let's Encrypt HTTPS certificate | 1h | 🔜 |

### Phase 2: MVP Differentiators (Weeks 2-4)
| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 7 | **Psychiatric Symptom Detection** — AI analyzes transcript in real-time, suggests ICD-10 codes, clinician confirms | 2 weeks | Deepgram + Mistral working |
| 8 | **Patient Portal** — separate login, journaling, mood tracking, session summaries | 3 weeks | Auth system (done) |
| 9 | **AI Clinical Consultant** — enhanced AI assistant for case analysis, differential diagnosis, treatment suggestions | 2 weeks | Mistral API (done) |
| 10 | **GP/Referral Letter Generator** — auto-generate from session notes | 1 week | Note generation (done) |
| 11 | **Mental Status Exam Auto-Fill** — structured exam from transcript | 2 weeks | Symptom detection (#7) |

### Phase 3: Growth Features (Months 2-3)
| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 12 | Automated reminders + no-show prevention | 2 weeks | SMS/email service |
| 13 | Between-session messaging (clinician ↔ patient) | 2 weeks | Patient portal (#8) |
| 14 | Progress tracking + analytics dashboard | 2 weeks | Patient data (#8) |
| 15 | Living Patient Dossier (timeline view) | 3 weeks | All data sources |
| 16 | Mobile-responsive optimization | 1 week | — |
| 17 | Multi-clinician support | 2 weeks | Auth system |

### Phase 4: Scale (Months 3-6)
| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 18 | Mobile app (React Native) | 6 weeks | API stable |
| 19 | EHR integration (FHIR/HL7) | 4 weeks | — |
| 20 | Billing + CNAS integration | 3 weeks | — |
| 21 | Telehealth (video + record) | 3 weeks | — |
| 22 | Multi-language AI (FR, DE, ES) | 2 weeks/lang | — |

---

## PRIORITY MATRIX

```
                    HIGH IMPACT
                        │
    Symptom Detection   │   Patient Portal
    AI Consultant       │   GP Letters
    Mental Status Exam  │   Progress Tracking
                        │
   LOW EFFORT ──────────┼────────── HIGH EFFORT
                        │
    Language Switcher    │   Mobile App
    Cloud Deploy        │   EHR Integration
    Note Templates      │   Telehealth
                        │
                    LOW IMPACT
```

**Start with:** High Impact + Low Effort (top-left quadrant)
**Then move to:** High Impact + High Effort (top-right)

---

## NEXT IMMEDIATE STEP

**Tomorrow:** Test the full consultation flow end-to-end:
1. Open a consultation
2. Record audio (mic test)
3. Transcribe with Deepgram
4. Generate clinical note with Mistral
5. Save and review

This validates the core product before we build differentiators.
