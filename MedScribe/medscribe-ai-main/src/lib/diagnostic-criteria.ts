/**
 * Explicit DSM-5 and ICD-10 diagnostic criteria for 10 frequent psychiatric disorders.
 * Used as RULES in AI prompts so the model applies time, symptom count, and exclusion
 * criteria—not just "training". Aligns with guidelines-by-country for coding (ICD-10/ICD-10-CM).
 */

export interface DisorderCriteria {
  name: string;
  icd10: string;
  time: string;
  symptoms: string;
  exclusions: string;
}

const CRITERIA: DisorderCriteria[] = [
  {
    name: "Generalized anxiety disorder (GAD)",
    icd10: "F41.1",
    time: "Excessive anxiety and worry about several domains (e.g. work, health, family), occurring more days than not for at least 6 months. Worry difficult to control.",
    symptoms: "At least 3 of 6: (1) restlessness or feeling on edge, (2) easily fatigued, (3) concentration difficulty or mind going blank, (4) irritability, (5) muscle tension, (6) sleep disturbance. Must cause clinically significant distress or impairment in social, occupational, or other areas.",
    exclusions: "Not attributable to substance/medication or another medical condition (e.g. hyperthyroidism); not better explained by another mental disorder (panic disorder, PTSD, OCD, separation anxiety, social anxiety, anorexia).",
  },
  {
    name: "Major depressive disorder (MDD) / single or recurrent episode",
    icd10: "F32.x, F33.x",
    time: "Depressed mood or loss of interest/pleasure (anhedonia), for at least 2 weeks, nearly every day, most of the day.",
    symptoms: "At least 5 of 9 (must include depressed mood or anhedonia): (1) depressed mood, (2) markedly diminished interest or pleasure, (3) significant weight/appetite change, (4) insomnia or hypersomnia, (5) psychomotor agitation or retardation, (6) fatigue or loss of energy, (7) worthlessness or excessive guilt, (8) diminished ability to think or concentrate, (9) recurrent thoughts of death or suicidal ideation/attempt. Cause significant distress or impairment.",
    exclusions: "Not due to substance/medication or another medical condition; not better explained by schizophrenia spectrum or other psychotic disorder; no history of manic or hypomanic episode (if present, consider bipolar).",
  },
  {
    name: "Panic disorder",
    icd10: "F41.0",
    time: "Recurrent unexpected panic attacks. After at least one attack: persistent concern or worry about additional attacks or maladaptive change in behavior related to attacks (e.g. avoidance) for 1 month or more.",
    symptoms: "Panic attack = abrupt surge of intense fear or discomfort, peak within minutes, with at least 4 of 13: (1) palpitations, (2) sweating, (3) trembling, (4) breathlessness, (5) choking, (6) chest pain, (7) nausea/abdominal distress, (8) dizziness/lightheadedness, (9) derealization/depersonalization, (10) fear of losing control or going crazy, (11) fear of dying, (12) paresthesias, (13) chills or hot flushes.",
    exclusions: "Attacks not due to substance/medication or another medical condition (e.g. cardiac, thyroid, respiratory); not better explained by another mental disorder (specific phobia, social anxiety, OCD, PTSD, separation anxiety).",
  },
  {
    name: "PTSD (post-traumatic stress disorder)",
    icd10: "F43.10",
    time: "Exposure to actual or threatened death, serious injury, or sexual violence (direct, witnessed, or learned that it occurred to close family/friend, or repeated extreme exposure to aversive details). Duration of disturbance more than 1 month.",
    symptoms: "Cluster B Intrusion (1+): recurrent intrusive memories, nightmares, flashbacks, psychological or physiological reactivity to cues. Cluster C Avoidance (1+): avoidance of trauma-related thoughts/feelings or external reminders. Cluster D Negative cognitions/mood (2+): amnesia, negative beliefs, distorted blame, negative emotional state, diminished interest, detachment. Cluster E Arousal/reactivity (2+): irritability/aggression, reckless behavior, hypervigilance, exaggerated startle, concentration problems, sleep disturbance. Cause significant distress or impairment.",
    exclusions: "Not attributable to substance/medication or another medical condition; not better explained by brief psychotic disorder. If duration less than 1 month consider acute stress disorder (F43.0).",
  },
  {
    name: "OCD (obsessive-compulsive disorder)",
    icd10: "F42.x",
    time: "Obsessions and/or compulsions present. Time-consuming (e.g. more than 1 hour per day) or cause clinically significant distress or impairment in social, occupational, or other areas.",
    symptoms: "Obsessions: recurrent and persistent thoughts, urges, or images experienced as intrusive and unwanted; person attempts to ignore or suppress them or to neutralize with a compulsion. Compulsions: repetitive behaviors (e.g. washing, checking, ordering) or mental acts (e.g. counting, repeating words) in response to an obsession or rigid rules; aimed at reducing distress or preventing a feared event. Obsessions/compulsions not merely excessive worries about real-life problems (e.g. finances).",
    exclusions: "Not attributable to substance/medication; not better explained by another mental disorder (body dysmorphic, hoarding, hair-pulling/skin-picking, eating disorder, preoccupation with substances or illness, schizophrenia spectrum, autism).",
  },
  {
    name: "Bipolar I disorder",
    icd10: "F31.x",
    time: "At least one manic episode (≥7 days of abnormally elevated/expansive or irritable mood and increased activity/energy, or any duration if hospitalization). Manic episode is distinct and not attributable to substance or medical condition.",
    symptoms: "During mania, 3+ of DIG FAST: Distractibility, Insomnia (decreased need for sleep), Grandiosity or inflated self-esteem, Flight of ideas or racing thoughts, Activity increase (goal-directed or purposeless), Speech pressured, Thoughtless risk-taking (e.g. spending, sexual). Marked impairment, hospitalization, or psychosis. Major depressive episode may precede or follow. If only hypomania (≥4 days, no marked impairment, no psychosis) and depression, use Bipolar II.",
    exclusions: "Not attributable to substance/medication or medical condition; not better explained by schizophrenia spectrum or schizoaffective disorder. Rule out unipolar depression by history of mania/hypomania.",
  },
  {
    name: "Bipolar II disorder",
    icd10: "F31.8x",
    time: "At least one hypomanic episode (≥4 consecutive days of elevated/expansive or irritable mood and increased activity) and at least one major depressive episode. No history of manic episode (if mania ever occurred, diagnose Bipolar I).",
    symptoms: "Hypomania: same symptom list as mania (3+ DIG FAST) but (1) 4+ days, (2) change is observable by others, (3) not severe enough to cause marked impairment or hospitalization, (4) no psychosis. Major depression: 5 of 9 criteria for 2+ weeks as in MDD (depressed mood, anhedonia, weight/appetite, sleep, psychomotor, fatigue, worthlessness, concentration, suicidality).",
    exclusions: "Hypomania and depression not better explained by schizoaffective disorder, schizophrenia, or other psychotic disorder; not due to substance/medication or medical condition.",
  },
  {
    name: "Schizophrenia",
    icd10: "F20.x",
    time: "Continuous signs of the disturbance for at least 6 months, including at least 1 month of active-phase symptoms (delusions, hallucinations, disorganized speech, disorganized/catatonic behavior, negative symptoms), or less if successfully treated. The 6 months may include prodromal or residual periods with only negative symptoms or attenuated positive symptoms.",
    symptoms: "Active phase: at least 2 of 5 (each present for a significant portion of 1 month): (1) delusions, (2) hallucinations, (3) disorganized speech, (4) grossly disorganized or catatonic behavior, (5) negative symptoms (diminished emotional expression, avolition). At least one must be (1), (2), or (3). Significant impairment in one or more major areas of functioning.",
    exclusions: "Rule out schizoaffective and mood disorder with psychotic features (if mood episodes present for majority of illness, consider those). Exclude substance/medication-induced psychotic disorder or psychotic disorder due to another medical condition. Consider autism spectrum or communication disorder in developmental history.",
  },
  {
    name: "Chronic insomnia disorder / nonorganic insomnia",
    icd10: "G47.00 (DSM-5); F51.01 (ICD-10-CM)",
    time: "Difficulty with sleep initiation, maintenance (frequent awakenings, difficulty returning to sleep), or early morning awakening with inability to return to sleep. At least 3 nights per week, for at least 3 months. Occurs despite adequate opportunity for sleep.",
    symptoms: "Complaint of dissatisfaction with sleep quantity or quality; associated with impairment in daytime functioning (e.g. fatigue, mood disturbance, cognitive or attention deficit, behavioral problems). Not solely explained by another sleep-wake disorder.",
    exclusions: "Not better explained by another sleep-wake disorder (narcolepsy, breathing-related, circadian rhythm, parasomnia). Not attributable to substance/medication or medical condition. Not better explained by another mental disorder (e.g. GAD, MDD). Rule out obstructive sleep apnea, restless legs syndrome, circadian rhythm disorder.",
  },
  {
    name: "ADHD (attention-deficit/hyperactivity disorder)",
    icd10: "F90.x",
    time: "Several inattentive and/or hyperactive-impulsive symptoms present for at least 6 months. Several symptoms present before age 12. Symptoms present in two or more settings (e.g. home, school, work). Clear evidence that symptoms interfere with or reduce quality of social, academic, or occupational functioning.",
    symptoms: "Inattention (6+ for children, 5+ for age 17+): fails to give close attention, difficulty sustaining attention, does not seem to listen, does not follow through, difficulty organizing, avoids sustained mental effort, loses things, easily distracted, forgetful. Hyperactivity-impulsivity (6+ for children, 5+ for age 17+): fidgets, leaves seat, runs/climbs inappropriately, unable to play quietly, on the go, talks excessively, blurts answers, difficulty waiting turn, interrupts or intrudes.",
    exclusions: "Not better explained by another mental disorder (mood, anxiety, dissociative, personality, oppositional defiant). Not occurring exclusively during schizophrenia or another psychotic disorder. Rule out substance/medication or medical condition (e.g. thyroid, lead).",
  },
  {
    name: "Adjustment disorder",
    icd10: "F43.2x",
    time: "Emotional or behavioral symptoms in response to an identifiable stressor(s) (e.g. divorce, job loss, illness). Onset within 3 months of onset of stressor(s). Once stressor ends, symptoms do not persist more than an additional 6 months (if they do, reconsider diagnosis).",
    symptoms: "Marked distress that is out of proportion to the severity of the stressor (consider cultural context), or significant impairment in social, occupational, or other important areas of functioning. Specify: with depressed mood (F43.21), with anxiety (F43.22), with mixed anxiety and depressed mood (F43.23), with disturbance of conduct (F43.24), with mixed disturbance of emotions and conduct (F43.25), unspecified (F43.20).",
    exclusions: "Does not meet criteria for another mental disorder (e.g. MDD, GAD, PTSD) and is not merely an exacerbation of a pre-existing disorder. Does not represent normal bereavement. If criteria for another disorder are met, that diagnosis takes precedence.",
  },
];

/**
 * Returns a single block of text to inject into AI system prompts so the model
 * applies these criteria as explicit rules when suggesting differentials.
 */
export function getDiagnosticCriteriaPromptBlock(): string {
  const lines = CRITERIA.map(
    (c) =>
      `• ${c.name} (${c.icd10}): TIME: ${c.time} SYMPTOMS: ${c.symptoms} EXCLUSIONS: ${c.exclusions}`
  );
  return `

EXPLICIT DIAGNOSTIC CRITERIA (DSM-5 / ICD-10) — apply as RULES for differentials. For each of these disorders, check TIME, minimum symptom count, and EXCLUSIONS before listing. State in reasoning which criteria are met, not met, or not documented.

${lines.join("\n\n")}

When suggesting any of the above diagnoses, your reasoning MUST reference these criteria (e.g. "duration not documented", "only 2/5 symptoms mentioned", "substance use not ruled out"). Lower confidence when criteria are missing or unclear.`;
}
