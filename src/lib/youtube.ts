export interface YouTubeVideoDetails {
  thumbnailUrl: string | null;
  duration: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  channelId: string | null;
  channelThumbnailUrl: string | null;
  youtubeTags: string[];
  youtubeTitle: string | null;
  youtubeDescription: string | null;
}

interface YouTubeApiItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    tags?: string[];
    thumbnails?: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

function getBestThumbnail(
  thumbnails: NonNullable<YouTubeApiItem["snippet"]>["thumbnails"]
): string | null {
  if (!thumbnails) return null;
  return (
    thumbnails.maxres?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  );
}

export async function fetchVideoDetails(
  videoIds: string[]
): Promise<Map<string, YouTubeVideoDetails>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY no configurada");

  const results = new Map<string, YouTubeVideoDetails>();
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const ids = batch.join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${ids}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const items: YouTubeApiItem[] = data.items || [];

    for (const item of items) {
      results.set(item.id, {
        thumbnailUrl: getBestThumbnail(item.snippet?.thumbnails),
        duration: item.contentDetails?.duration || null,
        viewCount: item.statistics?.viewCount
          ? parseInt(item.statistics.viewCount, 10)
          : null,
        likeCount: item.statistics?.likeCount
          ? parseInt(item.statistics.likeCount, 10)
          : null,
        commentCount: item.statistics?.commentCount
          ? parseInt(item.statistics.commentCount, 10)
          : null,
        channelId: item.snippet?.channelId || null,
        channelThumbnailUrl: null, // requires separate channels.list call
        youtubeTags: item.snippet?.tags || [],
        youtubeTitle: item.snippet?.title || null,
        youtubeDescription: item.snippet?.description || null,
      });
    }
  }

  return results;
}
