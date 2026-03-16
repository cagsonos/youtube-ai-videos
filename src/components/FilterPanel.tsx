"use client";

import { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tag, X, ChevronDown, SlidersHorizontal } from "lucide-react";

interface CategoryEntry {
  name: string;
  count: number;
}

interface ChannelEntry {
  name: string;
  count: number;
}

interface FilterPanelProps {
  channels: ChannelEntry[];
  categories: CategoryEntry[];
  tags: TagEntry[];
  filters: {
    canal: string;
    categoria: string;
    enriched: string;
    sort: string;
    tags: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

const SORT_LABELS: Record<string, string> = {
  publishedAt: "Fecha publicación",
  viewCount: "Más vistas",
  title: "Título A-Z",
  createdAt: "Recién añadidos",
};

const ENRICHED_LABELS: Record<string, string> = {
  all: "Todos los estados",
  true: "Enriquecidos",
  false: "Pendientes",
};

interface TagEntry {
  name: string;
  count: number;
}

// Helper to get labels for active filters (used by ActiveFilterPills)
export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export function getActiveFilterLabels(
  filters: { canal: string; categoria: string; enriched: string; tags: string; sort: string },
  channels: ChannelEntry[],
  categories: CategoryEntry[]
): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  if (filters.canal) {
    active.push({ key: "canal", label: `Canal: ${filters.canal}`, value: filters.canal });
  }
  if (filters.categoria) {
    active.push({ key: "categoria", label: `Categoría: ${filters.categoria}`, value: filters.categoria });
  }
  if (filters.enriched) {
    const label = filters.enriched === "true" ? "Enriquecidos" : "Pendientes";
    active.push({ key: "enriched", label: `Estado: ${label}`, value: filters.enriched });
  }
  if (filters.tags) {
    const tagList = filters.tags.split(",").filter(Boolean);
    tagList.forEach((tag) => {
      active.push({ key: "tag", label: tag, value: tag });
    });
  }
  return active;
}

function TagMultiSelect({
  selected,
  onChange,
  triggerClass,
  tags,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
  triggerClass: string;
  tags: TagEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = tags
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const toggle = (tagName: string) => {
    const next = selected.includes(tagName)
      ? selected.filter((s) => s !== tagName)
      : [...selected, tagName];
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 rounded-md border ${triggerClass} ${
          selected.length > 0 ? "border-teal/40 text-teal active-filter-border" : ""
        }`}
      >
        <Tag className="w-3.5 h-3.5" />
        <span className="truncate max-w-[120px]">
          {selected.length === 0
            ? "Tags"
            : `${selected.length} tag${selected.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
      </button>

      {selected.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-teal text-white flex items-center justify-center hover:bg-teal-dim transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tags..."
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-teal/40 placeholder:text-muted-foreground/50"
              autoFocus
            />
          </div>

          {selected.length > 0 && (
            <div className="p-2 border-b border-border flex flex-wrap gap-1">
              {selected.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-[10px] bg-teal/10 text-teal border-teal/20 cursor-pointer hover:bg-teal/20 gap-1"
                  onClick={() => toggle(t)}
                >
                  {t}
                  <X className="w-2.5 h-2.5" />
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No se encontraron tags
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.name}
                  onClick={() => toggle(t.name)}
                  className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors flex items-center justify-between ${
                    selected.includes(t.name)
                      ? "bg-teal/10 text-teal"
                      : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {t.count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterPanel({
  channels,
  categories,
  tags,
  filters,
  onFilterChange,
}: FilterPanelProps) {
  const handleChange =
    (key: string, allValue: string) => (v: string | null) => {
      if (v === null) return;
      onFilterChange(key, v === allValue ? "" : v);
    };

  const selectedTags = filters.tags
    ? filters.tags.split(",").filter(Boolean)
    : [];

  const activeCount = [
    filters.canal,
    filters.categoria,
    filters.enriched,
    filters.tags,
  ].filter(Boolean).length;

  const selectTriggerBase =
    "bg-surface border-border text-sm h-9 hover:bg-surface-hover hover:border-teal/20 transition-all duration-200 data-[state=open]:border-teal/40 data-[state=open]:ring-2 data-[state=open]:ring-teal/10";

  const activeClass = (isActive: boolean) =>
    isActive ? `${selectTriggerBase} active-filter-border border-teal/40 text-teal` : selectTriggerBase;

  return (
    <div className="relative glass-panel rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
      {/* Filter icon + active count */}
      <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-teal text-white text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </div>

      {/* Canal */}
      <Select
        value={filters.canal || "all"}
        onValueChange={handleChange("canal", "all")}
      >
        <SelectTrigger className={`w-[200px] ${activeClass(!!filters.canal)}`}>
          <SelectValue placeholder="Canal">
            {filters.canal || "Todos los canales"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border min-w-[320px]">
          <SelectItem value="all">Todos los canales</SelectItem>
          {channels.map((ch) => (
            <SelectItem key={ch.name} value={ch.name}>
              <span className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{ch.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({ch.count})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Categoría */}
      <Select
        value={filters.categoria || "all"}
        onValueChange={handleChange("categoria", "all")}
      >
        <SelectTrigger className={`w-[200px] ${activeClass(!!filters.categoria)}`}>
          <SelectValue placeholder="Categoría">
            {filters.categoria || "Todas las categorías"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border min-w-[320px]">
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.name} value={cat.name}>
              <span className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({cat.count})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Enriquecido */}
      <Select
        value={filters.enriched || "all"}
        onValueChange={handleChange("enriched", "all")}
      >
        <SelectTrigger className={`w-[150px] ${activeClass(!!filters.enriched)}`}>
          <SelectValue placeholder="Estado">
            {ENRICHED_LABELS[filters.enriched || "all"]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="true">Enriquecidos</SelectItem>
          <SelectItem value="false">Pendientes</SelectItem>
        </SelectContent>
      </Select>

      {/* Tags */}
      <TagMultiSelect
        selected={selectedTags}
        onChange={(newTags) =>
          onFilterChange("tags", newTags.join(","))
        }
        triggerClass={selectTriggerBase}
        tags={tags}
      />

      {/* Ordenar */}
      <Select
        value={filters.sort || "publishedAt"}
        onValueChange={(v: string | null) => {
          if (v) onFilterChange("sort", v);
        }}
      >
        <SelectTrigger className={`w-[160px] ${selectTriggerBase}`}>
          <SelectValue placeholder="Ordenar por">
            {SORT_LABELS[filters.sort || "publishedAt"]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="publishedAt">Fecha publicación</SelectItem>
          <SelectItem value="viewCount">Más vistas</SelectItem>
          <SelectItem value="title">Título A-Z</SelectItem>
          <SelectItem value="createdAt">Recién añadidos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
