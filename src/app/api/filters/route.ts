import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVideoConditionsExcluding, buildVideoConditions } from "@/lib/buildVideoWhere";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = {
    q: searchParams.get("q") || undefined,
    canal: searchParams.get("canal") || undefined,
    categoria: searchParams.get("categoria") || undefined,
    tags: searchParams.get("tags") || undefined,
    enriched: searchParams.get("enriched") || undefined,
  };

  // Exclude-self pattern: each dimension sees all filters except its own
  const channelConditions = buildVideoConditionsExcluding(params, "canal");
  const categoryConditions = buildVideoConditionsExcluding(params, "categoria");
  const tagConditions = buildVideoConditionsExcluding(params, "tags");
  const allConditions = buildVideoConditions(params);

  const channelWhere = channelConditions.length > 0 ? { AND: channelConditions } : {};
  const categoryWhere = categoryConditions.length > 0 ? { AND: categoryConditions } : {};
  const tagWhere = tagConditions.length > 0
    ? {
        AND: [
          ...tagConditions,
          {
            OR: [
              { aiTags: { not: null } },
              { keywords: { not: null } },
              { youtubeTags: { not: null } },
            ],
          },
        ],
      }
    : {
        OR: [
          { aiTags: { not: null } },
          { keywords: { not: null } },
          { youtubeTags: { not: null } },
        ],
      };
  const allWhere = allConditions.length > 0 ? { AND: allConditions } : {};

  const [channels, categories, tagRows, enrichedCount, filteredTotal, globalTotal] =
    await Promise.all([
      prisma.video.groupBy({
        by: ["channelName"],
        where: channelWhere,
        _count: { channelName: true },
        orderBy: { channelName: "asc" },
      }),
      prisma.video.groupBy({
        by: ["category"],
        where: { ...categoryWhere, category: { not: null } },
        _count: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.video.findMany({
        where: tagWhere,
        select: { aiTags: true, keywords: true, youtubeTags: true },
      }),
      prisma.video.count({ where: { ...allWhere, isEnriched: true } }),
      prisma.video.count({ where: allWhere }),
      prisma.video.count(),
    ]);

  // Aggregate tags
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

  function getVideoTags(row: {
    aiTags: string | null;
    keywords: string | null;
    youtubeTags: string | null;
  }): string[] {
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
      } catch {
        /* skip */
      }
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
      } catch {
        /* skip */
      }
    }

    return Array.from(seen.values());
  }

  for (const row of tagRows) {
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

  const tags = Array.from(tagMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  return NextResponse.json({
    channels: channels.map((c) => ({
      name: c.channelName,
      count: c._count.channelName,
    })),
    categories: categories
      .filter((c) => c.category != null)
      .map((c) => ({
        name: c.category as string,
        count: c._count.category,
      })),
    tags,
    stats: {
      total: globalTotal,
      enriched: enrichedCount,
      filtered: filteredTotal,
    },
  });
}
