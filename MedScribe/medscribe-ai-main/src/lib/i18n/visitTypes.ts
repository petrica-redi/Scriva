import type { TranslationKey } from "./translations";

const visitTypeKeyMap: Record<string, TranslationKey> = {
  "general visit": "visit.generalVisit",
  "general": "visit.generalVisit",
  "follow-up": "visit.followUp",
  "follow up": "visit.followUp",
  "follow-up visit": "visit.followUpVisit",
  "follow up visit": "visit.followUpVisit",
  "followup": "visit.followUp",
  "new patient": "visit.newPatient",
  "new patient visit": "visit.newPatientVisit",
  "urgent care": "visit.urgentCare",
  "specialist referral": "visit.specialistReferral",
  "annual checkup": "visit.annualCheckup",
  "routine check-up": "visit.routineCheckup",
  "routine checkup": "visit.routineCheckup",
  "emergency": "visit.emergency",
  "specialist consultation": "visit.specialistConsultation",
  "telehealth": "visit.telehealth",
  "mental health session": "visit.mentalHealthSession",
};

export function translateVisitType(
  raw: string,
  t: (key: TranslationKey) => string
): string {
  const key = visitTypeKeyMap[raw.trim().toLowerCase()];
  if (key) return t(key);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
