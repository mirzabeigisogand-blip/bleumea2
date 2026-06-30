import { NextRequest, NextResponse } from "next/server";
import { translatePoetically } from "@/lib/bleumea/translator";

// POST /api/bleumea/translate — translate raw text into poetic Persian
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text: string = body.text || "";
  const sourceLanguage: string = body.sourceLanguage || "en";
  const title: string | undefined = body.title;
  const author: string | undefined = body.author;

  if (!text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const result = await translatePoetically(text, sourceLanguage, title, author);
  return NextResponse.json({ result });
}
