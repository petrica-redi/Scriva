# Implementare Copilot Psihiatric Best-in-Class

**Scop:** Să se vadă ce e deja acoperit, ce lipsește și ce presupune fiecare ajustare (cod + instrucțiuni). Propunerea de mai jos e aliniată la arhitectura existentă (Next.js, Supabase, Deepgram, Anthropic/Ollama).

---

## 1. Ce e deja acoperit vs. ce nu e încă

| Funcționalitate | Stare actuală | Lipsește / de făcut |
|-----------------|---------------|----------------------|
| **Transcriere** | ✅ Deepgram streaming + batch | Înțelegere contextuală psihiatrică: presiune vorbire, latență, tangențialitate. Deepgram dă text + timestamps per cuvânt — nu analiză de WPM/pauze în UI. |
| **Criterii DSM-5/ICD-10** | ✅ În prompt (text) în CDS și analyze-consultation; 10 tulburări cu TIME/SYMPTOMS/EXCLUSIONS | Mapare **live** pe criterii cu progress tracker vizual; criterii ca **JSON structurat** (A, B, C1–C6, D, E, F); **extraction** LLM per criteriu + **validare deterministică** (rules engine). |
| **Arbore întrebări sugerate** | ❌ | Întrebări bazate pe ce s-a spus și ce nu s-a explorat (din transcript + criterii neîndeplinite). |
| **Screening scales (PHQ-9, GAD-7, MADRS, YMRS)** | Menționate în ghiduri și analytics placeholder | **Auto-populated din conversație** (LLM extrage răspunsuri la itemi); UI pentru scale completate parțial/complet. |
| **Echivalențe doză** | ✅ API `/api/smart-prescription/dose-equivalence` | Integrare în UI prescripție + validare (vârstă, renal/hepatic, sarcină) — parțial. |
| **Maudsley / linii tratament** | ✅ API `/api/smart-prescription/treatment-pathway` + `medications` | „Pacientul a încercat X → treci la linia 2” — logică în backend + UI. |
| **Interacțiuni + explicație clinică** | ✅ CDS returnează drug_interactions; DB `drug_interactions` | Explicație clinică (nu doar alertă) — poate fi în prompt sau în descriere din DB. |
| **Risc suicidar + safety plan** | ❌ | Calcul risc din transcript + protocol safety plan (template + pași); post-consultație. |
| **Follow-up calibrat pe medicație** | ✅ Follow-ups în app; tipuri: medication_check, etc. | Reguli automate: SSRI = review 2 săpt., litiu = control seric 5–7 zile — logică în backend + sugestii în UI. |
| **Longitudinal tracking scoruri** | Placeholder în analytics (PHQ-9/GAD-7/BDI) | Stocare scoruri per consultație + grafice evoluție. |

---

## 2. Ce presupune fiecare ajustare (cod + instrucțiuni)

### 2A. Mapare live pe criterii DSM-5 / ICD-10 (progress tracker)

**Ce există:** `src/lib/diagnostic-criteria.ts` — criterii ca text în prompt; nu există evaluare per criteriu (met/unmet/null) nici UI de progress.

**Ce trebuie adăugat:**

1. **Structură de date criterii (JSON)**  
   - Un fișier (ex. `src/lib/dsm5-criteria/index.ts` sau JSON) cu pentru fiecare tulburare (F41.1, F32.x, F41.0, F43.10, F42, F31.x, F20.x, F51.0, F90.x, F43.2):  
     - `criteria`: A, B, C (checklist cu C1–C6), D (temporal), E (functional impact), F (exclusion)  
     - `type`: symptom | checklist | temporal | functional_impact | exclusion  
     - `required`, `minimum_required` (pentru checklist), `minimum_duration_months` (pentru temporal)  
   - Exemplu pentru GAD (F41.1) este în secțiunea 3 mai jos.

