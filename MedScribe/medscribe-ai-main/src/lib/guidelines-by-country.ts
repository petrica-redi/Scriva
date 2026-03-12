/**
 * Psychiatric guidelines by country (Romania, UK, France, Germany, US).
 * Source: cercetare-protocoale-psihiatrice-tari.md (March 2026).
 * Used to tailor AI diagnostic and CDS prompts to the clinician's practice country.
 */

export type GuidelineCategory =
  | "classification_system"
  | "clinical_guidelines"
  | "assessment_instruments"
  | "regulatory_bodies"
  | "prescribing_protocols"
  | "diagnostic_requirements"
  | "psychotherapy";

export interface CountryGuidelines {
  country: string;
  classification_system: string;
  clinical_guidelines: string;
  assessment_instruments: string;
  regulatory_bodies: string;
  prescribing_protocols: string;
  diagnostic_requirements: string;
  psychotherapy: string;
}

const UK_GUIDELINES: CountryGuidelines = {
  country: "United Kingdom",
  classification_system: `ICD-11 (adoptat oficial de NHS; ICD-10 încă în uz în unele sisteme). DSM-5-TR folosit în cercetare și ca referință clinică secundară, nu este sistemul oficial de codare. NHS Digital folosește ICD pentru codarea statistică și administrativă.`,
  clinical_guidelines: `NICE (National Institute for Health and Care Excellence) — Anglia și Țara Galilor: ghiduri pentru depresie, anxietate, psihoze/schizofrenie, tulburare bipolară, PTSD, ADHD, tulburări de personalitate, tulburări alimentare, OCD, autism, demență (nice.org.uk). SIGN — Scoția: ghiduri proprii pentru sănătate mintală. Royal College of Psychiatrists (RCPsych) — rapoarte și standarde. BAP (British Association for Psychopharmacology) — ghiduri de tratament farmacologic.`,
  assessment_instruments: `PHQ-9 (screening depresie, primary care), GAD-7 (anxietate generalizată), HoNOS (obligatoriu în servicii secundare), AUDIT (alcool), CORE-OM (rezultate psihoterapie), PANSS (psihoze), ADOS-2 și ADI-R (autism), Conners și DIVA (ADHD adulți), MINI (interviu structurat).`,
  regulatory_bodies: `General Medical Council (GMC) — licențiere medici. Care Quality Commission (CQC) — Anglia. Healthcare Improvement Scotland, Healthcare Inspectorate Wales, RQIA — Irlanda de Nord. Royal College of Psychiatrists — standarde profesionale.`,
  prescribing_protocols: `BNF (British National Formulary) — referință oficială. NICE Technology Appraisals — rambursare NHS. Maudsley Prescribing Guidelines — ghid psihofarmacologie. Shared Care Protocols între psihiatrie și medicina de familie. Clozapina: monitorizare hematologică obligatorie (registru CPMS).`,
  diagnostic_requirements: `Evaluare psihiatrică completă: istoric psihiatric, MSE, istoric medical, familial, evaluare risc. Pentru ADHD, autism, personalitate: evaluare multidisciplinară. Referral de la GP pentru servicii secundare. Formular de referral standardizat. Documentare electronică (RiO, SystmOne).`,
  psychotherapy: `IAPT / NHS Talking Therapies — CBT standard, EMDR pentru PTSD, IPT, counselling, model stepped care. NICE recomandă terapii specifice per diagnostic (CBT depresie/anxietate, DBT borderline, terapie familială psihoze). Psihoterapeuți acreditați: BABCP, UKCP, BPC. Scoția: Matrix Guide.`,
};

const FRANCE_GUIDELINES: CountryGuidelines = {
  country: "France",
  classification_system: `ICD-10 (oficial OMS) pentru codare. CFTMEA — clasificare franceză copii/adolescenți (în scădere). DSM-5-TR în cercetare. Tranziție ICD-11 planificată.`,
  clinical_guidelines: `HAS (Haute Autorité de Santé) — recomandări de bună practică: depresie, schizofrenie, tulburări bipolare, autism, ADHD, demență (has-sante.fr). ANSM — siguranța medicamentelor. FFP (Fédération Française de Psychiatrie) — recomandări profesionale.`,
  assessment_instruments: `MINI (dezvoltat în Franța), MADRS (depresie), BPRS (psihoze), CGI, ADOS-2 (autism). Nu există sistem standardizat obligatoriu național (variază pe centre).`,
  regulatory_bodies: `Ordre National des Médecins — licențiere. ARS (Agences Régionales de Santé) — servicii regionale. HAS — calitate și evaluare.`,
  prescribing_protocols: `ALD (Affection de Longue Durée) — boli psihiatrice cronice, 100% rambursare; ALD 23: afecțiuni psihiatrice de lungă durată. Ordonnance; substanțe controlate: ordonnance sécurisée. SMR/ASMR — evaluare HAS per medicament.`,
  diagnostic_requirements: `Evaluare de médecin psychiatre. Certificat médical obligatoriu pentru internare (soins sans consentement — loi du 5 juillet 2011). ALD: protocol de îngrijire semnat de medic traitant + specialist. Dossier médical partagé (DMP).`,
  psychotherapy: `MonPsy / MonParcoursPsy (din 2022) — 8 ședințe rambursate/an, adresare de la medic traitant. Titlul „psychothérapeute" reglementat din 2010. Psihologi clinicieni: licență + master. CBT (TCC), psihanaliză, EMDR, terapii sistemice.`,
};

