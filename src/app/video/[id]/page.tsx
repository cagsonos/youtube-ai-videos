"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TagBadge, CATEGORY_DOT_COLORS } from "@/components/TagBadge";
import { DEFAULT_MODEL, LOCALSTORAGE_KEY } from "@/lib/models";
import { toast } from "sonner";
import NextImage from "next/image";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Calendar,
  RefreshCw,
  Loader2,
  Plus,
  X,
  Globe,
  Sparkles,
  Trash2,
  ChevronRight,
  Home,
} from "lucide-react";

const NEW_CATEGORY_VALUE = "__new__";

interface Video {
  id: number;
  youtubeId: string;
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  channelName: string;
  channelId: string | null;
  publishedAt: string | null;
  duration: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  aiSummary: string | null;
  aiTags: string | null;
  youtubeTags: string | null;
  keywords: string | null;
  category: string | null;
  language: string | null;
  isEnriched: boolean;
  enrichedAt: string | null;
  notes: string | null;
}

function formatDuration(iso: string | null): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = match[2] || "0";
  const s = (match[3] || "0").padStart(2, "0");
  return `${h}${h ? m.padStart(2, "0") : m}:${s}`;
}

function formatNumber(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString("es-ES");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [ytTagsExpanded, setYtTagsExpanded] = useState(false);
  const notesTimerRef = useRef<NodeJS.Timeout>();

  const fetchVideo = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (!res.ok) {
        toast.error("Video no encontrado");
        router.push("/");
        return;
      }
      const data = await res.json();
      setVideo(data);
      setNotes(data.notes || "");
    } catch {
      toast.error("Error al cargar el video");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const saveNotes = useCallback(
    async (value: string) => {
      try {
        await fetch(`/api/videos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
      } catch {
        toast.error("Error al guardar notas");
      }
    },
    [id]
  );

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => saveNotes(val), 1000);
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const model = localStorage.getItem(LOCALSTORAGE_KEY) || DEFAULT_MODEL;
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video?.id, model }),
      });
      const data = await res.json();
      if (res.ok) {
        const status = data._enrichStatus;
        if (status && (!status.youtubeOk || !status.claudeOk)) {
          const warnings = [];
          if (!status.youtubeOk) warnings.push(`YouTube: ${status.youtubeError || "falló"}`);
          if (!status.claudeOk) warnings.push(`Claude: ${status.claudeError || "falló"}`);
          toast.warning(`Enriquecimiento parcial: ${warnings.join("; ")}`);
        } else {
          toast.success("Video enriquecido correctamente");
        }
        fetchVideo();
      } else {
        const errors = [];
        if (data.youtubeError) errors.push(`YouTube: ${data.youtubeError}`);
        if (data.claudeError) errors.push(`Claude: ${data.claudeError}`);
        toast.error(errors.length > 0 ? errors.join(" | ") : (data.error || "Error al enriquecer"));
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setEnriching(false);
    }
  };

  const handleCategoryChange = async (value: string | null) => {
    if (!value) return;
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategory(true);
      setNewCategoryName("");
      return;
    }
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: value }),
      });
      setVideo((prev) => (prev ? { ...prev, category: value } : null));
      toast.success("Categoría actualizada");
    } catch {
      toast.error("Error al actualizar categoría");
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: name }),
      });
      setVideo((prev) => (prev ? { ...prev, category: name } : null));
      if (!categories.includes(name)) {
        setCategories((prev) => [...prev, name].sort());
      }
      setCreatingCategory(false);
      setNewCategoryName("");
      toast.success("Categoría creada y asignada");
    } catch {
      toast.error("Error al crear categoría");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !video) return;
    const currentTags: string[] = video.aiTags
      ? JSON.parse(video.aiTags)
      : [];
    const updated = [...currentTags, newTag.trim()];
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiTags: updated }),
      });
      setVideo((prev) =>
        prev ? { ...prev, aiTags: JSON.stringify(updated) } : null
      );
      setNewTag("");
    } catch {
      toast.error("Error al agregar tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!video) return;
    const currentTags: string[] = video.aiTags
      ? JSON.parse(video.aiTags)
      : [];
    const updated = currentTags.filter((t) => t !== tagToRemove);
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiTags: updated }),
      });
      setVideo((prev) =>
        prev ? { ...prev, aiTags: JSON.stringify(updated) } : null
      );
    } catch {
      toast.error("Error al eliminar tag");
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim() || !video) return;
    const current = video.keywords
      ? video.keywords.split(/[-\n]/).map((t) => t.trim()).filter(Boolean)
      : [];
    const updated = [...current, newKeyword.trim()];
    const joined = updated.join(" - ");
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: joined }),
      });
      setVideo((prev) => (prev ? { ...prev, keywords: joined } : null));
      setNewKeyword("");
    } catch {
      toast.error("Error al agregar keyword");
    }
  };

  const handleRemoveKeyword = async (keywordToRemove: string) => {
    if (!video) return;
    const current = video.keywords
      ? video.keywords.split(/[-\n]/).map((t) => t.trim()).filter(Boolean)
      : [];
    const updated = current.filter((t) => t !== keywordToRemove);
    const joined = updated.length > 0 ? updated.join(" - ") : null;
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: joined }),
      });
      setVideo((prev) => (prev ? { ...prev, keywords: joined } : null));
    } catch {
      toast.error("Error al eliminar keyword");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este video de la biblioteca?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Video eliminado");
        router.push("/");
      } else {
        toast.error("Error al eliminar el video");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="max-w-5xl mx-auto px-5 py-3">
            <div className="h-5 w-48 rounded-md animate-shimmer" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
          <div className="relative aspect-video w-full rounded-2xl animate-shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              <div className="h-32 w-full rounded-xl animate-shimmer" />
              <div className="h-48 w-full rounded-xl animate-shimmer" />
            </div>
            <div className="space-y-4">
              <div className="h-40 w-full rounded-xl animate-shimmer" />
              <div className="h-24 w-full rounded-xl animate-shimmer" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!video) return null;

  const thumbnailUrl =
    video.thumbnailUrl ||
    `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
  const aiTags: string[] = (video.aiTags ? JSON.parse(video.aiTags) : []).sort((a: string, b: string) => a.localeCompare(b, "es"));
  const ytTags: string[] = (video.youtubeTags
    ? JSON.parse(video.youtubeTags)
    : []).sort((a: string, b: string) => a.localeCompare(b, "es"));
  const keywordTags = (video.keywords
    ? video.keywords
        .split(/[-\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : []).sort((a, b) => a.localeCompare(b, "es"));
  const categoryDotColor = video.category
    ? CATEGORY_DOT_COLORS[video.category] || CATEGORY_DOT_COLORS["Otros"]
    : null;

  return (
    <div className="min-h-screen">
      {/* Header with breadcrumb + actions */}
      <header className="sticky top-0 z-50 glass hero-gradient border-b border-teal/10">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          {/* Logo + Breadcrumb */}
          <Link href="/" className="shrink-0">
            <NextImage
              src="/byte_logo_fw.png"
              alt="Byte"
              width={80}
              height={27}
              className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
            />
          </Link>
          <div className="w-px h-5 bg-border/40 shrink-0" />
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1 min-w-0">
            <Link href="/" className="flex items-center gap-1 hover:text-teal transition-colors duration-200 shrink-0">
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            {video.category && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
                <Link
                  href={`/?categoria=${encodeURIComponent(video.category)}`}
                  className="hover:text-teal transition-colors duration-200 shrink-0"
                >
                  {video.category}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
            <span className="truncate text-foreground/60">{video.title}</span>
          </nav>

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0">
            {video.isEnriched && (
              <div className="flex items-center gap-1 text-teal text-[11px]">
                <Sparkles className="w-3 h-3" />
                Enriquecido
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        {/* Cinematic Hero */}
        <div className="relative rounded-2xl overflow-hidden cinema-vignette">
          {/* Blurred background glow — dramatic */}
          <div
            className="absolute inset-0 scale-125"
            style={{
              backgroundImage: `url(${thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(50px) saturate(1.8)",
              opacity: 0.4,
            }}
          />

          {/* Main thumbnail */}
          <div className="relative aspect-video">
            <Image
              src={thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-all duration-300"
            >
              <div className="bg-teal/90 rounded-full p-6 shadow-xl shadow-teal/30 backdrop-blur-sm transform hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white fill-white" />
              </div>
            </a>
            {video.duration && (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/10">
                {formatDuration(video.duration)}
              </div>
            )}
          </div>

          {/* Floating info bar */}
          <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white line-clamp-1">
                  {video.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-white/70">
                  <span className="font-medium text-white/90">{video.channelName}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(video.publishedAt)}
                  </span>
                  {video.language && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {video.language}
                    </span>
                  )}
                </div>
              </div>
              {/* Inline stats */}
              {video.isEnriched && (
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-teal/80" />
                    {formatNumber(video.viewCount)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-teal/80" />
                    {formatNumber(video.likeCount)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-teal/80" />
                    {formatNumber(video.commentCount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left column — main content */}
          <div className="space-y-6">
            {/* Description */}
            <div className="glass-panel rounded-xl p-5 space-y-3 border-l-2 border-l-teal/40 animate-fade-slide-up">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Descripcion
              </h2>
              <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/80">
                {video.description || "Sin descripcion disponible"}
              </p>
            </div>

            {/* Tags — Tabbed (AI Tags + Keywords) */}
            <div className="animate-fade-slide-up" style={{ animationDelay: "0.1s" }}>
              <Tabs defaultValue="ai-tags">
                <TabsList variant="line" className="mb-3">
                  <TabsTrigger value="ai-tags">
                    Tags IA ({aiTags.length})
                  </TabsTrigger>
                  <TabsTrigger value="keywords">
                    Keywords ({keywordTags.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-tags">
                  <div className="flex flex-wrap gap-2">
                    {aiTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1.5 cursor-pointer bg-teal/10 text-teal border border-teal/15 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors duration-200"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                        placeholder="Nuevo tag..."
                        className="h-7 w-32 text-xs bg-surface border-border/40 focus:border-teal/40 focus:ring-teal/10"
                      />
                      <button
                        className="h-7 w-7 rounded-md bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-colors flex items-center justify-center"
                        onClick={handleAddTag}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="keywords">
                  <div className="flex flex-wrap gap-2">
                    {keywordTags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="gap-1.5 cursor-pointer bg-teal/10 text-teal border border-teal/15 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors duration-200"
                        onClick={() => handleRemoveKeyword(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                        placeholder="Nuevo keyword..."
                        className="h-7 w-32 text-xs bg-surface border-border/40 focus:border-teal/40 focus:ring-teal/10"
                      />
                      <button
                        className="h-7 w-7 rounded-md bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-colors flex items-center justify-center"
                        onClick={handleAddKeyword}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* YouTube Tags — collapsible */}
            {ytTags.length > 0 && (
              <div className="animate-fade-slide-up" style={{ animationDelay: "0.15s" }}>
                <button
                  onClick={() => setYtTagsExpanded(!ytTagsExpanded)}
                  className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest hover:text-teal transition-colors duration-200 flex items-center gap-1.5"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${ytTagsExpanded ? "rotate-90" : ""}`} />
                  Tags de YouTube ({ytTags.length})
                </button>
                {ytTagsExpanded && (
                  <div className="flex flex-wrap gap-2 mt-3 animate-fade-slide-up">
                    {ytTags.map((tag, i) => (
                      <TagBadge key={i}>{tag}</TagBadge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Personal Notes */}
            <div className="animate-fade-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="glass-panel rounded-xl p-5 space-y-3">
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Notas personales
                </h2>
                <Textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Escribe tus notas sobre este video..."
                  className="min-h-[140px] resize-y bg-surface border-border/40 focus:border-teal/40 focus:ring-teal/10 placeholder:text-muted-foreground/40"
                />
                <p className="text-[10px] text-muted-foreground/50">
                  Las notas se guardan automaticamente
                </p>
              </div>
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-4 lg:sticky lg:top-[60px] lg:self-start">
            {/* Quick Actions */}
            <div className="glass-panel rounded-xl p-4 space-y-3 animate-fade-slide-up">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Acciones
              </h2>
              <Button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full gap-2 bg-teal text-white hover:bg-teal-dim shadow-md shadow-teal/20 transition-all duration-200"
              >
                {enriching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {video.isEnriched ? "Re-enriquecer" : "Enriquecer"}
              </Button>

              <a href={video.url} target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-border hover:border-teal/30 hover:text-teal transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en YouTube
                </Button>
              </a>

              <div className="h-px bg-border/30 my-1" />

              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                className="w-full gap-2 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar video
              </Button>

              {video.isEnriched && video.enrichedAt && (
                <p className="text-[10px] text-muted-foreground/50 text-center">
                  Enriquecido: {formatDate(video.enrichedAt)}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="glass-panel rounded-xl p-4 space-y-3 animate-fade-slide-up" style={{ animationDelay: "0.08s" }}>
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                Categoría
                {categoryDotColor && (
                  <span className={`w-2 h-2 rounded-full ${categoryDotColor}`} />
                )}
              </h2>
              <Select
                value={video.category || ""}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full bg-surface border-border/40 hover:border-teal/30 transition-colors">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY_VALUE}>
                    <span className="flex items-center gap-1.5 text-teal">
                      <Plus className="w-3.5 h-3.5" />
                      Crear nueva categoria
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {creatingCategory && (
                <div className="space-y-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                    placeholder="Nombre de la nueva categoría..."
                    className="h-9 text-sm bg-surface border-border/40 focus:border-teal/40 focus:ring-teal/10"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 h-8 rounded-md bg-teal/10 border border-teal/20 text-teal text-sm hover:bg-teal/20 transition-colors"
                      onClick={handleCreateCategory}
                    >
                      Crear
                    </button>
                    <button
                      className="flex-1 h-8 rounded-md bg-surface border border-border/40 text-muted-foreground text-sm hover:bg-surface-hover transition-colors"
                      onClick={() => setCreatingCategory(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="glass-panel rounded-xl p-4 space-y-2.5 animate-fade-slide-up" style={{ animationDelay: "0.16s" }}>
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Metadatos
              </h2>
              <div className="space-y-2 text-sm">
                {video.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal/60" />
                      Duración
                    </span>
                    <span className="font-medium">{formatDuration(video.duration)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal/60" />
                    Publicado
                  </span>
                  <span className="font-medium text-xs">{formatDate(video.publishedAt)}</span>
                </div>
                {video.language && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-teal/60" />
                      Idioma
                    </span>
                    <span className="font-medium">{video.language}</span>
                  </div>
                )}
                {video.isEnriched && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal/60" />
                      Estado
                    </span>
                    <span className="font-medium text-teal text-xs">Enriquecido</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
