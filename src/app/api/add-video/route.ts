import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractVideoId } from "@/lib/excel";
import { fetchVideoDetails } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL del video es requerida" },
        { status: 400 }
      );
    }

    const youtubeId = extractVideoId(url);
    if (!youtubeId) {
      return NextResponse.json(
        { error: "URL de YouTube no válida" },
        { status: 400 }
      );
    }

    const existing = await prisma.video.findUnique({
      where: { youtubeId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este video ya existe en la biblioteca" },
        { status: 409 }
      );
    }

    const details = await fetchVideoDetails([youtubeId]);
    const videoData = details.get(youtubeId);

    if (!videoData) {
      return NextResponse.json(
        { error: "No se pudo obtener información del video. Verifica que el link sea válido y el video sea público." },
        { status: 404 }
      );
    }

    const video = await prisma.video.create({
      data: {
        youtubeId,
        url,
        title: videoData.youtubeTitle || "Sin título",
        description: videoData.youtubeDescription || "",
        channelName: "",
        thumbnailUrl: videoData.thumbnailUrl,
        channelId: videoData.channelId,
        duration: videoData.duration,
        viewCount: videoData.viewCount,
        likeCount: videoData.likeCount,
        commentCount: videoData.commentCount,
        youtubeTags: videoData.youtubeTags.length > 0
          ? JSON.stringify(videoData.youtubeTags)
          : null,
      },
    });

    return NextResponse.json({ video });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al agregar video" },
      { status: 500 }
    );
  }
}
