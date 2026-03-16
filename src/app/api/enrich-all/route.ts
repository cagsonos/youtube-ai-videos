import { prisma } from "@/lib/prisma";
import { fetchVideoDetails, type YouTubeVideoDetails } from "@/lib/youtube";
import { enrichVideo } from "@/lib/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONCURRENCY = 3;

export async function POST(request: Request) {
  const { model } = await request.json().catch(() => ({} as { model?: string }));
  const videos = await prisma.video.findMany({
    where: { isEnriched: false },
    orderBy: { id: "asc" },
  });

  const total = videos.length;
  if (total === 0) {
    return new Response(
      JSON.stringify({ message: "Todos los videos ya están enriquecidos" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      send({ type: "start", total });

      // Batch YouTube API calls (50 at a time)
      const youtubeMap = new Map<string, YouTubeVideoDetails>();
      try {
        const allIds = videos.map((v) => v.youtubeId);
        const details = await fetchVideoDetails(allIds);
        details.forEach((v, k) => youtubeMap.set(k, v));
        send({ type: "youtube_done", fetched: youtubeMap.size });
      } catch (err) {
        send({
          type: "youtube_error",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Process AI enrichment with bounded concurrency
      let completed = 0;
      const queue = videos.map((video, i) => ({ video, index: i }));

      async function processOne(item: (typeof queue)[number]) {
        const { video, index } = item;
        send({
          type: "progress",
          current: index + 1,
          total,
          title: video.title,
          youtubeId: video.youtubeId,
        });

        try {
          const ytDetail = youtubeMap.get(video.youtubeId);
          const { status } = await enrichVideo(video, {
            model,
            ytDetail: ytDetail || undefined,
          });

          completed++;

          if (!status.youtubeOk && !status.claudeOk) {
            send({
              type: "error",
              youtubeId: video.youtubeId,
              error: "Ambas APIs fallaron — video NO marcado como enriquecido",
            });
          } else {
            if (status.summaryError) {
              send({
                type: "summary_error",
                youtubeId: video.youtubeId,
                error: status.summaryError,
              });
            }
            if (status.claudeError) {
              send({
                type: "claude_error",
                youtubeId: video.youtubeId,
                error: status.claudeError,
              });
            }
            send({
              type: "enriched",
              current: completed,
              total,
              youtubeId: video.youtubeId,
              youtubeOk: status.youtubeOk,
              claudeOk: status.claudeOk,
            });
          }
        } catch (err) {
          completed++;
          send({
            type: "error",
            youtubeId: video.youtubeId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Run with bounded concurrency
      const executing = new Set<Promise<void>>();
      for (const item of queue) {
        const p = processOne(item).then(() => {
          executing.delete(p);
        });
        executing.add(p);
        if (executing.size >= CONCURRENCY) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);

      send({ type: "done", total });
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
