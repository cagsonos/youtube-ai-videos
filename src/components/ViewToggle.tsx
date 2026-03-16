"use client";

import { LayoutGrid, Grid3X3 } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ViewToggleProps {
  viewMode: "card" | "thumbnail";
  onChange: (mode: "card" | "thumbnail") => void;
}

export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center h-9 rounded-lg bg-surface border border-border overflow-hidden">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => onChange("card")}
                className={`relative flex items-center justify-center w-9 h-full transition-all duration-250 ${
                  viewMode === "card"
                    ? "bg-teal/15 text-teal scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
                aria-label="Vista de tarjetas"
              />
            }
          >
            <LayoutGrid className="w-4 h-4" />
            {viewMode === "card" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-teal" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">Vista tarjetas</TooltipContent>
        </Tooltip>
        <span className="w-px h-4 bg-border" />
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => onChange("thumbnail")}
                className={`relative flex items-center justify-center w-9 h-full transition-all duration-250 ${
                  viewMode === "thumbnail"
                    ? "bg-teal/15 text-teal scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
                aria-label="Vista de miniaturas"
              />
            }
          >
            <Grid3X3 className="w-4 h-4" />
            {viewMode === "thumbnail" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-teal" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">Vista miniaturas</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
