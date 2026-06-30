// BLEUMEA — License Intelligence Engine
// NEVER assume copyright status. Every content item must pass a License Intelligence Check.

import type { LegalityScore, LicenseType } from "./types";

interface LicenseIntelligenceResult {
  licenseType: LicenseType;
  legalityScore: LegalityScore;
  licenseConfidence: number; // 0..1
  copyrightPolicy: string;
  fingerprintHash: string;
  canStoreFullText: boolean;
}

// Detect license signals from source URL / ToS text
export function detectLicense(
  sourceUrl: string,
  tosText: string = ""
): LicenseIntelligenceResult {
  const haystack = `${sourceUrl} ${tosText}`.toLowerCase();

  let licenseType: LicenseType = "UNKNOWN";
  let confidence = 0.2;
  let policy = "License not explicitly stated.";

  // Public domain signals
  if (
    haystack.includes("public domain") ||
    haystack.includes("pd-") ||
    haystack.includes("no known copyright") ||
    sourceUrl.includes("gutenberg.org") ||
    sourceUrl.includes("wikisource.org")
  ) {
    licenseType = "PUBLIC_DOMAIN";
    confidence = 0.95;
    policy = "Content is in the public domain — full ingestion permitted.";
  }
  // CC0
  else if (haystack.includes("cc0") || haystack.includes("no rights reserved")) {
    licenseType = "CC0";
    confidence = 0.95;
    policy = "CC0 — creator has waived all rights.";
  }
  // CC BY-SA
  else if (haystack.includes("cc by-sa") || haystack.includes("by-sa") || haystack.includes("sharealike")) {
    licenseType = "CC_BY_SA";
    confidence = 0.9;
    policy = "CC BY-SA — attribution + share-alike required.";
  }
  // CC BY-NC
  else if (haystack.includes("cc by-nc") || haystack.includes("by-nc") || haystack.includes("noncommercial")) {
    licenseType = "CC_BY_NC";
    confidence = 0.85;
    policy = "CC BY-NC — non-commercial use only. Metadata-only storage.";
  }
  // CC BY-ND
  else if (haystack.includes("cc by-nd") || haystack.includes("by-nd") || haystack.includes("noderivatives")) {
    licenseType = "CC_BY_ND";
    confidence = 0.85;
    policy = "CC BY-ND — no derivatives. Metadata-only storage.";
  }
  // CC BY
  else if (haystack.includes("cc by") || haystack.includes("creativecommons.org/licenses/by/") || haystack.includes("attribution")) {
    licenseType = "CC_BY";
    confidence = 0.9;
    policy = "CC BY — attribution required.";
  }
  // Restricted
  else if (
    haystack.includes("all rights reserved") ||
    haystack.includes("©") ||
    haystack.includes("copyright") ||
    haystack.includes("restricted") ||
    sourceUrl.includes("genius.com") ||
    sourceUrl.includes("azlyrics.com")
  ) {
    licenseType = "RESTRICTED";
    confidence = 0.7;
    policy = "All rights reserved — full text storage prohibited. Metadata only.";
  }

  const legalityScore: LegalityScore =
    licenseType === "PUBLIC_DOMAIN" || licenseType === "CC0" || licenseType === "CC_BY" || licenseType === "CC_BY_SA"
      ? "SAFE"
      : licenseType === "CC_BY_NC" || licenseType === "CC_BY_ND" || licenseType === "RESTRICTED"
        ? "LIMITED"
        : "BLOCKED";

  const canStoreFullText = legalityScore === "SAFE";

  // Fingerprint hash — simple hash to detect ToS changes
  const fingerprintHash = hashString(tosText || sourceUrl).toString(16);

  return {
    licenseType,
    legalityScore,
    licenseConfidence: confidence,
    copyrightPolicy: policy,
    fingerprintHash,
    canStoreFullText,
  };
}

// Compute legality score numerically 0..1 for analytics
export function legalityNumeric(score: LegalityScore): number {
  return score === "SAFE" ? 1 : score === "LIMITED" ? 0.5 : 0;
}

// Simple deterministic string hash (djb2-like)
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

// Re-validate source monthly: detect if ToS changed
export function detectTermsChange(
  currentHash: string | null,
  newHash: string
): boolean {
  if (!currentHash) return false; // first scan
  return currentHash !== newHash;
}
