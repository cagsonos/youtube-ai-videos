"use client";

import Image from "next/image";
import Link from "next/link";
import { TagBadge, CATEGORY_DOT_COLORS } from "./TagBadge";
import { ExternalLink, Play, CheckCircle, Clock, Trash2 } from "lucide-react";

interface VideoCardProps {
  video: {
    id: number;
    youtubeId: string;
    url: string;
    title: string;
    channelName: string;
    publishedAt: string | null;
    thumbnailUrl: string | null;
    isEnriched: boolean;
    category: string | null;
    keywords: string | null;
    aiTags: string | null;
    description: string;
  };
  index?: number;
  onDelete?: (id: number) => void;
}

function parseTags(keywords: string | null, aiTags: string | null): string[] {
  const tags: string[] = [];

  if (aiTags) {
    try {
      const parsed = JSON.parse(aiTags);
      if (Array.isArray(parsed)) tags.push(...parsed);
    } catch {
      // ignore
    }
  }

  if (tags.length === 0 && keywords) {
    const parts = keywords
      .split(/[-\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    tags.push(...parts);
  }

  return tags.sort((a, b) => a.localeCompare(b, "es")).slice(0, 3);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
  });
}

export function VideoCard({ video, index = 0, onDelete }: VideoCardProps) {
  const tags = parseTags(video.keywords, video.aiTags);
  const thumbnailUrl =
    video.thumbnailUrl ||
    `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  const categoryDotColor = video.category
    ? CATEGORY_DOT_COLORS[video.category] || CATEGORY_DOT_COLORS["Otros"]
    : null;

  return (
    <div
      className={`animate-card-reveal group relative bg-card rounded-xl border overflow-hidden card-glow transition-all duration-300 hover:-translate-y-1 ${
        video.isEnriched
          ? "border-border/60 hover:border-teal/40 animate-border-glow"
          : "border-border/60 border-b-2 border-b-amber/30 border-dashed hover:border-teal/40"
      }`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Link href={`/video/${video.id}`} className="block absolute inset-0">
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading="lazy"
            unoptimized
          />
          {/* Gradient overlay — always visible for cinematic depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-teal/90 rounded-full p-3 shadow-lg shadow-teal/30 backdrop-blur-sm transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
        </Link>

        {/* Category color dot (top-left) */}
        {categoryDotColor && (
          <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${categoryDotColor} shadow-sm`} />
            <span className="text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
              {video.category}
            </span>
          </div>
        )}

        {/* Enrichment indicator */}
        <div className="absolute top-2 right-2 pointer-events-none">
          {video.isEnriched ? (
            <div className="flex items-center gap-1 bg-teal/20 backdrop-blur-md text-teal text-[10px] px-2 py-0.5 rounded-full border border-teal/20">
              <CheckCircle className="w-3 h-3" />
              <span className="font-medium">Listo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-amber/15 backdrop-blur-md text-amber text-[10px] px-2 py-0.5 rounded-full border border-amber/20">
              <Clock className="w-3 h-3" />
              <span className="font-medium">Pendiente</span>
            </div>
          )}
        </div>

        {/* YouTube link on hover */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 backdrop-blur-md rounded-full p-1.5 hover:bg-white/20"
        >
          <ExternalLink className="w-3.5 h-3.5 text-white" />
        </a>

        {/* Delete button on hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm("¿Eliminar este video de la biblioteca?")) {
                onDelete(video.id);
              }
            }}
            className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-destructive/20 backdrop-blur-md rounded-full p-1.5 border border-destructive/25 hover:bg-destructive/80 hover:border-destructive/60 hover:shadow-lg hover:shadow-destructive/30 hover:scale-110"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
          </button>
        )}

        {/* Description overlay on hover */}
        {video.description && (
          <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none">
            <div className="glass px-3 py-2 border-t border-white/10">
              <p className="text-[11px] text-white/80 line-clamp-2 leading-relaxed">
                {video.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2">
        <Link href={`/video/${video.id}`}>
          <h3 className="text-sm font-bold leading-snug line-clamp-2 text-foreground/90 group-hover:text-teal transition-colors duration-200">
            {video.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[65%] font-medium">
            {video.channelName}
          </span>
          <span className="opacity-70">{formatDate(video.publishedAt)}</span>
        </div>

        {/* Category + Tags */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {video.category && (
            <TagBadge variant="category">{video.category}</TagBadge>
          )}
          {tags.map((tag, i) => (
            <TagBadge key={i}>{tag}</TagBadge>
          ))}
        </div>
      </div>
    </div>
  );
}
