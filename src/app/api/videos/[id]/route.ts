import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id: Number(id) },
  });

  if (!video) {
    return NextResponse.json(
      { error: "Video no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(video);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["notes", "aiTags", "keywords", "category"];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      if (field === "aiTags" && Array.isArray(body[field])) {
        updateData[field] = JSON.stringify(body[field]);
      } else {
        updateData[field] = body[field];
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No hay campos válidos para actualizar" },
      { status: 400 }
    );
  }

  try {
    const video = await prisma.video.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(video);
  } catch {
    return NextResponse.json(
      { error: "Video no encontrado" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.video.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ message: "Video eliminado" });
  } catch {
    return NextResponse.json(
      { error: "Video no encontrado" },
      { status: 404 }
    );
  }
}
