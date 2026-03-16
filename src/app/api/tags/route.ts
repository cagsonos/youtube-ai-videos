import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  const allTagRows = await prisma.video.findMany({
    where: {
      OR: [
        { aiTags: { not: null } },
        { keywords: { not: null } },
        { youtubeTags: { not: null } },
      ],
    },
    select: { aiTags: true, keywords: true, youtubeTags: true },
  });

  const tagMap = new Map<string, { name: string; count: number }>();

  function cleanTag(tag: string): string {
    let cleaned = tag.trim();
    cleaned = cleaned.replace(/\*\*/g, "");
    cleaned = cleaned.replace(/^[•·*\-–—]\s*/, "");
    cleaned = cleaned.replace(/^<[^>]+>:?\s*/, "");
    cleaned = cleaned.replace(/^["'""'']+|["'""'']+$/g, "");
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned;
  }

  // Collect tags per video (deduplicated within each video)
  function getVideoTags(row: { aiTags: string | null; keywords: string | null; youtubeTags: string | null }): string[] {
    const seen = new Map<string, string>();

    function add(tag: string) {
      const cleaned = cleanTag(tag);
      if (!cleaned || cleaned.length > 50) return;
      const key = cleaned.toLowerCase().replace(/\s+/g, "");
      if (!seen.has(key)) seen.set(key, cleaned);
    }

    if (row.aiTags) {
      try {
        const parsed = JSON.parse(row.aiTags);
        if (Array.isArray(parsed)) parsed.forEach((t: string) => add(t));
      } catch { /* skip */ }
    }
    if (row.keywords) {
      for (const line of row.keywords.split(/\n/)) {
        const boldMatches = [...line.matchAll(/\*\*([^*]+)\*\*/g)];
        if (boldMatches.length > 0) {
          for (const m of boldMatches) add(m[1]);
        } else {
          for (const part of line.split(/-/)) {
            const trimmed = part.trim();
            if (trimmed) add(trimmed);
          }
        }
      }
    }
    if (row.youtubeTags) {
      try {
        const parsed = JSON.parse(row.youtubeTags);
        if (Array.isArray(parsed)) parsed.forEach((t: string) => add(t));
      } catch { /* skip */ }
    }

    return Array.from(seen.values());
  }

  for (const row of allTagRows) {
    for (const tag of getVideoTags(row)) {
      const key = tag.toLowerCase().replace(/\s+/g, "");
      const existing = tagMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        tagMap.set(key, { name: tag, count: 1 });
      }
    }
  }

  return NextResponse.json(
    Array.from(tagMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
  );
}
