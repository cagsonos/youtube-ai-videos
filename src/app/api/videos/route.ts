import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVideoConditions } from "@/lib/buildVideoWhere";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const canal = searchParams.get("canal") || "";
  const categoria = searchParams.get("categoria") || "";
  const tags = searchParams.get("tags") || "";
  const enriched = searchParams.get("enriched");
  const sort = searchParams.get("sort") || "publishedAt";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 48;

  const conditions = buildVideoConditions({
    q: q || undefined,
    canal: canal || undefined,
    categoria: categoria || undefined,
    tags: tags || undefined,
    enriched: enriched || undefined,
  });

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const orderByMap: Record<string, Record<string, string>> = {
    publishedAt: { publishedAt: order },
    viewCount: { viewCount: order },
    title: { title: order },
    enrichedAt: { enrichedAt: order },
    createdAt: { createdAt: order },
  };

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: orderByMap[sort] || { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.video.count({ where }),
  ]);

  return NextResponse.json({
    videos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
