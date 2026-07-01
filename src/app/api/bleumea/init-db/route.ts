import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// GET /api/bleumea/init-db — ساخت خودکار جداول دیتابیس
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!databaseUrl) {
    return NextResponse.json({
      success: false,
      error: "DATABASE_URL تنظیم نشده. اول Turso بساز و Environment Variables رو تنظیم کن.",
    }, { status: 500 });
  }

  try {
    const client = createClient({
      url: databaseUrl,
      authToken: authToken || "",
    });

    const log: string[] = [];

    // ساخت جدول Poem
    log.push("ساخت جدول Poem...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Poem" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "title" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "language" TEXT NOT NULL,
        "country" TEXT,
        "genre" TEXT,
        "mood" TEXT,
        "theme" TEXT,
        "licenseType" TEXT NOT NULL DEFAULT 'UNKNOWN',
        "licenseConfidence" REAL NOT NULL DEFAULT 0,
        "legalityScore" TEXT NOT NULL DEFAULT 'BLOCKED',
        "sourceUrl" TEXT,
        "originalText" TEXT,
        "persianTranslation" TEXT NOT NULL,
        "poetryConfidence" REAL NOT NULL DEFAULT 0,
        "translationQuality" REAL NOT NULL DEFAULT 0,
        "duplicateScore" REAL NOT NULL DEFAULT 0,
        "qualityScore" REAL NOT NULL DEFAULT 0,
        "embeddingVector" TEXT,
        "similarityIndex" REAL,
        "pipelineRunId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'APPROVED',
        "version" INTEGER NOT NULL DEFAULT 1,
        "versionHistory" TEXT NOT NULL DEFAULT '[]',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "discoveredAt" DATETIME,
        "isSaved" BOOLEAN NOT NULL DEFAULT true,
        "sourceId" TEXT
      );
    `);
    log.push("✅ جدول Poem ساخته شد");

    // ساخت جدول Source
    log.push("ساخت جدول Source...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Source" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "region" TEXT,
        "language" TEXT,
        "description" TEXT,
        "termsUrl" TEXT,
        "licenseType" TEXT NOT NULL DEFAULT 'UNKNOWN',
        "legalityScore" TEXT NOT NULL DEFAULT 'BLOCKED',
        "licenseConfidence" REAL NOT NULL DEFAULT 0,
        "copyrightPolicy" TEXT,
        "lastLicenseScan" DATETIME,
        "licenseScanCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "healthScore" REAL NOT NULL DEFAULT 1,
        "lastCrawlAt" DATETIME,
        "crawlCount" INTEGER NOT NULL DEFAULT 0,
        "itemsIngested" INTEGER NOT NULL DEFAULT 0,
        "itemsRejected" INTEGER NOT NULL DEFAULT 0,
        "errorRate" REAL NOT NULL DEFAULT 0,
        "fingerprintHash" TEXT,
        "lastHealthCheck" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    log.push("✅ جدول Source ساخته شد");

    // ساخت جدول Setting
    log.push("ساخت جدول Setting...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    log.push("✅ جدول Setting ساخته شد");

    // ساخت جدول PipelineRun
    log.push("ساخت جدول PipelineRun...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "PipelineRun" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'RUNNING',
        "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
        "inputCount" INTEGER NOT NULL DEFAULT 0,
        "outputCount" INTEGER NOT NULL DEFAULT 0,
        "rejectedCount" INTEGER NOT NULL DEFAULT 0,
        "quarantineCount" INTEGER NOT NULL DEFAULT 0,
        "stageStats" TEXT NOT NULL DEFAULT '{}',
        "degradedApis" TEXT NOT NULL DEFAULT '[]',
        "fallbacksUsed" TEXT NOT NULL DEFAULT '[]',
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "finishedAt" DATETIME,
        "durationMs" INTEGER
      );
    `);
    log.push("✅ جدول PipelineRun ساخته شد");

    // شمارش رکوردها
    const poemCount = await client.execute("SELECT COUNT(*) as count FROM Poem");
    const sourceCount = await client.execute("SELECT COUNT(*) as count FROM Source");

    log.push(`📊 اشعار موجود: ${poemCount.rows[0].count}`);
    log.push(`📊 منابع موجود: ${sourceCount.rows[0].count}`);

    return NextResponse.json({
      success: true,
      message: "جداول دیتابیس با موفقیت ساخته شدند!",
      log,
      stats: {
        poems: poemCount.rows[0].count,
        sources: sourceCount.rows[0].count,
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
