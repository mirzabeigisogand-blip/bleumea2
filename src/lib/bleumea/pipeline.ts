// BLEUMEA — Autonomous Pipeline Orchestrator
// Pipeline: Crawler → Pre-filter → Language Detection → Poetry Classifier →
// License Checker → Deduplication → Translation → Embedding → Storage
// Only items passing ALL stages are stored as full records.

import { db } from "@/lib/db";
import { classifyPoetry, detectLanguage } from "./poetry-classifier";
import { detectLicense } from "./license-intel";
import { generateEmbedding, findDuplicate } from "./embedding";
import { translatePoetically } from "./translator";
import type { PipelineItemInput, StageResultDTO, ApiName, ApiHealth } from "./types";
import { POETRY_CONFIDENCE_THRESHOLD } from "./types";

export interface PipelineRunResult {
  runId: string;
  status: "SUCCESS" | "DEGRADED" | "FAILED";
  inputCount: number;
  outputCount: number;
  rejectedCount: number;
  quarantineCount: number;
  stages: StageResultDTO[];
  degradedApis: ApiName[];
  fallbacksUsed: string[];
  durationMs: number;
}

// Track live API health — degraded gracefully when APIs fail
const apiHealth: Record<ApiName, ApiHealth> = {
  CLASSIFICATION: {
    name: "CLASSIFICATION",
    status: "HEALTHY",
    latencyMs: 80,
    successRate: 0.98,
    lastCheckedAt: new Date().toISOString(),
    fallbackActive: false,
    primaryModel: "bleumea-multilayer-v2",
  },
  TRANSLATION: {
    name: "TRANSLATION",
    status: "HEALTHY",
    latencyMs: 2400,
    successRate: 0.95,
    lastCheckedAt: new Date().toISOString(),
    fallbackActive: false,
    primaryModel: "glm-4.6-poetic",
    fallbackModel: "fallback-heuristic-v1",
  },
  EMBEDDING: {
    name: "EMBEDDING",
    status: "HEALTHY",
    latencyMs: 12,
    successRate: 0.99,
    lastCheckedAt: new Date().toISOString(),
    fallbackActive: false,
    primaryModel: "bleumea-hash-384",
  },
  ANALYTICS: {
    name: "ANALYTICS",
    status: "HEALTHY",
    latencyMs: 35,
    successRate: 0.97,
    lastCheckedAt: new Date().toISOString(),
    fallbackActive: false,
    primaryModel: "bleumea-qa-v1",
  },
};

export function getApiHealth(): ApiHealth[] {
  return Object.values(apiHealth);
}

export function degradeApi(name: ApiName, reason: string): void {
  apiHealth[name].status = "DEGRADED";
  apiHealth[name].fallbackActive = true;
  apiHealth[name].successRate = Math.max(0.1, apiHealth[name].successRate - 0.2);
  apiHealth[name].lastCheckedAt = new Date().toISOString();
}

