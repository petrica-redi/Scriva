# Audit sincer al produsului MedScribe AI + One-pager

**Data:** Martie 2026 · **Use case:** F Station program application

---

## PROBLEM STATEMENT (F Station — English)

Physicians lose **49% of their workday** to documentation (Sinsky et al., *Ann Intern Med*, 2016) and billions annually to diagnostic coding errors. In **France**, a single CCAM code unsupported by clinical documentation can trigger CNAM recovery procedures (Code de la Sécurité Sociale, Art. L.133-4; 2023 Health Modernization Act). In **Romania**, prescription errors mean repaying the full prescription value, with significant fines per sick-note error (CNAS enforcement, Legea 95/2006). Globally, **86% of claim denials are potentially avoidable** (Change Healthcare Denials Index, 2017+) — caused by wrong codes, missed diagnostic criteria, and incomplete documentation. Existing AI scribes handle transcription but **none enforce diagnostic criteria** (e.g. the 6‑month threshold for GAD, DSM-5, APA 2013) or **validate insurance billing rules per market**.

**MedScribe** is an AI clinical copilot that enforces diagnostic accuracy and insurance compliance **in real time — during the consultation, not after** — preventing claim denials before they happen and giving physicians back an estimated **2 hours per day**.

---

## PARTEA 1 — AUDIT SINCER

### Ce funcționează bine acum

| Zonă | Stare | Detalii |
|------|--------|--------|
| **Booking** | ✅ Funcțional | Pagina `/book`: căutare clinici (`/api/clinics/search`), listare programări (`/api/bookings`), confirmare (`/api/bookings`, POST). Flux complet pentru programare online. |
| **Transcriere** | ✅ Funcțional (dacă e configurat) | Streaming în timp real prin **Deepgram** (WebSocket `wss://api.deepgram.com`). Key din `/api/deepgram/stream-key`; fallback batch prin `/api/deepgram/transcribe`. Dacă `DEEPGRAM_API_KEY` lipsește, „Stream not available”. |
| **UI** | ✅ Coerent | Next.js 15, React 19, Tailwind, Framer Motion. Sidebar, header, dashboard, calendar, pacienți, analytics, setări. Design „Precision Workspace”, bilingv EN/RO (i18n). |
| **Auth & date** | ✅ Funcțional | Supabase: auth, `users`, `consultations`, `patients`, `note_templates`, `clinical_alerts`, `drug_interactions`, `follow_ups`, etc. RLS și migrări. |
| **Note & rețete** | ✅ Funcțional | Generare note din transcript (`/api/generate-note`), regenerare secțiuni, export PDF/JSON. Prescripții (`/api/prescriptions`, PDF). |
| **Criterii de diagnostic** | ✅ Integrate (recent) | Modul `diagnostic-criteria.ts`: 10 tulburări cu TIME, SYMPTOMS, EXCLUSIONS. Injected în prompturile AI pentru analyze-consultation și clinical-decision-support. |

### Ce e broken sau fragil

| Problema | Severitate | Detalii |
|----------|------------|--------|
| **Diagnosticul / CDS** | Mediu | AI-ul primește reguli explicite (DSM-5/ICD-10) și țara de practică, dar: (1) răspunsul e în funcție de calitatea transcriptului — dacă transcriptul e gol sau slab, diagnosticul e slab; (2) **React error #418** a apărut în producție (hydration/context), poate afecta UI-ul după răspunsul AI. |
| **Lag-ul** | Mediu | Transcrierea în timp real depinde de Deepgram (latency rețea + API). Generarea de note și CDS depind de Anthropic (sau Ollama local) — 2–10+ secunde. Nu există caching agresiv al răspunsurilor AI. |
| **Criteriile de timp** | Parțial adresate | Criteriile de timp (6 luni GAD, 2 săptămâni MDD, etc.) sunt **în prompt** ca reguli; modelul e instruit să le verifice și să scrie în „reasoning” dacă lipsesc. Nu există validare programatică (nu „if duration < 6 months then reject GAD” în cod) — totul e delegat la LLM. |
| **Stream „not available”** | Config | Dacă `DEEPGRAM_API_KEY` nu e setat (local sau pe Vercel), pagina de record afișează că stream-ul nu e disponibil. E o problemă de configurare, nu de cod. |
| **Erori UX la eșec** | Scăzut | Sign out la eșec nu arată toast; unele API-uri nu returnează mesaje consistente; `alert()` în loc de toast în câteva locuri. |