const ROMANIA_GUIDELINES: CountryGuidelines = {
  country: "Romania",
  classification_system: `ICD-10 obligatoriu pentru codare CNAS. DSM-5-TR utilizat complementar în clinică și cercetare. România urmează calendarul OMS pentru ICD-11.`,
  clinical_guidelines: `APR (Asociația Psihiatrică Română) — ghiduri de practică. Ministerul Sănătății — protocoale terapeutice pentru schizofrenie, tulburare bipolară, depresie, demență. Ghiduri de bună practică medicală în Monitorul Oficial. Se bazează pe APA, NICE, WFSBP.`,
  assessment_instruments: `MINI (interviu structurat), PHQ-9, GAD-7 (în uz crescând), BDI-II, HAM-D (depresie), PANSS (psihoze), MMSE (screening cognitiv). Protocoalele recomandă instrumente specifice; nu există baterie obligatorie națională.`,
  regulatory_bodies: `Colegiul Medicilor din România (CMR) — licențiere. Ministerul Sănătății, ANMDMR (agenția de medicamente), CNAS (casa națională de asigurări), Comisia de Psihiatrie a Ministerului Sănătății.`,
  prescribing_protocols: `Protocoale terapeutice CNAS obligatorii pentru rambursare; inițiere de specialist, continuare de medic de familie. Rețetă compensată/gratuită (formulare specifice). Substanțe controlate: rețetă specială. DCI obligatorie. Lista C2 — contribuție personală.`,
  diagnostic_requirements: `Evaluare de medic specialist psihiatru sau medic primar psihiatru. Bilet de trimitere de la medicul de familie (obligatoriu pentru servicii decontate CNAS). Examen psihiatric complet: anamneză, examen psihic, somatic, investigații. Fișa de observație (internare), Scrisoare medicală (ambulatoriu). Legea 487/2002 — internare involuntară: aviz medico-legal + autorizare judecătorească.`,
  psychotherapy: `Colegiul Psihologilor din România (CPR) — atestat liberă practică, specializări psihologie clinică și psihoterapie. Forme recunoscute: CBT, psihodinamică, sistemică, integrativă, psihanalitică, experiențială, hipnoză clinică. Psihoterapia nu este rambursată de CNAS în regim ambulatoriu (doar la internare). Strategia Națională de Sănătate Mintală; centre comunitare în dezvoltare.`,
};

const GERMANY_GUIDELINES: CountryGuidelines = {
  country: "Germany",
  classification_system: `ICD-10-GM (German Modification) obligatoriu pentru codare și facturare. ICD-11 în curs de implementare. DSM-5-TR folosit în cercetare și clinic, nu pentru codare oficială.`,
  clinical_guidelines: `DGPPN — principalul emitent; S3-Leitlinien (cel mai înalt nivel de evidență) pentru depresie unipolară, schizofrenie, demență, ADHD, tulburări de personalitate, adicții. AWMF coordonează ghidurile medicale (awmf.org/leitlinien). BÄK — Nationale VersorgungsLeitlinien (NVL).`,
  assessment_instruments: `AMDP — sistem standardizat de documentare psihiatrică (specific Germaniei). BDI-II, PHQ-D (versiunea germană PHQ), SKID (SCID în germană), PANSS, BPRS (psihoze), DIPS, GAF, Mini-ICF-APP (capacitate funcțională).`,
  regulatory_bodies: `Landesärztekammern — licențiere la nivel regional. BÄK (Bundesärztekammer) — camera medicală federală. G-BA (Gemeinsamer Bundesausschuss) — decide ce servicii sunt acoperite de asigurări.`,
  prescribing_protocols: `Arzneimittelrichtlinie (directiva de medicamente G-BA). Rote Liste — lista oficială. BTM-Rezept pentru substanțe controlate. Off-label: justificare specială și informare pacient.`,
  diagnostic_requirements: `Evaluare completă conform standardelor AMDP. Documentare: anamneză, examen psihic, diagnostic diferențial. Facharzt für Psychiatrie und Psychotherapie. Incapacitate de muncă: raport medical structurat. Codare ICD-10-GM obligatorie.`,
  psychotherapy: `Richtlinienverfahren — doar terapiile aprobate G-BA rambursate: psihanalitică, psihodinamică (Tiefenpsychologisch fundierte), Verhaltenstherapie (CBT), Systemische Therapie (din 2020). Antrag la casa de asigurări cu raport terapeutic. Approbation + Kassensitz. Probatorische Sitzungen (2–4) înainte de cerere formală.`,
};