2. **API nou: evaluare criterii din transcript**  
   - **Rută:** `POST /api/ai/evaluate-criteria`  
   - **Body:** `{ transcript: string, diagnosis_code: string }` (ex. `"F41.1"`).  
   - **Logică:**  
     - Încarcă definiția criterii pentru `diagnosis_code` (din JSON).  
     - **System prompt pentru LLM:** „Analizează transcriptul și pentru fiecare criteriu din listă returnează: met (true/false/null), evidence (citat din transcript), confidence (high/medium/low), follow_up_needed (întrebare sugerată dacă e neclar). Pentru criterii TEMPORAL extrage reported_duration. Pentru CHECKLIST marchează fiecare item. Reguli: nu infera simptome nementionate; dacă pacientul zice «o lună» iar criteriu e 6 luni, met = false.”  
     - **Response:** JSON cu evaluare per criteriu (A, B, C1–C6, D, E, F) + câmpuri `met`, `evidence`, `confidence`, `follow_up_needed`, `reported_duration_months` unde e cazul.  
   - **Rules engine (deterministic, în cod, nu LLM):**  
     - După ce primești evaluarea de la LLM, rulezi validări:  
       - Dacă `type === "temporal"` și `reported_duration_months < minimum_duration_months` → alertă „Criteriul de timp neîndeplinit”.  
       - Dacă `type === "checklist"` și numărul de itemi cu `met === true` < `minimum_required` → alertă „X din Y criterii îndeplinite, lipsesc: …”.  
     - Poți returna aceste alerte în același răspuns (ex. `alerts: Array<{ type, severity, message, suggestion }>`).

3. **Frontend: panou „DSM-5 Criteria Tracker”**  
   - Componentă nouă (ex. în `consultation/[id]/record` sau ca sidebar):  
     - Selector sau listă de diagnostice suspectate (poate veni din CDS sau din evaluare anterioară).  
     - La alegerea unui diagnostic (ex. GAD F41.1): apel periodic (ex. la fiecare 30 s) sau la buton „Evaluate” către `POST /api/ai/evaluate-criteria` cu transcriptul curent.  
     - Afișare: pentru fiecare criteriu A, B, C1–C6, D, E, F — icon met/unmet/unknown, scurtă descriere, evidență (citat), eventual buton „Ask” pentru `follow_up_needed`.  
     - Afișare alerte din rules engine (ex. „3/6 criterii GAD; lipsește: criteriul de timp, tensiune musculară, iritabilitate”).

**Instrucțiuni pentru AI (coding):**  
- „Creează `src/lib/dsm5-criteria/` cu structura de criterii pentru F41.1 (GAD) ca în documentul de propunere; adaugă tipuri TypeScript.”  
- „Implementează `POST /api/ai/evaluate-criteria`: citește criterii din dsm5-criteria, construiește prompt de extraction, apelează generateWithFallback, parsează JSON, rulează validări temporale și checklist în cod, returnează evaluare + alerte.”  
- „Adaugă componenta DSM-5 Criteria Tracker în pagina de record: buton/selector diagnostic, apel la evaluate-criteria cu transcriptul curent, afișare criterii met/unmet/unknown și alerte.”

---

### 2B. Transcriere cu semnale psihiatrice (presiune vorbire, latență, tangențialitate)

**Ce există:** Deepgram streaming; în `useAudioRecorder` există `alt.words`, `data.start` — deci avem cuvinte și timestamps. Nu se calculează WPM, pauze, latență.

**Ce trebuie adăugat:**

1. **Procesare pe segment (client sau backend)**  
   - **Opțiune A (client):** În hook-ul de recording, la fiecare mesaj Deepgram cu `channel.alternatives[0].words`:  
     - Calculezi pentru o fereastră glisantă (ex. ultimele 60 s):  
       - `words_per_minute` = număr cuvinte / (durata în minute).  
       - `pause_ratio` = suma intervalelor > 1.5 s între cuvinte / durata totală.  
       - `response_latency` = timp de la ultima „întrebare” (segment doctor) până la primul cuvânt al pacientului — necesită diarizare (speaker 0/1).  
     - Trimiți aceste metrici într-un state (ex. `speechMetrics`) sau la un API care le salvează.  
   - **Opțiune B (backend):** Un job sau API care primește transcript cu timestamps (per cuvânt) și calculează același lucru.

2. **Tangențialitate / circumstanțialitate**  
   - Necesită **semantică**: „Pacientul a răspuns la întrebare?”.  
   - **Implementare:** Un prompt către LLM pe segmente de 1–2 min: „Transcript: … Întrebarea medicului: … Răspunsul pacientului este: direct / tangențial / fără răspuns? Dacă tangențial, citează fragmentul.”  
   - Apel periodic (ex. la fiecare 2 min de transcript nou) către același LLM (Anthropic/Ollama). Poate fi un endpoint nou `POST /api/ai/analyze-speech-patterns` cu `{ transcript_segment, last_physician_question }`.