### Ce e construit de tine vs. API-uri terțe (pentru investitori)

| Componentă | Construit de tine (propriu) | Terț (API / serviciu) |
|------------|----------------------------|-------------------------|
| **Aplicația web** | ✅ Next.js, toate paginile, fluxuri, state, UI | — |
| **Autentificare & baza de date** | ✅ Logică, RLS, migrări, schema | **Supabase** (auth + Postgres hosting) |
| **Transcriere vocală** | ✅ Integrare WebSocket, buffer, fallback batch | **Deepgram** (speech-to-text) |
| **AI pentru note, CDS, diagnostice** | ✅ Prompturi, reguli DSM-5/ICD-10, guideline-uri pe țară, logica de fallback | **Anthropic (Claude)** sau **Ollama** (local) — modelul LLM e terț |
| **Email (referral, etc.)** | ✅ Apeluri din app | **Resend** (dacă e configurat) |
| **Hosting / deploy** | ✅ Configurare | **Vercel** (și eventual Supabase cloud) |
| **Criterii de diagnostic** | ✅ Reguli explicite (10 tulburări, timp, simptome, excluderi) — cod propriu | — |
| **Guideline-uri pe țară** | ✅ Date și logică (RO, UK, FR, DE, US) — cod propriu | — |

**Rezumat pentru investitori:** Logica de produs, UX, integrarea fluxurilor, regulile de diagnostic și guideline-urile pe țară sunt **construite de tine**. Transcrierea și „creierul” LLM sunt **terțe** (Deepgram, Anthropic/Ollama). Ai **control complet** asupra codului și a datelor; poți schimba providerul de transcriere sau de LLM fără să schimbi produsul.

### Cine a construit demo-ul? Ai codul sursă? Ai control complet?

- **Cine:** Demo-ul este construit în acest proiect (MedScribe/medscribe-ai-main). Nu e un „demo” extern; e aplicația în sine.
- **Cod sursă:** Da. Tot codul este în repo (Next.js, React, API routes, lib, components). Nu există black-box-uri; dependențele sunt în `package.json`, env în `.env.example` / `.env.local`.
- **Control complet:** Da. Repo-ul e al tău; poți modifica orice, schimba API-uri, adăuga validări programatice pentru criterii de timp, înlocui Deepgram sau Claude cu alți provideri.

---

## PARTEA 2 — ONE-PAGER (o pagină)

### Problema pe care o rezolvi (una singură, clar)

**Medici și psihiatrii pierd ~49% din zi cu documentația (Sinsky et al., 2016); miliarde se pierd anual prin erori de codare și refuzuri de rambursare — 86% dintre refuzuri sunt evitabile (Change Healthcare).** În Franța, un act CCAM nejustificat în documentație poate declanșa proceduri CNAM (Art. L.133-4); în România, o rețetă greșită înseamnă rambursare integrală și amenzi (Legea 95/2006, CNAS). Scribe-urile AI existente transcriu, dar **niciunul nu aplică criterii de diagnostic** (ex. 6 luni pentru GAD, DSM-5) sau **reguli de facturare per țară**. MedScribe reduce povara: transcrie consultația, **verifică criterii în timp real** (în consultație, nu după), generează note structurate și sugerează diagnostice cu **criterii explicite** și **ghiduri pe țară** (RO, UK, FR, DE, US), astfel încât documentul să fie utilizabil local (CNAS, NICE, HAS) și să prevină refuzuri de rambursare.

---

### Pentru cine (un singur tip de client)

**Psihiatri care lucrează în cabinet sau în spital și care doresc documentație rapidă, corect codată (ICD-10/ICD-11) și aliniată la protocoalele țării lor** — mai ales în țări unde lista de medicamente și cerințele de raportare sunt stricte (ex. România cu CNAS și protocoale terapeutice, UK cu NICE).

---

### De ce tu (ce știi tu ce nu știe Nabla)

