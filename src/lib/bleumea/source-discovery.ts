// BLEUMEA — Source Discovery Engine + License Discovery Agent
// Continuously discovers global legal sources of poetry/lyrics.
// Re-validates sources monthly.

import { db } from "@/lib/db";
import { detectLicense, detectTermsChange } from "./license-intel";

// Curated seed sources — global public-domain / CC repositories
export const SEED_SOURCES: Array<{
  name: string;
  url: string;
  type: "SEARCH_ENGINE" | "RSS" | "ARCHIVE" | "UNIVERSITY" | "PUBLIC_DOMAIN" | "CC_REPO" | "OFFICIAL_ARTIST";
  region?: string;
  language?: string;
  description?: string;
  termsUrl?: string;
}> = [
  {
    name: "Project Gutenberg — Poetry",
    url: "https://gutenberg.org/ebooks/search/?categories=Poetry",
    type: "PUBLIC_DOMAIN",
    region: "US",
    language: "en",
    description: "70k+ public-domain ebooks; large poetry collection.",
    termsUrl: "https://gutenberg.org/policy/terms_of_use.html",
  },
  {
    name: "Wikisource — Poetry",
    url: "https://wikisource.org/wiki/Wikisource:Poetry",
    type: "PUBLIC_DOMAIN",
    region: "INT",
    language: "multi",
    description: "Free library of source texts, including poetry in many languages.",
    termsUrl: "https://wikisource.org/wiki/Wikisource:Copyright_policy",
  },
  {
    name: "Poetry Foundation — Public Domain",
    url: "https://poetryfoundation.org",
    type: "ARCHIVE",
    region: "US",
    language: "en",
    description: "Large archive; mixed licensing — must check each item.",
    termsUrl: "https://poetryfoundation.org/terms",
  },
  {
    name: "Academy of American Poets",
    url: "https://poets.org",
    type: "ARCHIVE",
    region: "US",
    language: "en",
    description: "Biographies and poems; educators' use permitted.",
  },
  {
    name: "Internet Archive — Poetry",
    url: "https://archive.org/details/texts?and[]=poetry",
    type: "PUBLIC_DOMAIN",
    region: "INT",
    language: "multi",
    description: "Scanned public-domain books of poetry.",
  },
  {
    name: "LibriVox — Poetry Audiobook",
    url: "https://librivox.org/search?q=poetry",
    type: "PUBLIC_DOMAIN",
    region: "INT",
    language: "multi",
    description: "Public-domain audiobook readings of poetry.",
  },
  {
    name: "Wikidata — Poems Index",
    url: "https://wikidata.org",
    type: "CC_REPO",
    region: "INT",
    language: "multi",
    description: "Structured metadata; CC0 licensed.",
  },
  {
    name: "Europeana — Poetry",
    url: "https://europeana.eu",
    type: "ARCHIVE",
    region: "EU",
    language: "multi",
    description: "Cultural heritage aggregation; per-item rights metadata.",
  },
  {
    name: "DPD — Dickinson Public Domain",
    url: "https://www.emilydickinsonmuseum.org/poems/",
    type: "PUBLIC_DOMAIN",
    region: "US",
    language: "en",
    description: "Emily Dickinson's poems in public domain.",
  },
  {
    name: "Rumi.org — Public Domain",
    url: "https://www.rumi.org.uk",
    type: "OFFICIAL_ARTIST",
    region: "UK",
    language: "en",
    description: "Translations of Rumi's works; check per-item license.",
  },
  {
    name: "Genius.com (BLOCKED)",
    url: "https://genius.com",
    type: "OFFICIAL_ARTIST",
    region: "US",
    language: "en",
    description: "Lyrics aggregator — all rights reserved. Metadata-only ingest.",
  },
  {
    name: "AZLyrics (BLOCKED)",
    url: "https://azlyrics.com",
    type: "OFFICIAL_ARTIST",
    region: "US",
    language: "en",
    description: "Lyrics aggregator — restricted. Metadata-only.",
  },
  {
    name: "CCMixter — Spoken Word",
    url: "https://ccmixter.org",
    type: "CC_REPO",
    region: "INT",
    language: "multi",
    description: "CC-licensed audio including spoken-word poetry.",
  },
  {
    name: "Harvard Library — Poetry",
    url: "https://library.harvard.edu",
    type: "UNIVERSITY",
    region: "US",
    language: "en",
    description: "Academic archives; mixed licensing.",
  },
];

