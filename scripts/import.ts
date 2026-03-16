import { PrismaClient } from "@prisma/client";
import { parseExcelFile } from "../src/lib/excel";

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Parseando archivo Excel...");
    const videos = parseExcelFile();
    console.log(`Encontrados ${videos.length} videos en el Excel.`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const video of videos) {
      try {
        const existing = await prisma.video.findUnique({
          where: { youtubeId: video.youtubeId },
        });

        if (existing) {
          await prisma.video.update({
            where: { youtubeId: video.youtubeId },
            data: {
              title: video.title,
              channelName: video.channelName,
              publishedAt: video.publishedAt,
              description: video.description,
              keywords: video.keywords,
            },
          });
          updated++;
        } else {
          await prisma.video.create({
            data: {
              youtubeId: video.youtubeId,
              url: video.url,
              title: video.title,
              channelName: video.channelName,
              publishedAt: video.publishedAt,
              description: video.description,
              keywords: video.keywords,
            },
          });
          imported++;
        }
      } catch (err) {
        errors++;
        console.error(
          `Error con ${video.youtubeId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(`\nResultados:`);
    console.log(`  Nuevos: ${imported}`);
    console.log(`  Actualizados: ${updated}`);
    console.log(`  Errores: ${errors}`);
    console.log(`  Total procesados: ${videos.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
