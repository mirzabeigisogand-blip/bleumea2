import { NextResponse } from "next/server";
import { runQASuite, detectAnomalies } from "@/lib/bleumea/qa";

// GET /api/bleumea/qa — run QA suite + anomalies
export async function GET() {
  const [qa, anomalies] = await Promise.all([runQASuite(), detectAnomalies()]);
  return NextResponse.json({ qa, anomalies });
}
