import * as XLSX from "xlsx";
import path from "path";
import type { Video } from "@prisma/client";

export interface ExcelVideoRow {
  url: string;
  youtubeId: string;
  title: string;
  channelName: string;
  publishedAt: Date | null;
  description: string;
  keywords: string | null;
}

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?si=xxx
  const shortMatch = trimmed.match(
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const longMatch = trimmed.match(
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );
  if (shortsMatch) return shortsMatch[1];

  return null;
}

function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  // Excel serial number date
  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;

  // Format: DD/M/YYYY or D/M/YYYY
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  // Try native Date parsing as fallback
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function parseExcelFile(filePath?: string): ExcelVideoRow[] {
  const resolvedPath =
    filePath || path.join(process.cwd(), "data", "Lista de Videos AI.xlsx");

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(resolvedPath);
  } catch {
    throw new Error(`Cannot access file ${resolvedPath}`);
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  const videos: ExcelVideoRow[] = [];

  for (const row of rows) {
    const url = (row["Link"] || "").trim();
    if (!url) continue;

    const youtubeId = extractVideoId(url);
    if (!youtubeId) continue;

    const keywords = (row["Keywords"] || "").trim();
    const hasKeywords =
      keywords && keywords !== "No suministrada" && keywords.length > 0;

    videos.push({
      url,
      youtubeId,
      title: (row["Titulo"] || "").trim(),
      channelName: (row["Canal"] || "").trim(),
      publishedAt: parseDate(row["Fecha"] || ""),
      description: (row["Descripcion"] || "").trim(),
      keywords: hasKeywords ? keywords : null,
    });
  }

  return videos;
}

function parseJsonField(value: string | null): string {
  if (!value) return "";
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr.join(", ");
    return value;
  } catch {
    return value;
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export function exportVideosToExcel(videos: Video[]): Buffer {
  const rows = videos.map((v) => ({
    ID: v.id,
    "YouTube ID": v.youtubeId,
    URL: v.url,
    "Título": v.title,
    "Descripción": v.description,
    Thumbnail: v.thumbnailUrl ?? "",
    Canal: v.channelName,
    "Canal ID": v.channelId ?? "",
    "Canal Thumbnail": v.channelThumbnailUrl ?? "",
    "Fecha Publicación": formatDate(v.publishedAt),
    "Duración": v.duration ?? "",
    Vistas: v.viewCount ?? "",
    Likes: v.likeCount ?? "",
    Comentarios: v.commentCount ?? "",
    "Resumen IA": v.aiSummary ?? "",
    "Tags IA": parseJsonField(v.aiTags),
    "Tags YouTube": parseJsonField(v.youtubeTags),
    Keywords: v.keywords ?? "",
    "Categoría": v.category ?? "",
    Idioma: v.language ?? "",
    Enriquecido: v.isEnriched ? "Sí" : "No",
    "Fecha Enriquecimiento": formatDate(v.enrichedAt),
    Notas: v.notes ?? "",
    Creado: formatDate(v.createdAt),
    Actualizado: formatDate(v.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Biblioteca");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}
