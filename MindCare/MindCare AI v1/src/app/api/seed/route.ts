import { NextResponse } from "next/server";
import pg from "pg";

/**
 * POST /api/seed
 * Seeds the local PostgreSQL with comprehensive psychiatric demo data.
 * All content in English.
 * ⚠️ DEMO ONLY
 */

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

function daysAgo(d: number, h = 10, m = 0): string {
  const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}
function hoursAgo(h: number): string { return new Date(Date.now() - h * 3600000).toISOString(); }
function hoursFromNow(h: number): string { return new Date(Date.now() + h * 3600000).toISOString(); }

const ICD = [
  { code: "F32.1", desc: "Major depressive episode, moderate" },
  { code: "F32.2", desc: "Major depressive episode, severe without psychotic features" },
  { code: "F33.0", desc: "Recurrent depressive disorder, mild episode" },
  { code: "F33.1", desc: "Recurrent depressive disorder, moderate episode" },
  { code: "F41.0", desc: "Panic disorder" },
  { code: "F41.1", desc: "Generalized anxiety disorder" },
  { code: "F43.1", desc: "Post-traumatic stress disorder" },
  { code: "F43.2", desc: "Adjustment disorder" },
  { code: "F31.1", desc: "Bipolar disorder, manic episode" },
  { code: "F31.3", desc: "Bipolar disorder, depressive episode" },
  { code: "F20.0", desc: "Paranoid schizophrenia" },
  { code: "F40.1", desc: "Social phobia" },
  { code: "F42.0", desc: "Obsessive-compulsive disorder" },
  { code: "F50.0", desc: "Anorexia nervosa" },
  { code: "F50.2", desc: "Bulimia nervosa" },
  { code: "F10.2", desc: "Alcohol dependence syndrome" },
  { code: "F90.0", desc: "Attention deficit hyperactivity disorder" },
  { code: "F60.3", desc: "Borderline personality disorder" },
  { code: "F51.0", desc: "Nonorganic insomnia" },
  { code: "F44.0", desc: "Dissociative amnesia" },
];

const PATIENTS = [
  { name: "James Hartley", mrn: "PSY-001", dob: "1985-03-15", gender: "male", dx: "Recurrent depression", risk: "watch" },
  { name: "Charlotte Beaumont", mrn: "PSY-002", dob: "1972-08-22", gender: "female", dx: "Generalized anxiety disorder", risk: "normal" },
  { name: "Raj Patel", mrn: "PSY-003", dob: "1990-11-07", gender: "male", dx: "Post-traumatic stress disorder", risk: "at_risk" },
  { name: "Fiona Gallagher", mrn: "PSY-004", dob: "1968-01-30", gender: "female", dx: "Bipolar disorder type I", risk: "at_risk" },
  { name: "Liam Nakamura", mrn: "PSY-005", dob: "1995-06-12", gender: "male", dx: "Adult ADHD", risk: "normal" },
  { name: "Isabelle Moreau", mrn: "PSY-006", dob: "2001-09-25", gender: "female", dx: "Panic disorder", risk: "watch" },
  { name: "William Ashworth", mrn: "PSY-007", dob: "1958-04-18", gender: "male", dx: "Paranoid schizophrenia", risk: "at_risk" },
  { name: "Amara Okonkwo", mrn: "PSY-008", dob: "1983-12-03", gender: "female", dx: "Obsessive-compulsive disorder", risk: "normal" },
  { name: "Oliver Brennan", mrn: "PSY-009", dob: "1977-07-14", gender: "male", dx: "Alcohol dependence", risk: "at_risk" },
  { name: "Sofia Lindberg", mrn: "PSY-010", dob: "1993-02-28", gender: "female", dx: "Anorexia nervosa", risk: "at_risk" },
  { name: "Thomas Whitmore", mrn: "PSY-011", dob: "1988-10-05", gender: "male", dx: "Major depressive disorder", risk: "watch" },
  { name: "Priya Sharma", mrn: "PSY-012", dob: "1975-05-19", gender: "female", dx: "Chronic insomnia", risk: "normal" },
  { name: "Sebastian Kohl", mrn: "PSY-013", dob: "1999-01-11", gender: "male", dx: "Social phobia", risk: "normal" },
  { name: "Emma Fitzgerald", mrn: "PSY-014", dob: "1980-06-08", gender: "female", dx: "Borderline personality disorder", risk: "at_risk" },
  { name: "Henry Blackwood", mrn: "PSY-015", dob: "1962-11-23", gender: "male", dx: "Depression with anxiety", risk: "watch" },
  { name: "Yuki Tanaka", mrn: "PSY-016", dob: "1997-04-02", gender: "female", dx: "Bulimia nervosa", risk: "watch" },
  { name: "Marcus O'Brien", mrn: "PSY-017", dob: "1986-09-30", gender: "male", dx: "Adjustment disorder", risk: "normal" },
  { name: "Leila Hassan", mrn: "PSY-018", dob: "1970-12-17", gender: "female", dx: "Bipolar disorder type II", risk: "watch" },
  { name: "Ethan Kingsley", mrn: "PSY-019", dob: "2003-03-06", gender: "male", dx: "Combined ADHD", risk: "normal" },
  { name: "Margaret Chen", mrn: "PSY-020", dob: "1965-08-14", gender: "female", dx: "Severe depression", risk: "at_risk" },
  { name: "Declan Murray", mrn: "PSY-021", dob: "1991-05-22", gender: "male", dx: "Dissociative amnesia", risk: "watch" },
  { name: "Hannah Worthington", mrn: "PSY-022", dob: "1984-07-09", gender: "female", dx: "Generalized anxiety disorder", risk: "normal" },
  { name: "André Dubois", mrn: "PSY-023", dob: "1978-02-01", gender: "male", dx: "Post-traumatic depression", risk: "watch" },
  { name: "Natasha Volkov", mrn: "PSY-024", dob: "1996-10-28", gender: "female", dx: "Panic disorder with agoraphobia", risk: "watch" },
  { name: "Edward Pemberton", mrn: "PSY-025", dob: "1955-06-15", gender: "male", dx: "Dementia with anxiety", risk: "at_risk" },
  { name: "Aisha Diallo", mrn: "PSY-026", dob: "2000-01-20", gender: "female", dx: "Reactive depression", risk: "normal" },
  { name: "Noah Eriksson", mrn: "PSY-027", dob: "1987-11-13", gender: "male", dx: "Treatment-resistant OCD", risk: "watch" },
  { name: "Clara Montague", mrn: "PSY-028", dob: "1974-04-25", gender: "female", dx: "Complex PTSD", risk: "at_risk" },
  { name: "Daniel Kim", mrn: "PSY-029", dob: "1992-08-07", gender: "male", dx: "Schizoaffective disorder", risk: "at_risk" },
  { name: "Zara Kensington", mrn: "PSY-030", dob: "1981-03-31", gender: "female", dx: "Burnout with depression", risk: "watch" },
];