export async function runPipeline(
  items: PipelineItemInput[],
  trigger: "MANUAL" | "SCHEDULED" | "BACKFILL" | "RETRY" = "MANUAL",
  sourceId?: string
): Promise<PipelineRunResult> {
  const startedAt = Date.now();
  const allStageResults: StageResultDTO[] = [];
  const degradedApis: ApiName[] = [];
  const fallbacksUsed: string[] = [];

  // Create pipeline run record
  const run = await db.pipelineRun.create({
    data: {
      status: "RUNNING",
      trigger,
      inputCount: items.length,
      sourceId,
    } as any,
  });

  let outputCount = 0;
  let rejectedCount = 0;
  let quarantineCount = 0;

  for (const item of items) {
    const itemStages: StageResultDTO[] = [];
    let rejected = false;
    let quarantined = false;
    let language = item.language || "en";
    let license: ReturnType<typeof detectLicense> | null = null;
    let embedding: Awaited<ReturnType<typeof generateEmbedding>> | null = null;
    let translation: Awaited<ReturnType<typeof translatePoetically>> | null = null;
    let classification: ReturnType<typeof classifyPoetry> | null = null;

    // STAGE 1: CRAWLER (we already have the text — record fetch)
    {
      const t0 = Date.now();
      itemStages.push({
        stageName: "CRAWLER",
        status: "SUCCESS",
        durationMs: Date.now() - t0,
        message: `Fetched ${item.rawText.length} chars from ${item.sourceUrl}`,
      });
    }

    // STAGE 2: PREFILTER — noise filter
    {
      const t0 = Date.now();
      const text = item.rawText.trim();
      if (text.length < 30) {
        itemStages.push({
          stageName: "PREFILTER",
          status: "FAILED",
          durationMs: Date.now() - t0,
          message: "Text too short",
        });
        rejected = true;
      } else {
        itemStages.push({
          stageName: "PREFILTER",
          status: "SUCCESS",
          durationMs: Date.now() - t0,
          message: `Passed length check (${text.length} chars)`,
        });
      }
    }
    if (rejected) {
      rejectedCount++;
      allStageResults.push(...itemStages);
      continue;
    }

    // STAGE 3: LANGUAGE DETECTION
    {
      const t0 = Date.now();
      language = item.language || detectLanguage(item.rawText);
      itemStages.push({
        stageName: "LANG_DETECT",
        status: "SUCCESS",
        confidence: 0.95,
        durationMs: Date.now() - t0,
        message: `Detected language: ${language}`,
      });
    }

    // STAGE 4: POETRY CLASSIFIER
    {
      const t0 = Date.now();
      classification = classifyPoetry(item.rawText, language);
      itemStages.push({
        stageName: "POETRY_CLASSIFIER",
        status: classification.isPoetry ? "SUCCESS" : "FAILED",
        confidence: classification.confidence,
        durationMs: Date.now() - t0,
        message: classification.isPoetry
          ? `Poetry confirmed (${classification.confidence.toFixed(3)} ≥ ${POETRY_CONFIDENCE_THRESHOLD})`
          : `Rejected: ${classification.rejectedReasons.join("; ")}`,
        metadata: { layers: classification.layers, mood: classification.mood, theme: classification.theme },
      });
      if (!classification.isPoetry) {
        rejected = true;
        rejectedCount++;
        allStageResults.push(...itemStages);
        continue;
      }
    }

    // STAGE 5: LICENSE CHECKER — CRITICAL
    {
      const t0 = Date.now();
      license = detectLicense(item.sourceUrl);
      itemStages.push({
        stageName: "LICENSE_CHECKER",
        status: license.canStoreFullText ? "SUCCESS" : "FAILED",
        confidence: license.licenseConfidence,
        durationMs: Date.now() - t0,
        message: `License: ${license.licenseType} → ${license.legalityScore}`,
        metadata: { policy: license.copyrightPolicy, canStoreFullText: license.canStoreFullText },
      });
      if (license.legalityScore === "BLOCKED") {
        // BLOCKED → discard entire item
        rejected = true;
        rejectedCount++;
        allStageResults.push(...itemStages);
        continue;
      }
      if (license.legalityScore === "LIMITED") {
        // LIMITED → metadata-only storage
        quarantined = true;
      }
    }

    // STAGE 6: DEDUPLICATION
    {
      const t0 = Date.now();
      // Need embedding first for similarity dedup
      embedding = await generateEmbedding(item.rawText);
      const dup = await findDuplicate(item.rawText, embedding.vector);
      itemStages.push({
        stageName: "DEDUP",
        status: dup.duplicateScore < 0.92 ? "SUCCESS" : "FAILED",
        confidence: 1 - dup.duplicateScore,
        durationMs: Date.now() - t0,
        message:
          dup.duplicateScore >= 0.92
            ? `Duplicate detected (score=${dup.duplicateScore.toFixed(3)}, matched=${dup.matchedPoemId})`
            : `Unique (max similarity=${dup.duplicateScore.toFixed(3)})`,
        metadata: { matchedPoemId: dup.matchedPoemId },
      });
      if (dup.duplicateScore >= 0.92) {
        rejected = true;
        rejectedCount++;
        allStageResults.push(...itemStages);
        continue;
      }
    }

    // STAGE 7: TRANSLATION (LLM-powered, with fallback)
    {
      const t0 = Date.now();
      translation = await translatePoetically(item.rawText, language, item.title, item.author);
      if (translation.fallbackUsed) {
        degradedApis.push("TRANSLATION");
        fallbacksUsed.push(translation.model);
      }
      itemStages.push({
        stageName: "TRANSLATION",
        status: translation.fallbackUsed ? "RETRY" : "SUCCESS",
        confidence: translation.quality,
        durationMs: translation.durationMs,
        message: translation.fallbackUsed
          ? `LLM unavailable, used fallback: ${translation.model}`
          : `Translated (quality=${translation.quality.toFixed(3)})`,
        metadata: { model: translation.model },
      });
    }

    // STAGE 8: EMBEDDING (already generated in dedup stage — record it)
    {
      const t0 = Date.now();
      itemStages.push({
        stageName: "EMBEDDING",
        status: "SUCCESS",
        confidence: 1,
        durationMs: embedding?.durationMs ?? 0,
        message: `Generated ${embedding?.dim}-dim vector via ${embedding?.model}`,
      });
    }

    // STAGE 9: STORAGE — decide full text vs metadata-only
    {
      const t0 = Date.now();
      const canStoreFullText = license?.canStoreFullText ?? false;
      const qualityScore =
        0.4 * (classification?.confidence ?? 0) +
        0.3 * (translation?.quality ?? 0) +
        0.3 * (license?.licenseConfidence ?? 0);

      const poem = await db.poem.create({
        data: {
          title: item.title || "Untitled",
          author: item.author || "Anonymous",
          language,
          country: item.country || null,
          genre: classification?.genre || null,
          mood: classification?.mood || null,
          theme: classification?.theme || null,
          licenseType: license?.licenseType || "UNKNOWN",
          licenseConfidence: license?.licenseConfidence || 0,
          legalityScore: license?.legalityScore || "BLOCKED",
          sourceUrl: item.sourceUrl,
          // CRITICAL RULE: only store full original text if license is SAFE
          originalText: canStoreFullText ? item.rawText : null,
          persianTranslation: translation?.persianTranslation || "",
          poetryConfidence: classification?.confidence || 0,
          translationQuality: translation?.quality || 0,
          duplicateScore: 0,
          qualityScore,
          embeddingVector: embedding?.vector || null,
          similarityIndex: 0,
          status: quarantined ? "QUARANTINE" : "APPROVED",
          pipelineRunId: run.id,
          sourceId: sourceId || null,
        },
      });

      // Persist stage results
      for (const s of itemStages) {
        await db.stageResult.create({
          data: {
            poemId: poem.id,
            stageName: s.stageName,
            status: s.status,
            confidence: s.confidence ?? null,
            durationMs: s.durationMs ?? null,
            message: s.message ?? null,
            metadata: s.metadata ? JSON.stringify(s.metadata) : null,
          },
        });
      }

      itemStages.push({
        stageName: "STORAGE",
        status: "SUCCESS",
        durationMs: Date.now() - t0,
        message: quarantined
          ? `Stored metadata-only (poem id=${poem.id}, license=LIMITED)`
          : `Stored full record (poem id=${poem.id}, license=SAFE)`,
      });

      if (quarantined) quarantineCount++;
      else outputCount++;
    }

    allStageResults.push(...itemStages);

    // Log API health observation
    await db.analyticsEvent.create({
      data: {
        eventType: "INGEST",
        entity: item.sourceUrl,
        value: 1,
        unit: "poem",
        meta: JSON.stringify({ language, trigger }),
      },
    });
  }

  // Aggregate stage stats
  const stageStats: Record<string, { success: number; failed: number; skipped: number; avgMs: number }> = {};
  for (const s of allStageResults) {
    const k = s.stageName;
    if (!stageStats[k]) stageStats[k] = { success: 0, failed: 0, skipped: 0, avgMs: 0 };
    if (s.status === "SUCCESS") stageStats[k].success++;
    else if (s.status === "FAILED" || s.status === "RETRY") stageStats[k].failed++;
    else stageStats[k].skipped++;
    stageStats[k].avgMs += s.durationMs ?? 0;
  }
  for (const k of Object.keys(stageStats)) {
    const total = stageStats[k].success + stageStats[k].failed + stageStats[k].skipped;
    stageStats[k].avgMs = total > 0 ? Math.round(stageStats[k].avgMs / total) : 0;
  }

  const status: PipelineRunResult["status"] =
    degradedApis.length > 0 ? "DEGRADED" : rejectedCount === items.length && items.length > 0 ? "FAILED" : "SUCCESS";

  await db.pipelineRun.update({
    where: { id: run.id },
    data: {
      status,
      outputCount,
      rejectedCount,
      quarantineCount,
      stageStats: JSON.stringify(stageStats),
      degradedApis: JSON.stringify([...new Set(degradedApis)]),
      fallbacksUsed: JSON.stringify([...new Set(fallbacksUsed)]),
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt,
    },
  });

  // Log to system log
  await db.systemLog.create({
    data: {
      level: status === "FAILED" ? "ERROR" : status === "DEGRADED" ? "WARN" : "INFO",
      category: "PIPELINE",
      message: `Pipeline run ${run.id} ${status}: ${outputCount} stored, ${quarantineCount} quarantined, ${rejectedCount} rejected`,
      detail: JSON.stringify({ degradedApis, fallbacksUsed, durationMs: Date.now() - startedAt }),
      traceId: run.id,
      autoRecovered: degradedApis.length > 0,
    },
  });

  return {
    runId: run.id,
    status,
    inputCount: items.length,
    outputCount,
    rejectedCount,
    quarantineCount,
    stages: allStageResults,
    degradedApis: [...new Set(degradedApis)],
    fallbacksUsed: [...new Set(fallbacksUsed)],
    durationMs: Date.now() - startedAt,
  };
}
