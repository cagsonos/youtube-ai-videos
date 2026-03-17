"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddVideoButtonProps {
  onVideoAdded?: () => void;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function AddVideoButton({ onVideoAdded }: AddVideoButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const youtubeId = useMemo(() => extractYouTubeId(url), [url]);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Ingresa una URL de YouTube");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/add-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al agregar video");
        return;
      }

      toast.success(`Video agregado: ${data.video.title}. Enriqueciendo...`);

      // Auto-enriquecer el video recién creado
      try {
        const enrichRes = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.video.id }),
        });
        if (enrichRes.ok) {
          toast.success("Video enriquecido correctamente");
        } else {
          toast.warning("Video agregado pero no se pudo enriquecer automáticamente");
        }
      } catch {
        toast.warning("Video agregado pero falló el enriquecimiento automático");
      }

      setUrl("");
      setOpen(false);
      onVideoAdded?.();
    } catch {
      toast.error("Error de conexión al agregar video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border hover:border-teal/30 hover:bg-teal/5 hover:text-teal transition-all duration-200"
          />
        }
      >
        <Plus className="w-4 h-4" />
        Agregar Video
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar video por URL</DialogTitle>
          <DialogDescription>
            Pega el link de un video de YouTube para agregarlo a la biblioteca.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="https://youtu.be/... o https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSubmit();
          }}
          disabled={loading}
        />

        {/* Thumbnail preview */}
        {youtubeId && (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border/40 bg-surface animate-fade-slide-up">
            <Image
              src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
              alt="Vista previa"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md">
              Vista previa
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="gap-2 bg-teal hover:bg-teal/90 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
