import { NextRequest, NextResponse } from "next/server";
import { translatePoetically } from "@/lib/bleumea/translator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = body.text || "";
    const sourceLanguage: string = body.sourceLanguage || "en";
    const title: string | undefined = body.title;
    const author: string | undefined = body.author;

    const options = {
      apiKey: body.apiKey,
      baseURL: body.baseURL,
      model: body.model,
    };

    if (!text.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const result = await translatePoetically(text, sourceLanguage, title, author, options);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