3. **UI**  
   - Indicatori mici în panoul de transcript: WPM (cu bandă „normal” 120–150, „posibil manie” >200), „Pauze: X%”, „Latență răspuns: Xs”, „Răspuns: direct/tangențial”.  
   - Opțional: avertisment discret dacă WPM > 200 sau tangențialitate repetată.

**Instrucțiuni:**  
- „În useAudioRecorder, la fiecare chunk de cuvinte de la Deepgram, calculează words_per_minute și pause_ratio pe ultimele 60s și pune-le într-un state speechMetrics; expune-le din hook.”  
- „Adaugă în record page un mic panel care afișează speechMetrics (WPM, pauze).”  
- „Creează API POST /api/ai/analyze-speech-patterns care primește transcript_segment și last_physician_question și returnează direct/tangential/no_answer + quote; apelează-l din record la fiecare 2 min de transcript nou.”

---

### 2C. Întrebări sugerate (arbore bazat pe ce nu e explorat)

**Ce există:** CDS și analyze-consultation returnează `followUpQuestions` / logică similară; nu e explicit „ce criterii lipsesc → ce întrebare să pui”.

**Ce trebuie adăugat:**

- **Sursa întrebărilor:**  
  - (1) Din evaluarea de criterii: pentru fiecare criteriu cu `met === null` sau `false`, folosești `follow_up_needed` din răspunsul LLM.  
  - (2) Un prompt dedicat: „Pe baza transcriptului și a listei de criterii pentru [diagnostic], ce întrebări esențiale nu au fost încă adresate? Returnează 5–8 întrebări scurte, prioritizate.”  
- **API:** Poate fi parte din `evaluate-criteria` (câmp `suggested_questions`) sau un endpoint separat `POST /api/ai/suggested-questions` cu `{ transcript, diagnosis_code }`.  
- **UI:** Panou „Suggested questions” în record: listă de butoane; click copiază întrebarea în clipboard sau o inserează într-un câmp „Next question to ask”.

**Instrucțiuni:**  
- „În răspunsul de la evaluate-criteria, include suggested_questions (array de string) generat de LLM pe baza criteriilor neclarificate.”  
- „În record page, afișează suggested_questions; la click pe o întrebare, copiază în clipboard sau afișează într-un câmp vizibil.”

---

### 2D. Screening scales auto-populated (PHQ-9, GAD-7, MADRS, YMRS)

**Ce există:** Mențiuni în ghiduri și în analytics; nu există structuri de itemi sau extragere din conversație.

**Ce trebuie adăugat:**

1. **Definiții scale**  
   - Fișier (ex. `src/lib/screening-scales.ts`) cu pentru fiecare scale: id, name, itemi (text întrebare + valorificare 0–3 sau 0–4). Ex.: PHQ-9 = 9 itemi, GAD-7 = 7 itemi.

2. **Extraction din transcript**  
   - Prompt LLM: „Din acest transcript de consultație psihiatrică, identifică răspunsuri care corespund itemilor PHQ-9 [listă itemi]. Pentru fiecare item returnează: score (0–3), evidence (citat). Dacă nu există informație, score = null.”  
   - Același lucru pentru GAD-7, MADRS, YMRS (unde e cazul).

3. **API**  
   - `POST /api/ai/extract-screening-scores` cu `{ transcript, scale_ids: ["phq9", "gad7"] }` → returnează `{ phq9: { total, items: [{ item_id, score, evidence }] }, gad7: ... }`.

4. **UI**  
   - În record sau în note: secțiune „Screening scales” cu PHQ-9, GAD-7 etc.; itemi completați (cu culoare) și itemi necompletați; total calculat unde toate itemii au score.  
   - Opțional: salvare în DB (ex. `screening_scores` per consultație) pentru longitudinal tracking.

**Instrucțiuni:**  
- „Creează src/lib/screening-scales.ts cu definițiile PHQ-9 și GAD-7 (itemi + scoring).”  
- „Implementează POST /api/ai/extract-screening-scores; prompt care extrage din transcript scoruri per item; returnează total + items cu evidence.”  
- „Adaugă componenta Screening Scales în record sau note: afișare PHQ-9/GAD-7 cu itemi completați din răspunsul API.”

---

### 2E. Risc suicidar + safety plan (post-consultație)

**Ce există:** Nu există modul dedicat.

**Ce trebuie adăugat:**

