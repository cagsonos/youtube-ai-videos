import type { Prisma } from "@prisma/client";

interface FilterParams {
  q?: string;
  canal?: string;
  categoria?: string;
  tags?: string;
  enriched?: string;
}

export function buildVideoConditions(params: FilterParams): Prisma.VideoWhereInput[] {
  const conditions: Prisma.VideoWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { title: { contains: params.q } },
        { description: { contains: params.q } },
        { keywords: { contains: params.q } },
        { channelName: { contains: params.q } },
        { notes: { contains: params.q } },
        { aiTags: { contains: params.q } },
        { youtubeTags: { contains: params.q } },
        { category: { contains: params.q } },
      ],
    });
  }

  if (params.canal) {
    conditions.push({ channelName: params.canal });
  }

  if (params.categoria) {
    conditions.push({ category: params.categoria });
  }

  if (params.tags) {
    const tagList = params.tags.split(",").map((t) => t.trim()).filter(Boolean);
    for (const t of tagList) {
      conditions.push({
        OR: [
          { keywords: { contains: t } },
          { aiTags: { contains: t } },
          { youtubeTags: { contains: t } },
        ],
      });
    }
  }

  if (params.enriched === "true") {
    conditions.push({ isEnriched: true });
  } else if (params.enriched === "false") {
    conditions.push({ isEnriched: false });
  }

  return conditions;
}

export function buildVideoConditionsExcluding(
  params: FilterParams,
  excludeKey: keyof FilterParams
): Prisma.VideoWhereInput[] {
  const filtered = { ...params };
  delete filtered[excludeKey];
  return buildVideoConditions(filtered);
}
