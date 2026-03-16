import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

async function migrate() {
  // Source: local SQLite
  const dbPath = path.resolve(__dirname, "../prisma/dev.db");
  const local = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  // Create table in Turso first using raw libsql client
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("Creating table in Turso...");
  await libsql.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "Video" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "youtubeId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "thumbnailUrl" TEXT,
      "channelName" TEXT NOT NULL DEFAULT '',
      "channelId" TEXT,
      "channelThumbnailUrl" TEXT,
      "publishedAt" DATETIME,
      "duration" TEXT,
      "viewCount" INTEGER,
      "likeCount" INTEGER,
      "commentCount" INTEGER,
      "aiSummary" TEXT,
      "aiTags" TEXT,
      "youtubeTags" TEXT,
      "keywords" TEXT,
      "category" TEXT,
      "language" TEXT,
      "isEnriched" BOOLEAN NOT NULL DEFAULT false,
      "enrichedAt" DATETIME,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Video_youtubeId_key" ON "Video"("youtubeId");
  `);
  console.log("Table created!");

  // Destination: Turso via Prisma
  const adapter = new PrismaLibSQL({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const turso = new PrismaClient({ adapter } as never);

  const videos = await local.video.findMany();
  console.log(`Found ${videos.length} videos in local DB`);

  let migrated = 0;
  let skipped = 0;

  for (const video of videos) {
    try {
      const { id, ...data } = video;
      await turso.video.upsert({
        where: { youtubeId: video.youtubeId },
        create: data,
        update: data,
      });
      migrated++;
      if (migrated % 10 === 0) console.log(`  Migrated ${migrated}/${videos.length}`);
    } catch (err: any) {
      console.error(`  Error migrating ${video.youtubeId}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}`);

  await local.$disconnect();
  await turso.$disconnect();
}

migrate().catch(console.error);
