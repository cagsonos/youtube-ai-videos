"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Trash2 } from "lucide-react";
import { CATEGORY_DOT_COLORS } from "./TagBadge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface VideoThumbnailProps {
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

export function VideoThumbnail({ video, index = 0, onDelete }: VideoThumbnailProps) {
  const thumbnailUrl =
    video.thumbnailUrl ||
    `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  const categoryDotColor = video.category
    ? CATEGORY_DOT_COLORS[video.category] || CATEGORY_DOT_COLORS["Otros"]
    : null;

  const card = (
    <div
      className="animate-card-reveal group relative bg-card rounded-lg border border-border/50 overflow-hidden transition-all duration-300 hover:border-teal/30 hover:shadow-md hover:shadow-teal/5 hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Link href={`/video/${video.id}`} className="block absolute inset-0">
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12.5vw"
            loading="lazy"
            unoptimized
          />

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-teal/90 rounded-full p-2 shadow-lg shadow-teal/30 backdrop-blur-sm scale-50 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
        </Link>

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
            className="absolute bottom-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-destructive/20 backdrop-blur-md rounded-full p-1 border border-destructive/25 hover:bg-destructive/80 hover:border-destructive/60 hover:shadow-lg hover:shadow-destructive/30 hover:scale-110"
          >
            <Trash2 className="w-3 h-3 text-destructive-foreground" />
          </button>
        )}

        {/* Enrichment dot */}
        <div className="absolute top-1.5 right-1.5 pointer-events-none">
          <div
            className={`w-2.5 h-2.5 rounded-full shadow-md ${
              video.isEnriched
                ? "bg-teal shadow-teal/50"
                : "bg-amber shadow-amber/50"
            }`}
          />
        </div>

        {/* Category color strip at bottom */}
        {categoryDotColor && (
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] ${categoryDotColor}`} />
        )}
      </div>

      {/* Info */}
      <div className="px-2 py-1.5">
        <Link href={`/video/${video.id}`}>
          <h3 className="text-[11px] font-semibold leading-tight line-clamp-1 text-foreground/90 group-hover:text-teal transition-colors duration-200">
            {video.title}
          </h3>
        </Link>
        <span className="block text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
          {video.channelName}
        </span>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<div />}>{card}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-0.5">
            <p className="font-medium text-xs">{video.title}</p>
            <p className="text-[10px] opacity-70">{video.channelName}</p>
            {video.category && (
              <p className="text-[10px] opacity-70">{video.category}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
