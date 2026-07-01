// BLEUMEA — کراولر واقعی شعر از منابع آنلاین

export interface CrawledPoem {
  title: string;
  author: string;
  language: string;
  text: string;
  sourceUrl: string;
  sourceName: string;
}

async function crawlPoetryDB(): Promise<CrawledPoem | null> {
  try {
    const res = await fetch("https://poetrydb.org/random/1", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const poem = data[0];
    if (!poem.title || !poem.author || !poem.lines) return null;

    return {
      title: poem.title,
      author: poem.author,
      language: "en",
      text: Array.isArray(poem.lines) ? poem.lines.join("\n") : String(poem.lines),
      sourceUrl: `https://poetrydb.org/title/${encodeURIComponent(poem.title)}`,
      sourceName: "PoetryDB",
    };
  } catch {
    return null;
  }
}

const FALLBACK_POEMS = [
  {
    title: "The Lake Isle of Innisfree",
    author: "W.B. Yeats",
    text: "I will arise and go now, and go to Innisfree,\nAnd a small cabin build there, of clay and wattles made;\nNine bean-rows will I have there, a hive for the honey-bee,\nAnd live alone in the bee-loud glade.\n\nAnd I shall have some peace there, for peace comes dropping slow,\nDropping from the veils of the morning to where the cricket sings;\nThere midnight's all a glimmer, and noon a purple glow,\nAnd evening full of the linnet's wings.",
    language: "en",
  },
  {
    title: "The Tyger",
    author: "William Blake",
    text: "Tyger Tyger, burning bright,\nIn the forests of the night;\nWhat immortal hand or eye,\nCould frame thy fearful symmetry?",
    language: "en",
  },
  {
    title: "Ozymandias",
    author: "Percy Bysshe Shelley",
    text: "I met a traveller from an antique land,\nWho said—\"Two vast and trunkless legs of stone\nStand in the desert. . . . Near them, on the sand,\nHalf sunk a shattered visage lies, whose frown,\nAnd wrinkled lip, and sneer of cold command",
    language: "en",
  },
];

async function crawlFallback(): Promise<CrawledPoem | null> {
  const poem = FALLBACK_POEMS[Math.floor(Math.random() * FALLBACK_POEMS.length)];
  return {
    ...poem,
    sourceUrl: "https://gutenberg.org",
    sourceName: "Project Gutenberg",
  } as CrawledPoem;
}

export async function crawlPoem(): Promise<CrawledPoem | null> {
  const poem = await crawlPoetryDB();
  if (poem) return poem;
  return await crawlFallback();
}

export function validatePoem(poem: CrawledPoem): { valid: boolean; reason?: string } {
  if (poem.text.length < 20) return { valid: false, reason: "متن خیلی کوتاه است" };
  if (poem.text.length > 5000) return { valid: false, reason: "متن خیلی بلند است" };

  const lines = poem.text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { valid: false, reason: "شعر باید چند خطی باشد" };

  const avgLineLength = poem.text.length / lines.length;
  if (avgLineLength > 200) return { valid: false, reason: "خطوط خیلی بلند هستند (احتمالاً نثر)" };

  const lower = poem.text.toLowerCase();
  const noiseWords = [
    "click here", "subscribe", "buy now", "free shipping",
    "http://", "https://", "<script", "<div", "function(",
    "var ", "const ", "import ", "console.log",
    "lorem ipsum", "cookie", "privacy policy",
    "terms of service", "sign up", "log in",
  ];
  for (const noise of noiseWords) {
    if (lower.includes(noise)) return { valid: false, reason: `حاوی نویز: ${noise}` };
  }

  if (!poem.title || poem.title.length < 2) return { valid: false, reason: "عنوان نامعتبر" };
  if (!poem.author || poem.author.length < 2) return { valid: false, reason: "نویسنده نامعتبر" };
  if (poem.text.includes("<") && poem.text.includes(">")) return { valid: false, reason: "متن حاوی HTML است" };

  return { valid: true };
}
