/**
 * PII Pseudonymization for external API calls.
 * Strips personally identifiable information before sending to Anthropic/Deepgram,
 * then restores it in the response.
 */

export interface PatientInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  doctor_name?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  cnp?: string;
  address?: string;
  mrn?: string;
}

export interface PseudonymizationResult {
  pseudonymizedText: string;
  mappings: Record<string, string>; // { "[PLACEHOLDER]": "original value" }
}

// Regex patterns for structured PII
const PII_PATTERNS: Array<{ pattern: RegExp; prefix: string }> = [
  // Romanian CNP (13 digits starting with 1-8)
  { pattern: /\b[1-8]\d{12}\b/g, prefix: "CNP" },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, prefix: "EMAIL" },
  // Phone numbers (international and local formats)
  { pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, prefix: "PHONE" },
  // MRN patterns (common formats: MRN-12345, MRN: 12345, #12345)
  { pattern: /\b(?:MRN|mrn|NR|nr)[:\-\s]*\d{4,10}\b/g, prefix: "MRN" },
];

// Date patterns (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD)
const DATE_PATTERN = /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/g;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pseudonymize(
  text: string,
  patientInfo?: PatientInfo
): PseudonymizationResult {
  const mappings: Record<string, string> = {};
  let result = text;
  let counters: Record<string, number> = {};

  function getPlaceholder(prefix: string): string {
    counters[prefix] = (counters[prefix] || 0) + 1;
    return counters[prefix] === 1 ? `[${prefix}]` : `[${prefix}_${counters[prefix]}]`;
  }

  function replaceAndMap(original: string, prefix: string): string {
    // Check if already mapped
    for (const [placeholder, val] of Object.entries(mappings)) {
      if (val === original) return placeholder;
    }
    const placeholder = getPlaceholder(prefix);
    mappings[placeholder] = original;
    return placeholder;
  }

  // 1. Replace known patient info first (exact matching, case-insensitive)
  if (patientInfo) {
    // Full name
    if (patientInfo.name) {
      const re = new RegExp(escapeRegex(patientInfo.name), "gi");
      const placeholder = replaceAndMap(patientInfo.name, "PATIENT_NAME");
      result = result.replace(re, placeholder);
    }

    // First + last name separately
    if (patientInfo.first_name && patientInfo.last_name) {
      const fullName = `${patientInfo.first_name} ${patientInfo.last_name}`;
      const re = new RegExp(escapeRegex(fullName), "gi");
      if (!mappings["[PATIENT_NAME]"] || mappings["[PATIENT_NAME]"] !== fullName) {
        const placeholder = replaceAndMap(fullName, "PATIENT_NAME");
        result = result.replace(re, placeholder);
      }
      // Also replace individual names
      const reLast = new RegExp(`\\b${escapeRegex(patientInfo.last_name)}\\b`, "gi");
      const reFirst = new RegExp(`\\b${escapeRegex(patientInfo.first_name)}\\b`, "gi");
      const lastPlaceholder = replaceAndMap(patientInfo.last_name, "PATIENT_LASTNAME");
      const firstPlaceholder = replaceAndMap(patientInfo.first_name, "PATIENT_FIRSTNAME");
      result = result.replace(reLast, lastPlaceholder);
      result = result.replace(reFirst, firstPlaceholder);
    }

    // Doctor name
    if (patientInfo.doctor_name) {
      const re = new RegExp(escapeRegex(patientInfo.doctor_name), "gi");
      const placeholder = replaceAndMap(patientInfo.doctor_name, "DOCTOR_NAME");
      result = result.replace(re, placeholder);
    }

    // Known DOB
    if (patientInfo.date_of_birth) {
      const re = new RegExp(escapeRegex(patientInfo.date_of_birth), "gi");
      const placeholder = replaceAndMap(patientInfo.date_of_birth, "DOB");
      result = result.replace(re, placeholder);
    }

    // Known phone
    if (patientInfo.phone) {
      const re = new RegExp(escapeRegex(patientInfo.phone), "gi");
      const placeholder = replaceAndMap(patientInfo.phone, "PHONE");
      result = result.replace(re, placeholder);
    }

    // Known email
    if (patientInfo.email) {
      const re = new RegExp(escapeRegex(patientInfo.email), "gi");
      const placeholder = replaceAndMap(patientInfo.email, "EMAIL");
      result = result.replace(re, placeholder);
    }

    // Known CNP
    if (patientInfo.cnp) {
      const re = new RegExp(escapeRegex(patientInfo.cnp), "gi");
      const placeholder = replaceAndMap(patientInfo.cnp, "CNP");
      result = result.replace(re, placeholder);
    }

    // Known address
    if (patientInfo.address) {
      const re = new RegExp(escapeRegex(patientInfo.address), "gi");
      const placeholder = replaceAndMap(patientInfo.address, "ADDRESS");
      result = result.replace(re, placeholder);
    }

    // Known MRN
    if (patientInfo.mrn) {
      const re = new RegExp(escapeRegex(patientInfo.mrn), "gi");
      const placeholder = replaceAndMap(patientInfo.mrn, "MRN");
      result = result.replace(re, placeholder);
    }
  }

  // 2. Regex-based detection for remaining PII
  for (const { pattern, prefix } of PII_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // Skip if already replaced (inside a placeholder)
      if (match.startsWith("[") && match.endsWith("]")) return match;
      return replaceAndMap(match, prefix);
    });
  }

  // 3. Date patterns (only replace dates not already caught by DOB)
  result = result.replace(DATE_PATTERN, (match) => {
    // Check if already inside a placeholder
    for (const val of Object.values(mappings)) {
      if (val === match) {
        // Already mapped, find its placeholder
        for (const [ph, v] of Object.entries(mappings)) {
          if (v === match) return ph;
        }
      }
    }
    return replaceAndMap(match, "DATE");
  });

  return { pseudonymizedText: result, mappings };
}

export function dePseudonymize(
  text: string,
  mappings: Record<string, string>
): string {
  let result = text;
  // Sort by placeholder length descending to avoid partial replacements
  const sorted = Object.entries(mappings).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [placeholder, original] of sorted) {
    // Replace all occurrences
    result = result.split(placeholder).join(original);
  }
  return result;
}
