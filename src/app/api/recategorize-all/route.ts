import { prisma } from "@/lib/prisma";
import { categorizeVideo } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { model, onlyUncategorized } = await request.json().catch(() => ({} as { model?: string; onlyUncategorized?: boolean }));
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      // Get videos (all or only uncategorized)
      const videos = await prisma.video.findMany({
        where: onlyUncategorized ? { category: null } : undefined,
        orderBy: { id: "asc" },
      });

      const total = videos.length;
      send({ type: "start", total });

      // Track categories as they appear
      const seenCategories: string[] = [];

      // Step 3: Categorize each video
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        send({
          type: "progress",
          current: i + 1,
          total,
          title: video.title,
          youtubeId: video.youtubeId,
        });

        try {
          const result = await categorizeVideo({
            title: video.title,
            description: video.description,
            channelName: video.channelName,
            keywords: video.keywords,
            model,
          });

          // Track seen categories for progress reporting
          if (!seenCategories.includes(result.category)) {
            seenCategories.push(result.category);
            send({
              type: "new_category",
              category: result.category,
              categories: seenCategories,
            });
          }

          await prisma.video.update({
            where: { id: video.id },
            data: {
              category: result.category,
              language: result.language,
              aiTags:
                result.tags.length > 0
                  ? JSON.stringify(result.tags)
                  : undefined,
            },
          });

          send({
            type: "categorized",
            current: i + 1,
            total,
            youtubeId: video.youtubeId,
            category: result.category,
          });
        } catch (err) {
          send({
            type: "error",
            youtubeId: video.youtubeId,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Rate limit delay
        if (i < videos.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      send({ type: "done", total, categories: seenCategories });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
