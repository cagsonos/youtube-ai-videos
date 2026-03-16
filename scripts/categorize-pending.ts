import { PrismaClient } from "@prisma/client";
import { categorizeVideo } from "../src/lib/ai";

const prisma = new PrismaClient();

async function main() {
  const videos = await prisma.video.findMany({
    where: { category: null },
    orderBy: { id: "asc" },
  });

  console.log(`\n📋 Videos sin categoría: ${videos.length}\n`);

  let success = 0;
  let errors = 0;
  const categoryCounts: Record<string, number> = {};

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const progress = `[${i + 1}/${videos.length}]`;

    try {
      const result = await categorizeVideo({
        title: video.title,
        description: video.description,
        channelName: video.channelName,
        keywords: video.keywords,
      });

      await prisma.video.update({
        where: { id: video.id },
        data: {
          category: result.category,
          language: result.language,
          aiTags:
            result.tags.length > 0 ? JSON.stringify(result.tags) : undefined,
        },
      });

      categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1;
      success++;
      console.log(`${progress} ✅ ${result.category} — ${video.title.substring(0, 60)}`);
    } catch (err) {
      errors++;
      console.log(`${progress} ❌ Error: ${err instanceof Error ? err.message : err} — ${video.title.substring(0, 60)}`);
    }

    // Rate limit
    if (i < videos.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\n✅ Completado: ${success} categorizados, ${errors} errores\n`);
  console.log("Categorías asignadas:");
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${count}x ${cat}`));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
