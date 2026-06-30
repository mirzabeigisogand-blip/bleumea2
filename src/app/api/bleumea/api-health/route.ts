import { NextResponse } from "next/server";
import { getApiHealth } from "@/lib/bleumea/pipeline";

// GET /api/bleumea/api-health — multi-API health status
export async function GET() {
  const apis = getApiHealth();
  return NextResponse.json({ apis });
}
