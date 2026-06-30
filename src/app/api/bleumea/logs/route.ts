import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/logs — paginated logs with filters
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const level = params.get("level");
  const category = params.get("category");
  const page = parseInt(params.get("page") || "1");
  const pageSize = Math.min(parseInt(params.get("pageSize") || "50"), 200);

  const where: any = {};
  if (level) where.level = level;
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    db.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.systemLog.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
