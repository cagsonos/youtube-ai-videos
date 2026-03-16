"use client";

import { useEffect, useRef, useState } from "react";
import { VideoCard } from "./VideoCard";
import { VideoThumbnail } from "./VideoThumbnail";
import { Film, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Video {
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
}

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  viewMode?: "card" | "thumbnail";
  onDelete?: (id: number) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

function VideoSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-card-reveal bg-card rounded-xl border border-border/60 overflow-hidden"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="aspect-video w-full animate-shimmer" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-4 w-full rounded-md animate-shimmer" />
        <div className="h-4 w-3/4 rounded-md animate-shimmer" />
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded-md animate-shimmer" />
          <div className="h-3 w-14 rounded-md animate-shimmer" />
        </div>
        <div className="flex gap-1.5 pt-0.5">
          <div className="h-5 w-16 rounded-full animate-shimmer" />
          <div className="h-5 w-12 rounded-full animate-shimmer" />
          <div className="h-5 w-14 rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

function ThumbnailSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-card-reveal bg-card rounded-lg border border-border/50 overflow-hidden"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
    >
      <div className="aspect-video w-full animate-shimmer" />
      <div className="px-2 py-1.5 space-y-1">
        <div className="h-3 w-full rounded-sm animate-shimmer" />
        <div className="h-2.5 w-1/2 rounded-sm animate-shimmer" />
      </div>
    </div>
  );
}

export function VideoGrid({ videos, loading, viewMode = "card", onDelete, onClearFilters, hasActiveFilters }: VideoGridProps) {
  const isThumbnail = viewMode === "thumbnail";
  const gridRef = useRef<HTMLDivElement>(null);
  const [fading, setFading] = useState(false);
  const prevViewMode = useRef(viewMode);

  // Fade transition on view mode change
  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      setFading(true);
      const timer = setTimeout(() => setFading(false), 150);
      prevViewMode.current = viewMode;
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Scroll to top on video list change (new page)
  useEffect(() => {
    if (gridRef.current && !loading) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [videos, loading]);

  const gridClasses = isThumbnail
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";

  if (loading) {
    const skeletonCount = isThumbnail ? 24 : 12;
    return (
      <div className={gridClasses}>
        {Array.from({ length: skeletonCount }).map((_, i) =>
          isThumbnail ? (
            <ThumbnailSkeleton key={i} index={i} />
          ) : (
            <VideoSkeleton key={i} index={i} />
          )
        )}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 border border-border/40 animate-pulse-glow">
          <Film className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-base font-medium">No se encontraron videos</p>
        <p className="text-sm mt-1 text-muted-foreground/60">
          {hasActiveFilters
            ? "No hay videos con estos filtros"
            : "Intenta ajustar la búsqueda"}
        </p>
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="mt-4 gap-2 border-border hover:border-teal/30 hover:text-teal transition-all duration-200"
          >
            <FilterX className="w-4 h-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={`${gridClasses} transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {videos.map((video, i) =>
        isThumbnail ? (
          <VideoThumbnail key={video.id} video={video} index={i} onDelete={onDelete} />
        ) : (
          <VideoCard key={video.id} video={video} index={i} onDelete={onDelete} />
        )
      )}
    </div>
  );
}