- **Calcul risc:** Prompt sau reguli: din transcript (și eventual din note) extragi ideatie, plan, intent, comportament trecut; clasificare risc (low/medium/high/critical) conform C-SSRS sau protocol intern.  
- **API:** `POST /api/ai/suicide-risk-assessment` cu `{ transcript, note_summary? }` → `{ level, factors, recommendation, safety_plan_suggested }`.  
- **Safety plan:** Template structurat (triggere, semnale de avertizare, coping, contacte de urgență, medicație); poate fi generat de LLM și afișat ca formular de completat/trimis.  
- **UI:** Secțiune post-consultație „Risc suicidar” cu nivel + recomandare + link la safety plan; alertă vizuală pentru high/critical.

**Instrucțiuni:**  
- „Implementează POST /api/ai/suicide-risk-assessment care analizează transcriptul și returnează level, factors, recommendation; folosește prompt cu criterii C-SSRS.”  
- „Adaugă în note sau post-consult un bloc Safety plan: template cu 5–6 secțiuni; buton „Generează draft” care apelează LLM și populează câmpurile.”

---

### 2F. Follow-up calibrat pe medicație

**Ce există:** Follow-ups în app; tipuri: medication_check, etc. Nu există reguli automate per clasă de medicament.

**Ce trebuie adăugat:**

- **Reguli în backend:** Ex.:  
  - SSRI/SNRI → sugerează „Review la 2 săptămâni”.  
  - Litiu → „Control seric la 5–7 zile”.  
  - Antipsihotice noi → „Review la 2–4 săptămâni”.  
- **Implementare:** Fie în `generate-note` / CDS (la detectarea prescrierii), fie la salvare rețetă: un serviciu `getSuggestedFollowUp(medications[])` care returnează `{ type, due_in_days, reason }`.  
- **UI:** La finalizare consultație sau la prescriere: „Sugestie follow-up: Review la 2 săptămâni (SSRI).” cu posibilitate de a crea follow-up cu un click.

**Instrucțiuni:**  
- „Creează src/lib/follow-up-rules.ts: mapare clasă medicament → { due_days, label }; funcție getSuggestedFollowUp(medication_names: string[]).”  
- „La salvare prescripție sau la CDS, apelează getSuggestedFollowUp și afișează sugestia în UI cu buton Creare follow-up.”

---

### 2G. AI Assistant orientat psihiatric (nu generic)

**Ce există:** Pagina AI Assistant cu „General Clinical Query”, „Patient-Specific”, „ICD / Disease Code” și exemple generice (chest pain, hypertension, warfarin).

**Ce trebuie adăugat:**

- **Exemple de întrebări psihiatrice** în locul sau pe lângă cele generice:  
  - „Care sunt diagnosticele diferențiale pentru anxietate cu insomnie de 3 luni?”  
  - „Rezumat ghid NICE pentru depresie moderată”  
  - „Echivalență doză sertralină → escitalopram”  
  - „Criterii DSM-5 pentru GAD și ce întrebări să pun pentru criteriul de timp”  
- **System prompt** pentru `/api/ai/ask`: dacă utilizatorul e pe scope „general” sau „icd”, adaugă în prompt: „Răspunsurile trebuie să fie orientate către practica psihiatrică: criterii DSM-5/ICD-10, protocoale de prescriere (NICE, CNAS, Maudsley unde e relevant), screening (PHQ-9, GAD-7), și recomandări de follow-up specifice psihiatrie.”

**Instrucțiuni:**  
- „În ai-assistant page, înlocuiește exemplele de query cu întrebări psihiatrice (diferential anxiety/insomnia, NICE depression, dose equivalence, DSM-5 GAD).”  
- „În API /api/ai/ask, adaugă în system prompt un bloc scurt: orientare psihiatrică (DSM-5/ICD-10, protocoale, screening, follow-up).”

---

## 3. Exemplu structură criterii JSON (GAD F41.1)

Următorul tip și obiect pot fi folosite în `src/lib/dsm5-criteria/` și în API-ul de evaluare. Varianta de mai jos e adaptată la TypeScript și la flow-ul LLM extraction + rules engine.

