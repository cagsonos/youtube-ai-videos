import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results = await prisma.video.groupBy({
    by: ["category"],
    where: { category: { not: null } },
    _count: { category: true },
    orderBy: { category: "asc" },
  });

  const categories = results
    .filter((r) => r.category != null)
    .map((r) => ({
      name: r.category as string,
      count: r._count.category,
    }));

  return NextResponse.json({ categories });
}
