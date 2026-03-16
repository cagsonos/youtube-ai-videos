"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tags, Loader2, X, CheckCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface ProgressEvent {
  type: string;
  total?: number;
  current?: number;
  title?: string;
  youtubeId?: string;
  category?: string;
  categories?: string[];
  error?: string;
}

interface RecategorizeProgressProps {
  onComplete?: () => void;
  model: string;
}

function ProgressRing({ percentage, size = 80 }: { percentage: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(0.2 0.01 260)"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#recatGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
      <defs>
        <linearGradient id="recatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.5 0.12 185)" />
          <stop offset="100%" stopColor="oklch(0.72 0.16 185)" />
        </linearGradient>
      </defs>
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-teal font-bold"
        fontSize="16"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export function RecategorizeProgress({
  onComplete,
  model,
}: RecategorizeProgressProps) {
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const startRecategorize = useCallback(async (onlyUncategorized = false) => {
    const controller = new AbortController();
    setAbortController(controller);
    setRunning(true);
    setOpen(true);
    setProgress(0);
    setTotal(0);
    setCurrentTitle("");
    setNewCategories([]);
    setErrors([]);
    setCompleted(false);

    try {
      const res = await fetch("/api/recategorize-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, onlyUncategorized }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al re-categorizar");
        setRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: ProgressEvent = JSON.parse(line);

            switch (event.type) {
              case "start":
                setTotal(event.total || 0);
                break;
              case "progress":
                setProgress(event.current || 0);
                setCurrentTitle(event.title || "");
                break;
              case "new_category":
                setNewCategories(event.categories || []);
                break;
              case "categorized":
                setProgress(event.current || 0);
                break;
              case "error":
                setErrors((prev) => [
                  ...prev,
                  `${event.youtubeId || "?"}: ${event.error}`,
                ]);
                break;
              case "done":
                setCompleted(true);
                toast.success(
                  `Re-categorización completada: ${event.total} videos, ${(event.categories || []).length} categorías`
                );
                break;
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Error durante la re-categorización");
      }
    } finally {
      setRunning(false);
      setAbortController(null);
      onComplete?.();
    }
  }, [onComplete, model]);

  const handleCancel = () => {
    abortController?.abort();
    setRunning(false);
    setOpen(false);
    toast.info("Re-categorización cancelada");
    onComplete?.();
  };

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <>
      <div className="relative">
        <div className="flex items-center">
          <Button
            onClick={() => startRecategorize(false)}
            disabled={running}
            size="sm"
            variant="outline"
            className="gap-2 border-border hover:border-teal/30 hover:text-teal transition-all duration-200 rounded-r-none border-r-0"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Tags className="w-4 h-4" />
            )}
            {running
              ? `Re-categorizando (${progress}/${total})`
              : "Re-categorizar"}
          </Button>
          <Button
            onClick={() => setMenuOpen((p) => !p)}
            disabled={running}
            size="sm"
            variant="outline"
            className="px-1.5 border-border hover:border-teal/30 hover:text-teal transition-all duration-200 rounded-l-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
        {menuOpen && !running && (
          <div className="absolute top-full mt-1 right-0 z-50 w-52 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => { setMenuOpen(false); startRecategorize(false); }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
            >
              Re-categorizar todo
            </button>
            <button
              onClick={() => { setMenuOpen(false); startRecategorize(true); }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors border-t border-border"
            >
              Solo pendientes (sin categoría)
            </button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Tags className="w-5 h-5 text-teal" />
              Re-categorizando videos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Progress ring + bar */}
            <div className="flex items-center gap-5">
              {completed ? (
                <div className="animate-celebration">
                  <CheckCircle className="w-16 h-16 text-teal" />
                </div>
              ) : (
                <ProgressRing percentage={percentage} />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Video {progress} de {total}
                  </span>
                  <span className="font-medium text-teal">{percentage}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-dim to-teal h-2 rounded-full transition-all duration-500 ease-out progress-glow"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current video */}
            {currentTitle && (
              <p className="text-sm text-muted-foreground truncate px-1">
                {currentTitle}
              </p>
            )}

            {/* New categories discovered */}
            {newCategories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Categorías creadas ({newCategories.length})
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {newCategories.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs px-2 py-0.5 rounded-md bg-teal/10 text-teal border border-teal/15"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="max-h-24 overflow-y-auto text-xs text-destructive space-y-1 p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                {errors.slice(-5).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              {running ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="border-border hover:border-teal/30"
                >
                  Cerrar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
