"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { type ActiveFilter } from "./FilterPanel";

interface ActiveFilterPillsProps {
  filters: {
    canal: string;
    categoria: string;
    enriched: string;
    sort: string;
    tags: string;
  };
  activeFilters: ActiveFilter[];
  onFilterChange: (key: string, value: string) => void;
}

export function ActiveFilterPills({
  filters,
  activeFilters,
  onFilterChange,
}: ActiveFilterPillsProps) {
  if (activeFilters.length === 0) return null;

  const removeFilter = (filter: ActiveFilter) => {
    if (filter.key === "tag") {
      // Remove single tag from comma-separated list
      const tags = filters.tags.split(",").filter(Boolean);
      const updated = tags.filter((t) => t !== filter.value);
      onFilterChange("tags", updated.join(","));
    } else {
      onFilterChange(filter.key, "");
    }
  };

  const clearAll = () => {
    onFilterChange("canal", "");
    onFilterChange("categoria", "");
    onFilterChange("enriched", "");
    onFilterChange("tags", "");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-slide-up">
      {activeFilters.map((filter, i) => (
        <Badge
          key={`${filter.key}-${filter.value}-${i}`}
          variant="outline"
          className="gap-1.5 cursor-pointer bg-teal/10 text-teal border-teal/20 hover:bg-teal/20 hover:border-teal/30 transition-all duration-200 text-xs"
          onClick={() => removeFilter(filter)}
        >
          {filter.label}
          <X className="w-3 h-3" />
        </Badge>
      ))}
      <button
        onClick={clearAll}
        className="text-[11px] text-muted-foreground hover:text-teal transition-colors duration-200 ml-1"
      >
        Limpiar todo
      </button>
    </div>
  );
}