```ts
// Tipuri pentru criteria engine
export type CriterionType = "symptom" | "checklist" | "temporal" | "functional_impact" | "exclusion";

export interface CriterionItem {
  id: string;
  description: string;
  met?: boolean | null;
}

export interface CriterionDef {
  id: string;
  description: string;
  type: CriterionType;
  required?: boolean;
  minimum_required?: number;   // pentru checklist
  minimum_duration_months?: number;  // pentru temporal
  items?: Record<string, { description: string }>;  // pentru checklist: C1..C6
  exclusions_to_check?: string[];
}

export interface DisorderCriteriaDef {
  code: string;
  name: string;
  coding_system: string;
  dsm5_equivalent?: string;
  criteria: Record<string, CriterionDef>;
  differential_diagnoses: string[];
  recommended_investigations?: string[];
}

export const GAD_F41_1: DisorderCriteriaDef = {
  code: "F41.1",
  name: "Generalized Anxiety Disorder",
  coding_system: "ICD-10",
  dsm5_equivalent: "300.02",
  criteria: {
    A: {
      id: "A",
      description: "Excessive anxiety and worry about multiple events/activities",
      type: "symptom",
      required: true,
    },
    B: {
      id: "B",
      description: "Difficulty controlling the worry",
      type: "symptom",
      required: true,
    },
    C: {
      id: "C",
      description: "3+ of the following symptoms",
      type: "checklist",
      minimum_required: 3,
      items: {
        C1: { description: "Restlessness or feeling on edge" },
        C2: { description: "Being easily fatigued" },
        C3: { description: "Difficulty concentrating or mind going blank" },
        C4: { description: "Irritability" },
        C5: { description: "Muscle tension" },
        C6: { description: "Sleep disturbance" },
      },
    },
    D: {
      id: "D",
      description: "Duration ≥ 6 months",
      type: "temporal",
      minimum_duration_months: 6,
    },
    E: {
      id: "E",
      description: "Causes clinically significant distress or impairment",
      type: "functional_impact",
      required: true,
    },
    F: {
      id: "F",
      description: "Not attributable to substance, medical condition, or another mental disorder",
      type: "exclusion",
      required: true,
      exclusions_to_check: ["thyroid_disorder", "substance_use", "medication_side_effect", "another_anxiety_disorder"],
    },
  },
  differential_diagnoses: ["F41.0", "F41.3", "F32.0", "F43.1"],
  recommended_investigations: ["TSH", "B1", "B6", "B12", "CBC", "metabolic_panel"],
};
```

Restul tulburărilor (F32.x, F41.0, F43.10, F42, F31.x, F20.x, F51.0, F90.x, F43.2) se modelează similar: același tip `DisorderCriteriaDef`, cu `criteria` adaptat la DSM-5 pentru fiecare.

---

## 4. Ordine sugerată de implementare

1. **Criterii structurate + API evaluate-criteria + panou Criteria Tracker** — core-ul diferențierii față de „one size fits all”.  
2. **AI Assistant psihiatric** — prompt + exemple; rapid și vizibil.  
3. **Întrebări sugerate** (din evaluate-criteria sau endpoint dedicat) + UI.  
4. **Screening scales** (definiții + extraction + UI).  
5. **Metrici vorbire** (WPM, pauze) din Deepgram + UI; apoi tangențialitate (LLM).  
6. **Risc suicidar + safety plan.**  
7. **Follow-up calibrat pe medicație.**  
8. **Longitudinal tracking** (stocare scoruri + grafice).

---

---

## 5. Ce e implementat în acest repo (prima tranșă)

- **Criterii DSM-5 structurate:** `src/lib/dsm5-criteria/` — tipuri, F41.1 (GAD), `loadCriteria()`, `validateWithRules()`.
- **API evaluare criterii:** `POST /api/ai/evaluate-criteria` — body: `{ transcript, diagnosis_code }`; returnează evaluare per criteriu, `suggested_questions`, `alerts` (rules engine).
- **AI Assistant orientat psihiatric:** în `src/app/(app)/ai-assistant/page.tsx` — exemple de întrebări psihiatrice (diferential anxietate/insomnie, NICE depresie, echivalență doză, DSM-5 GAD, Maudsley GAD). În `src/app/api/ai/ask/route.ts` — system prompt cu bloc psihiatric (DSM-5/ICD-10, protocoale, scale, follow-up) + bloc țară (guidelines-by-country).

**Următorii pași:** panou UI „DSM-5 Criteria Tracker” în pagina de record (apel periodic la evaluate-criteria + afișare progres); extindere criterii pentru F32.x, F41.0, F43.10 etc.; scale PHQ-9/GAD-7 auto-populate; metrici vorbire (WPM, pauze).

---

*Document creat pentru alinierea implementării la propunerea de copilot psihiatric best-in-class și la arhitectura existentă MedScribe.*