const US_GUIDELINES: CountryGuidelines = {
  country: "United States",
  classification_system: `DSM-5-TR (APA) — standard principal pentru diagnostic clinic, asigurări, cercetare. ICD-10-CM obligatoriu pentru codare și facturare (CMS/HIPAA). Ambele folosite simultan: DSM-5-TR diagnostic, ICD-10-CM codare.`,
  clinical_guidelines: `APA (American Psychiatric Association) Practice Guidelines — schizofrenie, tulburare depresivă majoră, bipolară, PTSD, tulburări de uz de substanțe, suicid, tulburări alimentare (psychiatry.org). SAMHSA — adicții și sănătate mintală. VA/DoD Clinical Practice Guidelines — veterani (PTSD, depresie). AACAP — copii și adolescenți.`,
  assessment_instruments: `PHQ-9 (depresie, primary care), GAD-7 (anxietate), Columbia Suicide Severity Rating Scale (C-SSRS), PCL-5 (PTSD), AUDIT-C (alcool), SCID-5 (interviu DSM-5), MMPI-2-RF/MMPI-3 (personalitate), Conners/Vanderbilt (ADHD), ADOS-2 (autism), MoCA, MMSE (cognitiv), MDQ (screening bipolar).`,
  regulatory_bodies: `State Medical Boards — licențiere per stat. ABPN (American Board of Psychiatry and Neurology) — board certification. FDA — medicamente, DEA — substanțe controlate. CMS — standarde Medicare/Medicaid. Joint Commission — acreditare spitale.`,
  prescribing_protocols: `PDMP (Prescription Drug Monitoring Programs) la nivel de stat. FDA black box warnings. DEA Schedule (I–V). Prior authorization și step therapy pot fi cerute de asigurări. Reguli de prescriere variază pe stat.`,
  diagnostic_requirements: `Evaluare psihiatrică completă conform APA. Biopsychosocial assessment. Documentare: H&P, progress notes. Asigurări: diagnostic DSM-5-TR + cod ICD-10-CM. Medical necessity trebuie demonstrată. Involuntary commitment variază pe stat (72-hour hold, Baker Act, 5150).`,
  psychotherapy: `Licențiere per stat: Licensed Psychologist, LCSW, LPC, LMFT. APA — ESTs (Empirically Supported Treatments). Rambursare prin asigurări (Mental Health Parity Act). CBT, DBT, EMDR, psihodinamică, IPT, ACT, exposure therapy. Teletherapy extins post-COVID.`,
};

const BY_COUNTRY: Record<string, CountryGuidelines> = {
  Romania: ROMANIA_GUIDELINES,
  "United Kingdom": UK_GUIDELINES,
  France: FRANCE_GUIDELINES,
  Germany: GERMANY_GUIDELINES,
  "United States": US_GUIDELINES,
};

/**
 * Returns structured guidelines for a given practice country, or null if not available.
 */
export function getCountryGuidelines(country: string | null | undefined): CountryGuidelines | null {
  if (!country || typeof country !== "string") return null;
  const trimmed = country.trim();
  return BY_COUNTRY[trimmed] ?? null;
}

/**
 * Returns a single text block suitable for injection into an AI system prompt,
 * so the model follows that country's classification, guidelines, and requirements.
 */
export function getCountryGuidelinesPromptBlock(country: string | null | undefined): string {
  const g = getCountryGuidelines(country);
  if (!g) return "";

  return `
CLINICIAN PRACTICE COUNTRY: ${g.country}. Apply the following framework for diagnosis, coding, and recommendations:

1. Classification: ${g.classification_system}
2. Official clinical guidelines: ${g.clinical_guidelines}
3. Standardised assessment instruments (prefer where relevant): ${g.assessment_instruments}
4. Regulatory context: ${g.regulatory_bodies}
5. Prescribing protocols: ${g.prescribing_protocols}
6. Diagnostic requirements: ${g.diagnostic_requirements}
7. Psychotherapy context: ${g.psychotherapy}

When suggesting differentials, use the classification system above for codes. When suggesting next steps or referrals, align with this country's requirements and guidelines.`;
}