- **Nabla** (și alți „AI scribe” generaliști) oferă transcriere + note generice; nu modelează **criteriile de diagnostic** (DSM-5/ICD-10) ca reguli explicite și nu adaptează outputul la **țara de practică** (ghiduri, listă medicamente, rambursare). Tu ai integrat reguli per tulburare (timp, simptome, excluderi) și guideline-uri per țară — deci sugestiile pot fi verificate și justificate în raport cu protocoalele locale.
- **Tu știi** cerințele din România (bilet trimitere, protocoale CNAS, Legea 487/2002, psihoterapie nerambursată) și ai aliniat produsul la acestea; ai extins la UK, Franța, Germania, SUA din documentație structurată. Nabla nu oferă acest nivel de contextualizare pe țară și pe specialitate.
- **Tu ai** codul sursă și control complet: poți adăuga validări programatice, alte țări, liste CNAS/BNF reale, fără să depinzi de roadmap-ul unui furnizor extern. Pentru investitori: IP-ul în logică de diagnostic și în datele de guideline-uri e al tău; doar transcrierea și LLM-ul sunt commodity (Deepgram, Claude).

---

---

## REFERENCES & VERIFICATION (F Station)

| Claim | Source | Verification / note |
|-------|--------|----------------------|
| 49% of workday to documentation | Sinsky CA et al. Allocation of Physician Time in Ambulatory Practice: A Time and Motion Study in 4 Specialties. *Ann Intern Med* 2016;165(11):753-760. DOI: 10.7326/M16-0961. | **Verified.** Study reports **49.2%** of office time on EHR and desk work (57 physicians, 4 specialties). Use “49%” or “49.2%” for precision. |
| 86% of claim denials preventable | Change Healthcare Revenue Cycle Denials Index (cited in Becker’s Hospital Review, HFMA). | **Verified.** 86% “potentially avoidable” is widely cited. The Index has multiple years (2017, 2020, 2022); if your source is 2017, keep it; otherwise “Change Healthcare Denials Index” without year is safe. |
| France: CCAM / CNAM audit | Code de la Sécurité Sociale, Art. L.133-4; 2023 Health Modernization Act. | **Partially verified.** L.133-4 governs **recouvrement des indus** (recovery of overpayments) for tariff/billing violations; CCAM is the French procedure coding nomenclature. The “automatic audit” is a practical consequence of non-compliant coding. Consider: “can trigger CNAM recovery procedures” rather than “triggers an automatic CNAM audit” unless you have the exact procedure text. |
| Romania: prescription / sick note fines | Legea 95/2006, CNAS (CASA) enforcement. | **Law verified.** Legea 95/2006 is the correct framework; CNAS enforces. The **€5,000 per sick note error** figure should be confirmed against current CNAS norms or ministerial orders; cite the exact norm if available. |
| GAD 6‑month criterion | DSM-5, American Psychiatric Association, 2013. | **Verified.** GAD requires excessive anxiety and worry for at least 6 months (Criterion D). |

---

## SUGGESTED IMPROVEMENTS FOR F STATION

1. **Product name:** You used “Levio” in the draft; the codebase and this doc use **MedScribe**. Use one name consistently in the application (e.g. MedScribe) unless F Station requires a different brand.
2. **“2 hours per day”:** The Sinsky study does not give “2 hours back” directly; it shows ~49% of time on EHR/desk work. Derive “2 hours” from your own assumptions (e.g. “if we cut documentation by X%, physicians gain ~2 h/day”) or cite a secondary source. Alternatively: “giving physicians back a substantial share of their day.”
3. **Tighten France wording:** Prefer “can trigger CNAM recovery procedures” unless you have official wording for “automatic audit.”
4. **Romania:** Add the exact legal basis for the €5,000 figure (e.g. CNAS order or OUG) if you have it; otherwise “significant fines” is safer.
5. **One-pager alignment:** Partea 2 now mirrors the F Station problem (stats, France, Romania, 86%, real-time enforcement, MedScribe). Keep the “during the consultation, not after” phrase in the English block; it differentiates you clearly.

---

*Document generat pe baza auditului tehnic al codebase-ului MedScribe AI (martie 2026).*