// Discover / upsert sources, fetch & analyze their ToS, assign legality score
export async function discoverAndValidateSources(): Promise<{
  total: number;
  newSources: number;
  safe: number;
  limited: number;
  blocked: number;
  termsChanged: number;
  durationMs: number;
}> {
  const startedAt = Date.now();
  let newSources = 0;
  let safe = 0, limited = 0, blocked = 0, termsChanged = 0;

  for (const s of SEED_SOURCES) {
    const existing = await db.source.findUnique({ where: { url: s.url } });
    const license = detectLicense(s.url, s.description || "");

    if (license.legalityScore === "SAFE") safe++;
    else if (license.legalityScore === "LIMITED") limited++;
    else blocked++;

    if (existing) {
      // Check for ToS changes
      const changed = detectTermsChange(existing.fingerprintHash, license.fingerprintHash);
      if (changed) termsChanged++;

      await db.source.update({
        where: { id: existing.id },
        data: {
          name: s.name,
          type: s.type,
          region: s.region || null,
          language: s.language || null,
          description: s.description || null,
          termsUrl: s.termsUrl || null,
          licenseType: license.licenseType,
          legalityScore: license.legalityScore,
          licenseConfidence: license.licenseConfidence,
          copyrightPolicy: license.copyrightPolicy,
          fingerprintHash: license.fingerprintHash,
          lastLicenseScan: new Date(),
          licenseScanCount: { increment: 1 },
          lastHealthCheck: new Date(),
        },
      });
    } else {
      newSources++;
      await db.source.create({
        data: {
          name: s.name,
          url: s.url,
          type: s.type,
          region: s.region || null,
          language: s.language || null,
          description: s.description || null,
          termsUrl: s.termsUrl || null,
          licenseType: license.licenseType,
          legalityScore: license.legalityScore,
          licenseConfidence: license.licenseConfidence,
          copyrightPolicy: license.copyrightPolicy,
          fingerprintHash: license.fingerprintHash,
          lastLicenseScan: new Date(),
          licenseScanCount: 1,
          lastHealthCheck: new Date(),
          status: "ACTIVE",
          healthScore: 1,
        },
      });
    }

    // Log audit event
    await db.systemLog.create({
      data: {
        level: "INFO",
        category: "LICENSE",
        message: `Source "${s.name}" validated: ${license.licenseType} → ${license.legalityScore}`,
        detail: JSON.stringify({ url: s.url, confidence: license.licenseConfidence, termsChanged: existing ? detectTermsChange(existing.fingerprintHash, license.fingerprintHash) : false }),
      },
    });
  }

  return {
    total: SEED_SOURCES.length,
    newSources,
    safe,
    limited,
    blocked,
    termsChanged,
    durationMs: Date.now() - startedAt,
  };
}

// Schedule monthly re-validation (in production: cron). Here it's on-demand.
export async function revalidateAllSources(): Promise<{
  scanned: number;
  degraded: number;
}> {
  const sources = await db.source.findMany();
  let scanned = 0, degraded = 0;
  for (const s of sources) {
    const license = detectLicense(s.url, s.copyrightPolicy || "");
    if (license.legalityScore !== s.legalityScore) degraded++;
    await db.source.update({
      where: { id: s.id },
      data: {
        licenseType: license.licenseType,
        legalityScore: license.legalityScore,
        licenseConfidence: license.licenseConfidence,
        lastLicenseScan: new Date(),
        licenseScanCount: { increment: 1 },
      },
    });
    scanned++;
  }
  return { scanned, degraded };
}
