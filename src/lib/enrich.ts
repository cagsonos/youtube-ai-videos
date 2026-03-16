import { prisma } from "@/lib/prisma";
import { fetchVideoDetails, type YouTubeVideoDetails } from "@/lib/youtube";
import { categorizeVideo, summarizeVideo } from "@/lib/ai";
import type { Video } from "@prisma/client";

export interface EnrichResult {
  youtubeOk: boolean;
  claudeOk: boolean;
  youtubeError?: string;
  claudeError?: string;
  summaryError?: string;
}

function buildYoutubeUpdate(detail: YouTubeVideoDetails) {
  return {
    thumbnailUrl: detail.thumbnailUrl,
    duration: detail.duration,
    viewCount: detail.viewCount,
    likeCount: detail.likeCount,
    commentCount: detail.commentCount,
    channelId: detail.channelId,
    youtubeTags: detail.youtubeTags
      ? JSON.stringify(detail.youtubeTags)
      : null,
  };
}

/**
 * Enrich a single video with YouTube data + AI categorization/summary.
 * Optionally accepts pre-fetched YouTube details to avoid redundant API calls.
 */
export async function enrichVideo(
  video: Video,
  options: {
    model?: string;
    ytDetail?: YouTubeVideoDetails;
  } = {}
): Promise<{ updated: Video; status: EnrichResult }> {
  const { model, ytDetail: prefetchedDetail } = options;

  // YouTube data
  let youtubeUpdate: Record<string, unknown> = {};
  let youtubeOk = false;
  let youtubeError: string | undefined;
  let youtubeDescription: string | null = null;

  if (prefetchedDetail) {
    youtubeUpdate = buildYoutubeUpdate(prefetchedDetail);
    youtubeDescription = prefetchedDetail.youtubeDescription;
    youtubeOk = true;
  } else {
    try {
      const details = await fetchVideoDetails([video.youtubeId]);
      const detail = details.get(video.youtubeId);
      if (detail) {
        youtubeUpdate = buildYoutubeUpdate(detail);
        youtubeDescription = detail.youtubeDescription;
        youtubeOk = true;
      } else {
        youtubeError = "Video no encontrado en YouTube (puede ser privado o eliminado)";
      }
    } catch (err) {
      youtubeError = err instanceof Error ? err.message : "Error desconocido de YouTube";
    }
  }

  // AI categorization + summary
  let claudeUpdate: Record<string, unknown> = {};
  let claudeOk = false;
  let claudeError: string | undefined;
  let summaryError: string | undefined;

  try {
    const result = await categorizeVideo({
      title: video.title,
      description: video.description,
      channelName: video.channelName,
      keywords: video.keywords,
      model,
    });
    claudeUpdate = {
      category: result.category,
      language: result.language,
      aiTags: JSON.stringify(result.tags),
    };

    try {
      const summary = await summarizeVideo({
        title: video.title,
        description: video.description,
        channelName: video.channelName,
        youtubeDescription,
        model,
      });
      claudeUpdate.description = summary;
    } catch (err) {
      summaryError = err instanceof Error ? err.message : String(err);
    }

    claudeOk = true;
  } catch (err) {
    claudeError = err instanceof Error ? err.message : "Error desconocido de Claude";
  }

  const status: EnrichResult = {
    youtubeOk,
    claudeOk,
    youtubeError,
    claudeError,
    summaryError,
  };

  // Only update if at least one source succeeded
  if (!youtubeOk && !claudeOk) {
    return { updated: video, status };
  }

  const updated = await prisma.video.update({
    where: { id: video.id },
    data: {
      ...youtubeUpdate,
      ...claudeUpdate,
      aiSummary: null,
      isEnriched: true,
      enrichedAt: new Date(),
    },
  });

  return { updated, status };
}
