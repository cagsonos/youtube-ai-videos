import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichVideo } from "@/lib/enrich";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, id, model } = body;

    const video = id
      ? await prisma.video.findUnique({ where: { id: Number(id) } })
      : await prisma.video.findUnique({ where: { youtubeId: videoId } });

    if (!video) {
      return NextResponse.json(
        { error: "Video no encontrado" },
        { status: 404 }
      );
    }

    const { updated, status } = await enrichVideo(video, { model });

    if (!status.youtubeOk && !status.claudeOk) {
      return NextResponse.json(
        {
          error: "No se pudo enriquecer el video",
          youtubeError: status.youtubeError,
          claudeError: status.claudeError,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...updated,
      _enrichStatus: {
        youtubeOk: status.youtubeOk,
        claudeOk: status.claudeOk,
        youtubeError: status.youtubeError,
        claudeError: status.claudeError,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error al enriquecer",
      },
      { status: 500 }
    );
  }
}
