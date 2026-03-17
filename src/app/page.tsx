"use client";

import { useEffect, useState, useCallback } from "react";
import { VideoGrid } from "@/components/VideoGrid";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel, getActiveFilterLabels } from "@/components/FilterPanel";
import { ActiveFilterPills } from "@/components/ActiveFilterPills";
import { StatsDashboard } from "@/components/StatsDashboard";
import { ExportButton } from "@/components/ExportButton";
import { AddVideoButton } from "@/components/AddVideoButton";
import { EnrichProgress } from "@/components/EnrichProgress";
import { RecategorizeProgress } from "@/components/RecategorizeProgress";
import { ViewToggle } from "@/components/ViewToggle";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_MODEL, LOCALSTORAGE_KEY } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Moon,
  Sun,
} from "lucide-react";

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

interface ApiResponse {
  videos: Video[];
  total: number;
  page: number;
  totalPages: number;
}

interface TagEntry {
  name: string;
  count: number;
}

interface FiltersResponse {
  channels: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  tags: TagEntry[];
  stats: {
    total: number;
    enriched: number;
    filtered: number;
  };
}

export default function HomePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [filtersData, setFiltersData] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "thumbnail">("card");
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);

  const [filters, setFilters] = useState({
    q: "",
    canal: "",
    categoria: "",
    enriched: "",
    tags: "",
    sort: "createdAt",
    page: 1,
  });

  const fetchFilters = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.canal) params.set("canal", filters.canal);
      if (filters.categoria) params.set("categoria", filters.categoria);
      if (filters.tags) params.set("tags", filters.tags);
      if (filters.enriched) params.set("enriched", filters.enriched);
      const res = await fetch(`/api/filters?${params}`);
      const json = await res.json();
      setFiltersData(json);
    } catch {
      // handle error silently
    }
  }, [filters.q, filters.canal, filters.categoria, filters.tags, filters.enriched]);

  useEffect(() => {
    const saved = localStorage.getItem("neural-cinema-view-mode");
    if (saved === "card" || saved === "thumbnail") setViewMode(saved);
    const savedModel = localStorage.getItem(LOCALSTORAGE_KEY);
    if (savedModel) setAiModel(savedModel);
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleViewModeChange = (mode: "card" | "thumbnail") => {
    setViewMode(mode);
    localStorage.setItem("neural-cinema-view-mode", mode);
  };

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.canal) params.set("canal", filters.canal);
    if (filters.categoria) params.set("categoria", filters.categoria);
    if (filters.tags) params.set("tags", filters.tags);
    if (filters.enriched) params.set("enriched", filters.enriched);
    if (filters.sort) params.set("sort", filters.sort);
    params.set("page", String(filters.page));

    try {
      const res = await fetch(`/api/videos?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const refreshAll = useCallback(() => {
    fetchVideos();
    fetchFilters();
  }, [fetchVideos, fetchFilters]);

  const handleDeleteVideo = async (id: number) => {
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Video eliminado");
        refreshAll();
      } else {
        toast.error("Error al eliminar el video");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      q: "",
      canal: "",
      categoria: "",
      enriched: "",
      tags: "",
      page: 1,
    }));
  };

  const toggleDark = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const stats = filtersData?.stats;
  const pendingCount = stats ? stats.total - stats.enriched : 0;
  const enrichPercent = stats && stats.total > 0
    ? Math.round((stats.enriched / stats.total) * 100)
    : 0;

  const activeFilters = getActiveFilterLabels(
    filters,
    filtersData?.channels || [],
    filtersData?.categories || []
  );
  const hasActiveFilters = activeFilters.length > 0 || !!filters.q;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass hero-gradient border-b border-teal/10">
        <div className="max-w-[1600px] mx-auto px-5">
          {/* Tier 1 — Brand Bar */}
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-4">
              <Image
                src="/byte_logo_fw.png"
                alt="Byte"
                width={100}
                height={34}
                className="h-8 w-auto"
                priority
              />
              <div className="w-px h-8 bg-border/40" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gradient-teal">
                  Neural Cinema
                </h1>
                {stats && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {stats.total} videos
                    </span>
                    <div className="w-24 h-2.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-dim to-teal transition-all duration-500 progress-glow"
                        style={{ width: `${enrichPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-teal font-bold">
                      {enrichPercent}% enriquecido
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModelSelector value={aiModel} onChange={setAiModel} />
              <ViewToggle
                viewMode={viewMode}
                onChange={handleViewModeChange}
              />
              <button
                onClick={toggleDark}
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-surface border border-border hover:border-teal/20 hover:bg-surface-hover transition-all duration-200"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Tier 2 — Command Bar */}
          <div className="flex items-center gap-3 pb-3">
            <SearchBar
              value={filters.q}
              onChange={(v) => handleFilterChange("q", v)}
              resultCount={data?.total}
            />
            <div className="glass-panel rounded-xl px-2 py-1 flex items-center gap-1.5">
              <AddVideoButton onVideoAdded={refreshAll} />
              <ExportButton />
              <EnrichProgress
                pendingCount={pendingCount}
                onComplete={refreshAll}
                model={aiModel}
              />
              {/* RecategorizeProgress oculto para evitar ejecución accidental */}
            </div>
          </div>

          {/* Tier 3 — Filter Bar */}
          <div className="pb-3">
            <FilterPanel
              channels={filtersData?.channels || []}
              categories={filtersData?.categories || []}
              tags={filtersData?.tags || []}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-5 py-6 space-y-6">
        {/* Active filter pills */}
        <ActiveFilterPills
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
        />

        {/* Stats dashboard */}
        <StatsDashboard
          stats={stats || null}
          categoriesCount={filtersData?.categories.length || 0}
        />

        {/* Video grid */}
        <VideoGrid
          videos={data?.videos || []}
          loading={loading}
          viewMode={viewMode}
          onDelete={handleDeleteVideo}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex flex-col items-center gap-3 mt-10">
            <span className="text-[11px] text-muted-foreground/60">
              Página {data.page} de {data.totalPages}
            </span>

            <div className="glass-panel rounded-2xl px-4 py-2.5 inline-flex items-center gap-2">
              {/* First page */}
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                className="w-8 h-8 p-0 hover:text-teal transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>

              {/* Previous */}
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page <= 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                className="w-8 h-8 p-0 hover:text-teal transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (data.totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (data.page <= 4) {
                    pageNum = i + 1;
                  } else if (data.page >= data.totalPages - 3) {
                    pageNum = data.totalPages - 6 + i;
                  } else {
                    pageNum = data.page - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, page: pageNum }))
                      }
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                        data.page === pageNum
                          ? "bg-teal text-white shadow-lg shadow-teal/25 scale-110"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next */}
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                className="w-8 h-8 p-0 hover:text-teal transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Last page */}
              <Button
                variant="ghost"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: data.totalPages }))
                }
                className="w-8 h-8 p-0 hover:text-teal transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Footer stats */}
            <span className="text-[11px] text-muted-foreground/40">
              Mostrando {data.videos.length} de {data.total} videos
            </span>
          </div>
        )}

        {/* Single page footer */}
        {data && data.totalPages <= 1 && (
          <div className="text-center mt-4 mb-8">
            <span className="text-[11px] text-muted-foreground/50">
              Mostrando {data.videos.length} de {data.total} videos
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