export async function POST() {
  const pool = new pg.Pool({
    connectionString: process.env.LOCAL_DATABASE_URL || "postgresql://bot@localhost:5432/mindcare",
  });

  try {
    // Clean existing data
    await pool.query("DELETE FROM audit_log");
    await pool.query("DELETE FROM clinical_notes");
    await pool.query("DELETE FROM transcripts");
    await pool.query("DELETE FROM consultations");
    await pool.query("DELETE FROM patients");
    await pool.query("DELETE FROM note_templates WHERE user_id = $1", [DEMO_USER_ID]);
    await pool.query("DELETE FROM users WHERE id = $1", [DEMO_USER_ID]);

    // 1. Create demo psychiatrist (with auth credentials: demo@mindcare.ai / demo123)
    const bcrypt = await import("bcryptjs");
    const demoPasswordHash = await bcrypt.hash("demo123", 12);
    await pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, specialty, license_number, role, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [DEMO_USER_ID, "Dr. Maria Ionescu", "demo@mindcare.ai", demoPasswordHash, "psychiatry", "PSY-2024-1234", "clinician",
       JSON.stringify({ audio_quality: "high", silence_threshold: 3, theme: "light", default_visit_type: "New Patient" })]
    );

    // 2. Create 30 patients
    const patientIds: string[] = [];
    for (const p of PATIENTS) {
      const res = await pool.query(
        `INSERT INTO patients (user_id, full_name, mrn, date_of_birth, gender, contact_info)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [DEMO_USER_ID, p.name, p.mrn, p.dob, p.gender,
         JSON.stringify({ phone: `+1 (${200 + Math.floor(Math.random() * 800)}) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}` })]
      );
      patientIds.push(res.rows[0].id);
    }

    // 3. Psychiatric templates
    const tplRes = await pool.query(
      `INSERT INTO note_templates (user_id, name, description, specialty, is_system, is_published, sections) VALUES
       ($1, 'Initial Psychiatric Evaluation', 'Comprehensive new patient assessment', 'psychiatry', false, true, $2),
       ($1, 'Psychotherapy Session', 'CBT session documentation', 'psychiatry', false, true, $3)
       RETURNING id`,
      [DEMO_USER_ID,
       JSON.stringify([
         { id: "chief", title: "Chief Complaint", prompt: "Reason for evaluation", example: "Patient presents with...", order: 1 },
         { id: "hpi", title: "History of Present Illness", prompt: "Timeline of symptoms", example: "Onset approximately 6 months ago...", order: 2 },
         { id: "mse", title: "Mental Status Examination", prompt: "Current mental state", example: "Alert, cooperative...", order: 3 },
         { id: "assessment", title: "Diagnostic Impression", prompt: "ICD-10/DSM-5 diagnosis", example: "F32.1...", order: 4 },
         { id: "plan", title: "Treatment Plan", prompt: "Medication, psychotherapy", example: "1. Sertraline 50mg...", order: 5 },
       ]),
       JSON.stringify([
         { id: "goals", title: "Session Goals", prompt: "Planned objectives", example: "Explore automatic thoughts...", order: 1 },
         { id: "content", title: "Session Content", prompt: "Summary of discussion", example: "Identified cognitive distortions...", order: 2 },
         { id: "interventions", title: "Interventions", prompt: "Techniques used", example: "Cognitive restructuring...", order: 3 },
         { id: "progress", title: "Progress", prompt: "Progress assessment", example: "Patient demonstrates...", order: 4 },
       ]),
      ]
    );
    const templateIds = tplRes.rows.map((r: { id: string }) => r.id);

    // System template
    await pool.query(`INSERT INTO note_templates (name, description, specialty, is_system, sections) VALUES
      ('SOAP Note', 'Standard SOAP format', 'general', true, $1)
      ON CONFLICT DO NOTHING`,
      [JSON.stringify([
        { id: "subjective", title: "Subjective", prompt: "Chief complaint, HPI", example: "Patient presents...", order: 1 },
        { id: "objective", title: "Objective", prompt: "Physical exam, vitals", example: "Vitals: BP 120/80...", order: 2 },
        { id: "assessment", title: "Assessment", prompt: "Diagnoses", example: "1. Acute bronchitis...", order: 3 },
        { id: "plan", title: "Plan", prompt: "Treatment plan", example: "1. Prescribed...", order: 4 },
      ])]
    );

    // Romanian medical consultation form template
    await pool.query(
      `INSERT INTO note_templates (user_id, name, description, specialty, is_system, is_published, sections) VALUES
       ($1, 'Fișă de Consultații Medicale - Adulți', 'Fișa standard de consultații medicale conform modelului românesc', 'Psihiatrie', false, true, $2)`,
      [DEMO_USER_ID, JSON.stringify([
        {
          id: "date_administrative", title: "Date Administrative", order: 1,
          prompt: "Datele administrative ale consultației",
          fields: [
            { id: "judetul", label: "Județul", type: "text" },
            { id: "localitatea", label: "Localitatea", type: "text" },
            { id: "unitatea_sanitara", label: "Unitatea sanitară", type: "text" },
            { id: "cnp", label: "CNP", type: "text" },
            { id: "carnet_cas_seria", label: "Carnet CAS - Seria", type: "text" },
            { id: "adeverinta_med_fam", label: "Adeverință med. fam. de asigurare", type: "text" },
          ],
        },
        {
          id: "date_pacient", title: "Date Pacient", order: 2,
          prompt: "Datele de identificare ale pacientului",
          fields: [
            { id: "numele", label: "Numele", type: "text" },
            { id: "prenumele", label: "Prenumele", type: "text" },
            { id: "sexul", label: "Sexul", type: "select", options: ["M", "F"] },
            { id: "data_nasterii", label: "Data nașterii", type: "date" },
            { id: "starea_civila", label: "Starea civilă", type: "text" },
            { id: "domiciliul_localitatea", label: "Domiciliul: localitatea", type: "text" },
            { id: "domiciliul_str", label: "Domiciliul: str.", type: "text" },
            { id: "domiciliul_nr", label: "Domiciliul: nr.", type: "text" },
            { id: "ocupatia", label: "Ocupația", type: "text" },
            { id: "intreprinderea", label: "Întreprinderea/Instituția", type: "text" },
          ],
        },
        {
          id: "schimbari", title: "Schimbări", order: 3,
          prompt: "Schimbări de domiciliu și loc de muncă",
          fields: [
            { id: "schimbari_domiciliu", label: "Schimbări de domiciliu", type: "textarea" },
            { id: "schimbari_loc_munca", label: "Schimbări de loc de muncă", type: "textarea" },
          ],
        },
        {
          id: "antecedente", title: "Antecedente", order: 4,
          prompt: "Antecedente medicale ale pacientului",
          fields: [
            { id: "antecedente_heredo", label: "Antecedente heredo-colaterale", type: "textarea" },
            { id: "antecedente_personale", label: "Antecedente personale", type: "textarea" },
            { id: "conditii_munca", label: "Condiții de muncă", type: "textarea" },
          ],
        },
        {
          id: "consultatii_investigatii", title: "Consultații, Investigații", order: 5,
          prompt: "Înregistrarea consultațiilor și investigațiilor",
          repeatable: true,
          fields: [
            { id: "data_consultatie", label: "Data (anul/luna/ziua)", type: "date" },
            { id: "simptome", label: "Simptome", type: "textarea" },
            { id: "diagnostic", label: "Diagnostic", type: "textarea" },
            { id: "cod_icd10", label: "Cod", type: "text", description: "Cod ICD-10" },
            { id: "prescriptii", label: "Prescripții / Recomandări", type: "textarea" },
            { id: "nr_zile_concediu", label: "Nr. zile concediu medical", type: "number" },
            { id: "nr_certificat", label: "Nr. certificat", type: "text" },
          ],
        },
      ])]
    );

    // 4. Consultations
    interface CDef { pi: number; vt: string; st: string; ts: string; dur: number | null; icd: number; risk: string; }
    const C: CDef[] = [
      // Today (5)
      { pi: 0, vt: "Follow-up Visit", st: "finalized", ts: hoursAgo(6), dur: 2700, icd: 0, risk: "watch" },
      { pi: 5, vt: "New Patient", st: "note_generated", ts: hoursAgo(4), dur: 3200, icd: 4, risk: "watch" },
      { pi: 2, vt: "New Patient", st: "transcribed", ts: hoursAgo(2), dur: 2400, icd: 6, risk: "at_risk" },
      { pi: 9, vt: "Follow-up Visit", st: "scheduled", ts: hoursFromNow(1), dur: null, icd: 13, risk: "at_risk" },
      { pi: 13, vt: "New Patient", st: "scheduled", ts: hoursFromNow(3), dur: null, icd: 17, risk: "at_risk" },
      // Yesterday (4)
      { pi: 1, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(1, 9), dur: 1800, icd: 5, risk: "normal" },
      { pi: 3, vt: "New Patient", st: "finalized", ts: daysAgo(1, 10, 30), dur: 3600, icd: 8, risk: "at_risk" },
      { pi: 7, vt: "New Patient", st: "reviewed", ts: daysAgo(1, 14), dur: 2700, icd: 12, risk: "normal" },
      { pi: 10, vt: "Follow-up Visit", st: "note_generated", ts: daysAgo(1, 16), dur: 1500, icd: 0, risk: "watch" },
      // 2-3 days ago (5)
      { pi: 4, vt: "New Patient", st: "finalized", ts: daysAgo(2, 9, 30), dur: 3900, icd: 16, risk: "normal" },
      { pi: 14, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(2, 11), dur: 2100, icd: 2, risk: "watch" },
      { pi: 11, vt: "New Patient", st: "finalized", ts: daysAgo(2, 14, 30), dur: 2400, icd: 18, risk: "normal" },
      { pi: 6, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(3, 10), dur: 4200, icd: 10, risk: "at_risk" },
      { pi: 15, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(3, 13), dur: 1800, icd: 14, risk: "watch" },
      // 4-5 days ago (4)
      { pi: 8, vt: "New Patient", st: "finalized", ts: daysAgo(4, 9), dur: 3000, icd: 15, risk: "at_risk" },
      { pi: 17, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(4, 11, 30), dur: 2100, icd: 9, risk: "watch" },
      { pi: 12, vt: "New Patient", st: "finalized", ts: daysAgo(5, 10), dur: 3600, icd: 11, risk: "normal" },
      { pi: 19, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(5, 14), dur: 3900, icd: 1, risk: "at_risk" },
      // Week 2 (8)
      { pi: 0, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(7, 9), dur: 2400, icd: 0, risk: "watch" },
      { pi: 20, vt: "New Patient", st: "finalized", ts: daysAgo(7, 11), dur: 3600, icd: 19, risk: "watch" },
      { pi: 16, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(8, 15), dur: 1500, icd: 7, risk: "normal" },
      { pi: 21, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(8, 10), dur: 1800, icd: 5, risk: "normal" },
      { pi: 22, vt: "New Patient", st: "finalized", ts: daysAgo(9, 9, 30), dur: 3000, icd: 6, risk: "watch" },
      { pi: 23, vt: "New Patient", st: "finalized", ts: daysAgo(10, 10), dur: 3900, icd: 4, risk: "watch" },
      { pi: 24, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(11, 9), dur: 4500, icd: 3, risk: "at_risk" },
      { pi: 3, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(12, 14), dur: 2100, icd: 8, risk: "at_risk" },
      // Week 3 (7)
      { pi: 25, vt: "New Patient", st: "finalized", ts: daysAgo(14, 9), dur: 3300, icd: 7, risk: "normal" },
      { pi: 26, vt: "New Patient", st: "finalized", ts: daysAgo(14, 11), dur: 3600, icd: 12, risk: "watch" },
      { pi: 27, vt: "New Patient", st: "finalized", ts: daysAgo(15, 10), dur: 2700, icd: 6, risk: "at_risk" },
      { pi: 28, vt: "New Patient", st: "finalized", ts: daysAgo(16, 9, 30), dur: 4200, icd: 10, risk: "at_risk" },
      { pi: 29, vt: "New Patient", st: "finalized", ts: daysAgo(17, 10), dur: 3000, icd: 2, risk: "watch" },
      { pi: 1, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(18, 14), dur: 1800, icd: 5, risk: "normal" },
      { pi: 5, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(19, 9), dur: 2400, icd: 4, risk: "normal" },
      // Week 4 (7)
      { pi: 0, vt: "New Patient", st: "finalized", ts: daysAgo(21, 9), dur: 3900, icd: 0, risk: "normal" },
      { pi: 7, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(22, 10, 30), dur: 2100, icd: 12, risk: "normal" },
      { pi: 9, vt: "New Patient", st: "finalized", ts: daysAgo(23, 9), dur: 4200, icd: 13, risk: "at_risk" },
      { pi: 10, vt: "New Patient", st: "finalized", ts: daysAgo(24, 11), dur: 3600, icd: 0, risk: "normal" },
      { pi: 6, vt: "Follow-up Visit", st: "finalized", ts: daysAgo(25, 14), dur: 2700, icd: 10, risk: "at_risk" },
      { pi: 14, vt: "New Patient", st: "finalized", ts: daysAgo(26, 10), dur: 3600, icd: 2, risk: "watch" },
      { pi: 8, vt: "New Patient", st: "finalized", ts: daysAgo(28, 9, 30), dur: 4500, icd: 15, risk: "at_risk" },
    ];

    const consultationIds: string[] = [];
    for (const c of C) {
      const p = PATIENTS[c.pi];
      const icd = ICD[c.icd];
      const meta = JSON.stringify({
        patient_name: p.name, patient_code: p.mrn, diagnosis: p.dx,
        icd_code: icd.code, risk_status: c.risk,
      });

      const res = await pool.query(
        `INSERT INTO consultations (user_id, patient_id, visit_type, status, consent_given, consent_timestamp, recording_duration_seconds, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [DEMO_USER_ID, patientIds[c.pi], c.vt, c.st, c.st !== "scheduled", c.st !== "scheduled" ? c.ts : null, c.dur, meta, c.ts]
      );
      consultationIds.push(res.rows[0].id);
    }

    // 5. Transcripts + Clinical Notes
    let noteCount = 0, transcriptCount = 0;

    const transcriptTexts = [
      (n: string, dx: string) => [
        `[Doctor]: Good morning, ${n}. Please have a seat. How have you been feeling since our last session?`,
        `[Patient]: Thank you, doctor. It's been a mixed couple of weeks, honestly. The ${dx} has been affecting me quite a bit.`,
        `[Doctor]: I'm sorry to hear that. Can you tell me more about what's been happening? Walk me through a typical day.`,
        `[Patient]: Well, I wake up around 5 or 6 AM, often before my alarm. There's this immediate heaviness, like a weight on my chest. It takes me about an hour just to get out of bed.`,
        `[Doctor]: And once you're up, how does the rest of the day unfold?`,
        `[Patient]: Mornings are the worst. I can barely focus at work. By afternoon it lifts a little, but then the anxiety kicks in about the next morning.`,
        `[Doctor]: That morning-evening pattern is actually quite common with this condition. Have you noticed any changes in your appetite or eating habits?`,
        `[Patient]: I've lost about 8 pounds in the last month. I just don't feel hungry. My partner has been worried about it.`,
        `[Doctor]: That's significant. What about sleep quality? Last time we talked about the fragmented sleep.`,
        `[Patient]: Still waking up at 3 or 4 AM. Sometimes I can fall back asleep, but most nights I just lie there with racing thoughts.`,
        `[Doctor]: What kind of thoughts tend to come up during those early morning hours?`,
        `[Patient]: Mostly about work, about whether I'm a burden to my family. Sometimes I wonder if things will ever get better.`,
        `[Doctor]: I want to ask you directly — have you had any thoughts of harming yourself or not wanting to be alive?`,
        `[Patient]: No, nothing like that. I want things to get better. I just feel stuck sometimes.`,
        `[Doctor]: I'm glad you told me that. It's important we monitor this closely. How has the medication been working for you?`,
        `[Patient]: I think it helps a little with the worst of it, but the side effects — the dry mouth and the drowsiness — they're bothersome.`,
        `[Doctor]: Those are common in the first few weeks. They usually diminish over time. Have you been taking it consistently?`,
        `[Patient]: Yes, every morning with breakfast, like you said.`,
        `[Doctor]: Good. And the thought journal we discussed — have you been able to use it?`,
        `[Patient]: I tried a few times. It does help me see patterns when I write things down. But I'm not doing it every day.`,
        `[Doctor]: Even a few times a week is progress. Let's review what you've written and build on it. I'd also like to adjust your medication slightly.`,
        `[Patient]: Okay. I trust your judgment on that. What are you thinking?`,
        `[Doctor]: I'd like to increase the dose gradually and add a short-term sleep aid. We'll reassess in two weeks. Does that sound reasonable?`,
        `[Patient]: Yes, that sounds good. Thank you for listening, doctor.`,
      ].join("\n"),
      (n: string, dx: string) => [
        `[Doctor]: Hello, ${n}. Come on in. How has this past week been for you?`,
        `[Patient]: Better, actually. I've had a few good days in a row, which hasn't happened in a while.`,
        `[Doctor]: That's wonderful to hear. Tell me about those good days — what made them different?`,
        `[Patient]: I think the medication adjustment is working. I'm sleeping through the night more often now, maybe 5 out of 7 nights.`,
        `[Doctor]: Excellent. And on the mornings after a good night's sleep, how do you feel?`,
        `[Patient]: More like myself. I actually cooked breakfast twice this week, which my family noticed and appreciated.`,
        `[Doctor]: Those small victories matter enormously. On a scale from 1 to 10, with 10 being your best, where would you place yourself this week?`,
        `[Patient]: I'd say about a 6, maybe even a 7 on the good days. When I started coming here, I was at a 2 or 3.`,
        `[Doctor]: That's meaningful progress, ${n}. How about your social life? Last time you mentioned avoiding friends.`,
        `[Patient]: I went to coffee with a colleague on Thursday. It was awkward at first, but it felt good to be out. I've also been walking in the park.`,
        `[Doctor]: Physical activity and social connection — both are excellent for recovery. Any side effects from the new dosage?`,
        `[Patient]: The dry mouth is mostly gone. I still feel a bit drowsy in the mornings, but nothing like before.`,
        `[Doctor]: Good, that should continue to improve. Let's talk about your cognitive behavioral work. Have you been practicing the thought challenging?`,
        `[Patient]: Yes. I caught myself catastrophizing on Tuesday — I got negative feedback at work and my first thought was 'I'm going to get fired.' But then I stopped and asked myself, is that actually likely?`,
        `[Doctor]: And what was the answer?`,
        `[Patient]: That one piece of criticism doesn't mean I'm failing. My boss actually said the rest of my work was solid.`,
        `[Doctor]: That's textbook cognitive restructuring. You're building a very important skill. How did it feel to challenge that thought?`,
        `[Patient]: Relieving, honestly. Like I could breathe again.`,
        `[Doctor]: Let's keep this momentum going. I want to maintain the current medication and continue weekly sessions. We'll add some behavioral activation homework.`,
        `[Patient]: I'm ready for that. Thank you, doctor.`,
      ].join("\n"),
      (n: string, dx: string) => [
        `[Doctor]: ${n}, welcome. This is your initial psychiatric evaluation. I've reviewed the referral from your primary care physician. Please tell me in your own words what brings you here today.`,
        `[Patient]: Thank you, doctor. I've been struggling with ${dx} for about four months now, and it's gotten to the point where it's affecting my work and relationships.`,
        `[Doctor]: I'm sorry you're going through this. Can you describe when you first noticed something was wrong?`,
        `[Patient]: It started after a major life change — I moved to a new city for work. At first I thought it was just adjustment, but it kept getting worse.`,
        `[Doctor]: What specific symptoms have you been experiencing?`,
        `[Patient]: The episodes come out of nowhere. My heart starts racing, I get sweaty, my hands shake, and I feel like I can't breathe. Sometimes I think I'm having a heart attack.`,
        `[Doctor]: How often are these episodes occurring?`,
        `[Patient]: At least three or four times a week now. Last month it was maybe once a week.`,
        `[Doctor]: And how long does a typical episode last?`,
        `[Patient]: The worst of it is about 10 to 15 minutes, but I feel drained and on edge for hours afterward.`,
        `[Doctor]: Are there specific situations that trigger them, or do they seem random?`,
        `[Patient]: Some are random, like I'll be sitting at my desk and it just hits. But crowded places are a guaranteed trigger — the subway, shopping malls, even busy restaurants.`,
        `[Doctor]: Have you started avoiding those places?`,
        `[Patient]: Yes. I've basically stopped taking the subway. I drive everywhere now, even though parking is expensive. And I haven't been to a restaurant in two months.`,
        `[Doctor]: I understand. Let me ask about your family history. Is there anyone in your family with similar symptoms or mental health conditions?`,
        `[Patient]: My mother has anxiety, and my grandfather had what they used to call 'nervous breakdowns.' I'm not sure of the actual diagnosis.`,
        `[Doctor]: That's helpful context. Have you tried any medications or therapy before?`,
        `[Patient]: My GP gave me some benzodiazepines for emergencies, but I'm scared of becoming dependent. I haven't tried therapy.`,
        `[Doctor]: That's a valid concern, and we'll discuss medication options carefully. I'd also like to do a quick physical assessment. Any other medical conditions I should know about?`,
        `[Patient]: Mild asthma, but it's well-controlled. No other conditions.`,
        `[Doctor]: Based on everything you've described, including the frequency, the physical symptoms, the avoidance behavior, and the family history, this presentation is consistent with ${dx}. The good news is that this is highly treatable.`,
        `[Patient]: That's actually a relief to hear. I was afraid something was seriously wrong with me.`,
        `[Doctor]: Let me outline a treatment plan. I'd like to start you on an SSRI, which is first-line treatment. We'll combine that with cognitive behavioral therapy. I'll also teach you some breathing techniques you can use during episodes.`,
        `[Patient]: That sounds like a plan. When can we start?`,
      ].join("\n"),
      (n: string, dx: string) => [
        `[Doctor]: Good to see you, ${n}. How has your week been?`,
        `[Patient]: It's been challenging, doctor. I had a significant episode on Wednesday that I want to talk about.`,
        `[Doctor]: Absolutely. Tell me what happened.`,
        `[Patient]: I got into an argument with my sister about family responsibilities. It escalated quickly, and I said some things I regret.`,
        `[Doctor]: What triggered the escalation?`,
        `[Patient]: She said I wasn't pulling my weight with caring for our parents. And I just... snapped. Felt this overwhelming rage mixed with guilt.`,
        `[Doctor]: What thoughts were going through your mind during the argument?`,
        `[Patient]: That I'm worthless, that everyone sees me as a failure, that she's right and I don't deserve to be part of this family.`,
        `[Doctor]: Can you identify the cognitive distortion in those thoughts?`,
        `[Patient]: I think it's the all-or-nothing thinking again. And maybe mind reading — assuming I know what everyone thinks of me.`,
        `[Doctor]: Excellent identification. You're getting much better at recognizing these patterns. What happened after the argument?`,
        `[Patient]: I isolated myself for the rest of the day. Didn't eat. Couldn't sleep. But the next morning, I tried the technique you taught me — writing down the thought, the evidence for and against it.`,
        `[Doctor]: And what did you find?`,
        `[Patient]: That my sister was stressed too. That I actually do help with our parents in other ways she might not see. That one argument doesn't define our relationship.`,
        `[Doctor]: That's really strong work, ${n}. How did you feel after that exercise?`,
        `[Patient]: Better. Not great, but like I could see things more clearly. I called my sister the next day and we talked it out. She apologized too.`,
        `[Doctor]: That's a huge step — the repair after conflict is just as important as managing the initial reaction. Have you been using the mood tracking app we discussed?`,
        `[Patient]: Yes, I've been logging every day. I can see the pattern — my mood dips on days when I don't exercise or when I skip meals.`,
        `[Doctor]: Those connections between physical self-care and mood are so important. Let's set some specific goals for this coming week around those patterns.`,
        `[Patient]: I'd like that. I want to be more proactive rather than just reacting to crises.`,
        `[Doctor]: We'll work on a structured daily routine. I also want to introduce a mindfulness exercise that can help in those high-emotion moments before they escalate.`,
      ].join("\n"),
      (n: string, dx: string) => [
        `[Doctor]: ${n}, welcome back. It's been two weeks since our last appointment. How have things been going?`,
        `[Patient]: Overall, I think things are improving. I want to start with some positive news — I attended the support group you recommended.`,
        `[Doctor]: That's a big step! How was the experience?`,
        `[Patient]: Terrifying at first, honestly. I almost turned around in the parking lot. But once people started sharing, I realized I'm not alone in this.`,
        `[Doctor]: That normalization can be incredibly powerful. Did you share anything yourself?`,
        `[Patient]: Not the first time. But I went again last Thursday and I talked a little about my experience. People were really supportive.`,
        `[Doctor]: That takes real courage. How has the medication been? Any changes since we adjusted the dose?`,
        `[Patient]: The new dose is definitely better. I'm sleeping more soundly — getting 7 hours most nights now, compared to 4 or 5 before.`,
        `[Doctor]: That's a significant improvement. Sleep is foundational to everything else. Have you noticed any side effects with the higher dose?`,
        `[Patient]: Some mild nausea in the first few days, but it passed. I do feel slightly more sedated in the evenings, but honestly that helps with sleep.`,
        `[Doctor]: Good. And the ${dx} symptoms specifically — how would you describe them now versus a month ago?`,
        `[Patient]: The intensity has definitely decreased. I still have bad moments, but they're moments, not entire days anymore.`,
        `[Doctor]: That distinction between moments and days is really important progress. Any concerning symptoms I should know about? Any unusual thoughts or perceptions?`,
        `[Patient]: No, nothing like that. My thinking feels clearer actually. I've been able to concentrate at work much better.`,
        `[Doctor]: Wonderful. Let's keep the current regimen going. I'd like to add some psychoeducation about your condition — understanding the neurobiology can help reduce self-blame.`,
        `[Patient]: I'd really appreciate that. Sometimes I still feel like I should be able to just 'snap out of it.'`,
        `[Doctor]: That's one of the most harmful myths about mental health conditions. This is a real medical condition with neurobiological underpinnings. You wouldn't tell someone with diabetes to just 'snap out of it.'`,
        `[Patient]: When you put it that way, it makes sense. Thank you, doctor. Same time in two weeks?`,
        `[Doctor]: Yes. And keep going to that support group — it's clearly helping. Great work, ${n}.`,
      ].join("\n"),
    ];

    const meds = ["Sertraline 100mg daily", "Escitalopram 10mg daily", "Venlafaxine 75mg twice daily", "Duloxetine 60mg daily", "Quetiapine 200mg at bedtime", "Olanzapine 10mg daily", "Aripiprazole 15mg daily", "Lamotrigine 100mg daily"];
    const adjunctMeds = ["Hydroxyzine 25mg PRN for anxiety", "Trazodone 50mg at bedtime for sleep", "Buspirone 10mg twice daily", "Melatonin 3mg at bedtime", "Propranolol 20mg PRN for performance anxiety", "Clonazepam 0.5mg PRN (limited supply)"];
    const cptCodes = [
      { code: "90834", desc: "Individual psychotherapy, 45 min" },
      { code: "90837", desc: "Individual psychotherapy, 60 min" },
      { code: "99214", desc: "Office visit, moderate complexity" },
      { code: "99215", desc: "Office visit, high complexity" },
      { code: "90792", desc: "Psychiatric diagnostic evaluation" },
      { code: "90833", desc: "Psychotherapy add-on, 30 min" },
    ];

    for (let i = 0; i < C.length; i++) {
      const c = C[i];
      const cId = consultationIds[i];
      const p = PATIENTS[c.pi];
      const icd = ICD[c.icd];

      if (c.st !== "scheduled") {
        const txt = transcriptTexts[i % transcriptTexts.length](p.name.split(" ")[0], p.dx);
        const segs = txt.split("\n").filter(Boolean).map((line, idx) => ({
          speaker: line.startsWith("[Doctor]") ? "doctor" : "patient",
          text: line.replace(/^\[(Doctor|Patient)\]:\s*/, ""),
          start_time: idx * 12.5, end_time: (idx + 1) * 12.5 - 0.8,
          confidence: 0.90 + Math.random() * 0.08,
        }));

        await pool.query(
          `INSERT INTO transcripts (consultation_id, full_text, segments, language, provider)
           VALUES ($1, $2, $3, $4, $5)`,
          [cId, txt, JSON.stringify(segs), "en", "deepgram"]
        );
        transcriptCount++;
      }

      if (["finalized", "reviewed", "note_generated"].includes(c.st)) {
        const isNew = c.vt === "New Patient";
        const isSpecialist = c.vt === "Follow-up Visit";
        const isTelehealth = c.vt === "Follow-up Visit";
        const med1 = meds[i % meds.length];
        const med2 = adjunctMeds[i % adjunctMeds.length];

        const sections = [
          {
            title: "Chief Complaint",
            content: isNew
              ? `${p.name} is a ${new Date().getFullYear() - parseInt(p.dob.substring(0, 4))}-year-old ${p.gender} presenting for initial psychiatric evaluation. Patient was referred by primary care physician for ${p.dx}. Reports progressive worsening of symptoms over the past 3-4 months with significant impact on occupational and social functioning.`
              : `${p.name} presents for ${isTelehealth ? "telehealth " : ""}follow-up regarding ongoing management of ${p.dx} (${icd.code}). Patient reports ${c.risk === "at_risk" ? "worsening symptoms since last visit with new concerning features" : c.risk === "watch" ? "mixed response to current treatment with some improvement and some persistent symptoms" : "continued improvement on current treatment regimen"}.`,
            order: 0,
          },
          {
            title: "History of Present Illness",
            content: isNew
              ? `Patient describes onset of ${p.dx} approximately 4 months ago following a significant life stressor. Symptoms include ${icd.code.startsWith("F32") || icd.code.startsWith("F33") ? "persistent low mood, anhedonia, decreased energy, poor concentration, disrupted sleep (early morning awakening at 3-4 AM), decreased appetite with 8-lb weight loss, feelings of worthlessness and guilt" : icd.code.startsWith("F41") ? "excessive worry about multiple domains, muscle tension, restlessness, difficulty concentrating, irritability, and sleep-onset insomnia" : icd.code.startsWith("F43") ? "intrusive memories, hypervigilance, avoidance of trauma-related stimuli, emotional numbing, difficulty sleeping, and exaggerated startle response" : `symptoms consistent with ${p.dx} including mood disturbance, functional impairment, and cognitive symptoms`}.\n\nPrevious psychiatric history: ${isNew ? "No prior psychiatric treatment" : "Established patient under care since initial evaluation"}. Family history significant for anxiety (mother) and possible mood disorder (maternal grandfather). No prior hospitalizations. Denies history of self-harm or suicide attempts.\n\nSubstance use: ${c.icd === 15 ? "Reports daily alcohol consumption, approximately 4-6 drinks per evening. Last drink yesterday evening." : "Denies current alcohol or substance misuse. Social alcohol use only (1-2 drinks per week)."}`
              : `Since last visit ${c.risk === "at_risk" ? "2 weeks" : "3 weeks"} ago, patient reports: ${c.risk === "at_risk" ? "Worsening depressive symptoms with increased sleep disruption (sleeping only 3-4 hours), decreased appetite, social withdrawal, and difficulty maintaining work performance. Reports one significant interpersonal conflict this week that exacerbated symptoms. Passive suicidal ideation has emerged ('wondering if things will ever get better') but denies active plan or intent." : c.risk === "watch" ? "Partial improvement in symptoms. Sleep has improved somewhat (5-6 hours vs. 4 previously). Appetite remains decreased. Reports using cognitive behavioral techniques intermittently with some success. Attended one social engagement this week. Continues to have difficulty with concentration at work." : "Steady improvement across all symptom domains. Sleep normalized to 7 hours nightly. Appetite and energy improving. Successfully returned to regular social activities. Using cognitive restructuring techniques consistently. Reports overall mood improvement from 3/10 to 6-7/10."}\n\nMedication adherence: ${c.risk === "at_risk" ? "Reports taking medication as prescribed but questions efficacy at current dose." : "Good adherence to prescribed regimen. Taking ${med1} consistently."}`,
            order: 1,
          },
          {
            title: "Mental Status Examination",
            content: `Appearance: ${c.risk === "at_risk" ? "Appears fatigued with mild psychomotor retardation. Dressed appropriately but with less attention to grooming than previous visits." : c.risk === "watch" ? "Appropriately dressed and groomed. Appears mildly tired." : "Well-groomed, dressed appropriately. Appears rested."}\n\nBehavior: ${c.risk === "at_risk" ? "Cooperative but with reduced spontaneity. Limited eye contact. Fidgeting with hands." : "Cooperative and engaged. Good eye contact throughout interview."}\n\nSpeech: ${c.risk === "at_risk" ? "Decreased rate and volume. Latency in responses noted." : "Normal rate, rhythm, and volume. Spontaneous and goal-directed."}\n\nMood: Patient describes mood as "${c.risk === "at_risk" ? "terrible, like I'm drowning" : c.risk === "watch" ? "up and down, mostly down" : "much better, more like myself"}"\n\nAffect: ${c.risk === "at_risk" ? "Constricted range, tearful at times when discussing family relationships. Congruent with stated mood." : c.risk === "watch" ? "Mildly dysphoric with reactive brightening. Full range demonstrated." : "Euthymic and congruent. Full range with appropriate reactivity."}\n\nThought Process: Linear, logical, and goal-directed. No loose associations or tangentiality.\n\nThought Content: ${c.risk === "at_risk" ? "Notable for passive suicidal ideation ('wondering if it's worth it') without active plan, intent, or means. Denies homicidal ideation. Preoccupied with themes of worthlessness and guilt." : "No suicidal or homicidal ideation. No obsessions or compulsions noted beyond baseline."}\n\nPerceptions: No auditory or visual hallucinations. No illusions.\n\nCognition: Alert and oriented x4 (person, place, time, situation). Attention and concentration ${c.risk === "at_risk" ? "mildly impaired — required repetition of questions" : "intact"}. Memory grossly intact.\n\nInsight: ${c.risk === "at_risk" ? "Fair — recognizes need for treatment but struggles with hopelessness" : c.risk === "watch" ? "Good — demonstrates understanding of condition and treatment" : "Good — actively engaged in treatment process"}.\n\nJudgment: ${c.risk === "at_risk" ? "Fair — some impulsive decision-making reported" : "Intact — making appropriate decisions regarding treatment and self-care"}.`,
            order: 2,
          },
          {
            title: "Risk Assessment",
            content: c.risk === "at_risk"
              ? `**Risk Level: ELEVATED**\n\nRisk Factors Present:\n- Passive suicidal ideation (current)\n- Worsening depressive symptoms\n- Social isolation\n- Sleep disruption\n- Family history of mood disorder\n- Recent interpersonal conflict\n\nProtective Factors:\n- Denies active plan, intent, or means\n- Engaged in treatment\n- Supportive partner at home\n- Employment maintained\n- No history of prior attempts\n- No access to lethal means (confirmed)\n\nOverall Risk: Moderate. Patient contracted for safety. Emergency contact information reviewed. Crisis hotline number (988) provided. Close follow-up scheduled within 1 week. Safety plan updated and documented.`
              : c.risk === "watch"
              ? `**Risk Level: LOW-MODERATE**\n\nRisk Factors Present:\n- ${p.dx} (active)\n- Partial treatment response\n- Intermittent sleep disruption\n- Mild social withdrawal\n\nProtective Factors:\n- No suicidal or homicidal ideation\n- Engaged in treatment\n- Intact social support system\n- Employed\n- Using coping strategies\n- Future-oriented thinking\n\nOverall Risk: Low to moderate. Continue current monitoring frequency. Patient aware of crisis resources.`
              : `**Risk Level: LOW**\n\nRisk Factors: ${p.dx} (improving)\n\nProtective Factors:\n- No suicidal or homicidal ideation\n- Strong treatment engagement and medication adherence\n- Robust social support network\n- Returning to baseline functioning\n- Active use of coping skills\n- Future-oriented with goals\n\nOverall Risk: Low. Routine follow-up appropriate.`,
            order: 3,
          },
          {
            title: "Diagnostic Impression",
            content: `Primary Diagnosis:\n${icd.code} — ${icd.desc}\nSeverity: ${c.risk === "at_risk" ? "Severe" : c.risk === "watch" ? "Moderate" : "Mild"}\n\n${(() => { const si = (c.icd + 3 + (i % 5)) % ICD.length; return `Secondary/Comorbid:\n${ICD[si].code} — ${ICD[si].desc} (rule out)`; })()}\n\nGAF Score: ${c.risk === "at_risk" ? "40-45 (serious impairment in social, occupational functioning)" : c.risk === "watch" ? "50-55 (moderate symptoms, moderate difficulty in functioning)" : "60-65 (mild symptoms, generally functioning well)"}\n\nDSM-5 Specifiers: ${icd.code.startsWith("F32") ? "Single episode, " : icd.code.startsWith("F33") ? "Recurrent, " : ""}${c.risk === "at_risk" ? "with anxious distress, with insomnia" : "without psychotic features"}`,
            order: 4,
          },
          {
            title: "Treatment Plan",
            content: `**Pharmacotherapy:**\n1. ${med1} — ${c.risk === "at_risk" ? "increase dose pending tolerability assessment" : "continue current dose"}\n2. ${med2}\n3. ${c.risk === "at_risk" ? "Consider augmentation with " + adjunctMeds[(i + 2) % adjunctMeds.length] + " if no improvement in 2 weeks" : "Continue current adjunct medications as prescribed"}\n\n**Psychotherapy:**\n1. ${isNew ? "Initiate" : "Continue"} individual CBT — ${c.risk === "at_risk" ? "weekly" : "biweekly"} sessions\n2. Focus areas: ${icd.code.startsWith("F32") || icd.code.startsWith("F33") ? "cognitive restructuring, behavioral activation, sleep hygiene" : icd.code.startsWith("F41") ? "worry exposure, relaxation training, cognitive restructuring" : icd.code.startsWith("F43") ? "trauma processing (CPT), grounding techniques, exposure hierarchy" : "symptom management, psychoeducation, coping skills development"}\n3. ${c.risk === "at_risk" ? "Consider referral to intensive outpatient program (IOP) if symptoms do not improve" : "Homework: daily mood tracking, thought records, behavioral activation schedule"}\n\n**Lifestyle Interventions:**\n1. Exercise: 30 minutes moderate activity, 5 days/week\n2. Sleep hygiene: consistent wake/sleep times, no screens 1 hour before bed\n3. ${c.risk !== "normal" ? "Reduce caffeine intake to <200mg/day" : "Maintain current healthy habits"}\n4. ${c.risk === "at_risk" ? "Support group attendance strongly recommended" : "Continue social engagement activities"}\n\n**Labs/Monitoring:**\n- ${isNew ? "Baseline labs: CBC, CMP, TSH, lipid panel, HbA1c" : "Follow-up labs: TSH (due in " + ((i % 3) + 1) + " months)"}\n- ${meds[i % meds.length].includes("Quetiapine") || meds[i % meds.length].includes("Olanzapine") ? "Metabolic monitoring: fasting glucose, lipids at 3 months" : "Routine metabolic monitoring per protocol"}`,
            order: 5,
          },
          {
            title: "Follow-up Instructions",
            content: `1. Next appointment: ${c.risk === "at_risk" ? "1 week" : c.risk === "watch" ? "2 weeks" : "3-4 weeks"}\n2. ${c.risk === "at_risk" ? "Phone check-in with nurse within 48 hours to assess medication tolerance and suicidal ideation" : "Contact office if symptoms worsen before next appointment"}\n3. Emergency instructions: If experiencing crisis, call 988 Suicide & Crisis Lifeline or proceed to nearest emergency department\n4. ${c.risk === "at_risk" ? "Safety plan reviewed and updated. Copy provided to patient and saved in chart." : "Continue using coping strategies discussed in session."}\n5. Prescriptions sent electronically to patient's pharmacy of choice\n6. Patient verbalized understanding of treatment plan and provided informed consent for medication ${c.risk === "at_risk" ? "adjustment" : "continuation"}.`,
            order: 6,
          },
          {
            title: "Session Summary",
            content: isNew
              ? `New patient psychiatric evaluation completed for ${p.name}. ${p.gender === "male" ? "He" : "She"} presents with a 4-month history of ${p.dx} with significant functional impairment. Diagnosis of ${icd.code} (${icd.desc}) established. Treatment initiated with ${med1} and ${med2}. ${isSpecialist ? "Specialist consultation provided with comprehensive diagnostic formulation. Report to be sent to referring physician." : "Psychoeducation provided regarding diagnosis, expected treatment course, and importance of medication adherence."} Patient engaged well and expressed motivation for treatment. ${c.risk === "at_risk" ? "Elevated risk noted — safety plan established and close follow-up arranged." : "Risk assessment unremarkable."} Follow-up in ${c.risk === "at_risk" ? "1 week" : "2-3 weeks"}.\n\nSession duration: ${c.dur ? Math.round(c.dur / 60) : 45} minutes\nModality: ${isTelehealth ? "Telehealth (video)" : "In-person"}\nCollateral: ${c.risk === "at_risk" ? "Spouse contacted with patient consent to discuss safety plan" : "None required at this time"}`
              : `Follow-up session with ${p.name} for ongoing ${p.dx} management. ${c.risk === "at_risk" ? "Patient reports symptom worsening with emergence of passive suicidal ideation. Medication adjustment planned. Safety plan updated. Close follow-up arranged." : c.risk === "watch" ? "Mixed progress reported. Some improvement in sleep and social functioning. Continued difficulty with concentration and energy. Treatment plan maintained with minor adjustments." : "Patient demonstrates continued improvement across symptom domains. Functioning approaching baseline. Current treatment effective."}\n\nKey interventions this session: ${icd.code.startsWith("F32") || icd.code.startsWith("F33") ? "Cognitive restructuring, behavioral activation review, medication management" : icd.code.startsWith("F41") ? "Relaxation training review, worry exposure hierarchy, medication management" : "Symptom management review, psychoeducation, coping skills reinforcement"}\n\nSession duration: ${c.dur ? Math.round(c.dur / 60) : 45} minutes\nModality: ${isTelehealth ? "Telehealth (video)" : "In-person"}\nNext session: ${c.risk === "at_risk" ? "1 week" : c.risk === "watch" ? "2 weeks" : "3 weeks"}`,
            order: 7,
          },
        ];

        const secondIcdIdx = (c.icd + 3 + (i % 5)) % ICD.length;
        const cpt1 = cptCodes[i % cptCodes.length];
        const cpt2 = cptCodes[(i + 1) % cptCodes.length];
        const billingCodes = [
          { code: icd.code, system: "ICD-10", description: icd.desc, confidence: 0.88 + Math.random() * 0.10, rationale: "Primary diagnosis — supported by clinical presentation and MSE findings", accepted: c.st === "finalized" },
          { code: ICD[secondIcdIdx].code, system: "ICD-10", description: ICD[secondIcdIdx].desc, confidence: 0.45 + Math.random() * 0.25, rationale: "Possible comorbid condition — further evaluation recommended", accepted: false },
          { code: "F51.01", system: "ICD-10", description: "Primary insomnia", confidence: c.risk !== "normal" ? 0.6 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2, rationale: "Sleep disturbance reported — may warrant separate coding", accepted: c.st === "finalized" && c.risk !== "normal" },
          { code: cpt1.code, system: "CPT", description: cpt1.desc, confidence: 0.90 + Math.random() * 0.08, rationale: `Primary service — ${c.vt}, ${c.dur ? Math.round(c.dur / 60) + " minutes" : "standard duration"}`, accepted: c.st === "finalized" },
          { code: cpt2.code, system: "CPT", description: cpt2.desc, confidence: 0.55 + Math.random() * 0.3, rationale: "Additional service component — psychotherapy add-on", accepted: false },
          { code: isNew ? "90792" : "90853", system: "CPT", description: isNew ? "Psychiatric diagnostic evaluation" : "Group psychotherapy", confidence: isNew ? 0.92 : 0.3 + Math.random() * 0.2, rationale: isNew ? "Initial evaluation — comprehensive diagnostic assessment" : "Consider if patient joins group therapy program", accepted: c.st === "finalized" && isNew },
        ];

        const noteStatus = c.st === "finalized" ? "finalized" : c.st === "reviewed" ? "reviewed" : "draft";
        await pool.query(
          `INSERT INTO clinical_notes (consultation_id, template_id, sections, billing_codes, status, ai_model, generation_metadata, finalized_at, finalized_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [cId, templateIds[i % 2], JSON.stringify(sections), JSON.stringify(billingCodes), noteStatus,
           "mistral-large-latest", JSON.stringify({ template: i % 2 === 0 ? "Initial Psychiatric Evaluation" : "Psychotherapy Session", patient_name: p.name, visit_type: c.vt }),
           noteStatus === "finalized" ? c.ts : null, noteStatus === "finalized" ? DEMO_USER_ID : null]
        );
        noteCount++;
      }
    }

    // 6. Audit log
    const finalizedIds = consultationIds.filter((_, i) => C[i].st === "finalized").slice(0, 10);
    for (const fId of finalizedIds) {
      for (const action of ["start_recording", "stop_recording", "generate_note", "finalize_note"]) {
        await pool.query(
          `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [DEMO_USER_ID, action, action.includes("note") ? "clinical_note" : "consultation", fId, JSON.stringify({})]
        );
      }
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      summary: {
        patients: PATIENTS.length,
        consultations: C.length,
        notes: noteCount,
        transcripts: transcriptCount,
        auditEntries: finalizedIds.length * 4,
        templates: 2,
      },
      doctor: "Dr. Sarah Mitchell — Psychiatry",
    });

  } catch (err) {
    await pool.end();
    return NextResponse.json({ error: err instanceof Error ? err.message : "Seed failed", stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
  }
}
