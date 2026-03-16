import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// --- Configuration ---
const MIN_TAG_VIDEOS = 3;
const MAX_TAG_MOCS = 50;
const MIN_SIMILARITY = 0.1;
const MAX_RELATED = 5;

// --- Directories ---
const VAULT_DIR = path.join(process.cwd(), "obsidian-vault");
const VIDEOS_DIR = path.join(VAULT_DIR, "Videos");
const CANALES_DIR = path.join(VAULT_DIR, "Canales");
const CATEGORIAS_DIR = path.join(VAULT_DIR, "Categorías");
const TAGS_DIR = path.join(VAULT_DIR, "Tags");
const TEMAS_DIR = path.join(VAULT_DIR, "Temas");

// --- Garbage tags to filter out ---
const GARBAGE_TAGS = new Set([
  "no suministrada",
  "here are the keywords:",
  "here are the keywords",
]);
const GARBAGE_PREFIXES = ["here are"];

// --- Topic Hubs (static clustering) ---
const TOPIC_HUBS: Record<string, { title: string; description: string; tags: string[] }> = {
  "n8n-automatizacion": {
    title: "n8n y Automatización",
    description: "Flujos de trabajo con n8n, integraciones, webhooks y automatización no-code",
    tags: ["n8n", "workflows", "automatización", "webhook", "webhooks", "flujos de trabajo", "no-code", "automation", "n8n workflows", "n8n tutorial"],
  },
  "rag-conocimiento": {
    title: "RAG y Bases de Conocimiento",
    description: "Retrieval-Augmented Generation, embeddings, vectores y búsqueda semántica",
    tags: ["rag", "embeddings", "vector database", "pinecone", "búsqueda semántica", "langchain", "vectores", "base de conocimiento"],
  },
  "agentes-ia": {
    title: "Agentes IA",
    description: "Agentes autónomos de IA, MCP, Claude Code y herramientas de agentes",
    tags: ["agente ia", "agentes ia", "ai agent", "agentes ai", "ai agents", "mcp", "claude code"],
  },
  "voz-conversacional": {
    title: "Voice AI y Chatbots",
    description: "Asistentes de voz, chatbots, integración con WhatsApp, Telegram y Twilio",
    tags: ["chatbot", "twilio", "whatsapp", "telegram", "voice agent", "vapi", "retell ai"],
  },
  "datos-scraping": {
    title: "Datos y Web Scraping",
    description: "Extracción de datos, web scraping, OCR, procesamiento de PDFs y APIs",
    tags: ["web scraping", "extracción de datos", "ocr", "pdf", "google sheets", "json", "api", "sql"],
  },
  "llm-modelos": {
    title: "LLMs y Modelos",
    description: "Modelos de lenguaje, OpenAI, GPT, procesamiento de lenguaje natural",
    tags: ["llm", "openai", "gpt", "procesamiento de lenguaje natural", "inteligencia artificial"],
  },
  "infra-deploy": {
    title: "Infraestructura y Deploy",
    description: "Supabase, Redis, VPS, hosting y despliegue de aplicaciones IA",
    tags: ["supabase", "redis", "vps", "hostinger", "google drive", "docker"],
  },
};

// --- Helpers ---

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim()
    .slice(0, 150);
}

function isGarbageTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  if (GARBAGE_TAGS.has(lower)) return true;
  if (GARBAGE_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (/^[\s\p{P}]*$/u.test(tag)) return true; // only punctuation/whitespace
  return false;
}

function parseTags(aiTags: string | null, youtubeTags: string | null, keywords: string | null): string[] {
  const tags = new Set<string>();

  if (aiTags) {
    try {
      const parsed = JSON.parse(aiTags);
      if (Array.isArray(parsed)) parsed.forEach((t: string) => tags.add(t.trim()));
    } catch {}
  }

  if (youtubeTags) {
    try {
      const parsed = JSON.parse(youtubeTags);
      if (Array.isArray(parsed)) parsed.forEach((t: string) => tags.add(t.trim()));
    } catch {}
  }

  if (keywords && keywords.toLowerCase() !== "no suministrada") {
    keywords.split(/[-\n]/).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) tags.add(trimmed);
    });
  }

  return Array.from(tags)
    .map((t) => t.replace(/\*\*/g, "").replace(/[#\[\]]/g, "").trim())
    .filter((t) => t.length > 0 && !isGarbageTag(t));
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

function formatDuration(duration: string | null): string {
  if (!duration) return "";
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const h = match[1] ? `${match[1]}h ` : "";
  const m = match[2] ? `${match[2]}m ` : "";
  const s = match[3] ? `${match[3]}s` : "";
  return `${h}${m}${s}`.trim();
}

function escapeYaml(value: string): string {
  if (/[:#\[\]{}&*!|>'"%@`]/.test(value) || value.includes("\n")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return value;
}

function generateHexId(): string {
  return crypto.randomBytes(8).toString("hex");
}

// --- Types ---

interface Video {
  id: number;
  youtubeId: string;
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  channelName: string;
  channelId: string | null;
  publishedAt: Date | null;
  duration: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  aiTags: string | null;
  youtubeTags: string | null;
  keywords: string | null;
  category: string | null;
  language: string | null;
  isEnriched: boolean;
  notes: string | null;
}

interface GraphData {
  videoTagsMap: Map<number, string[]>;       // videoId -> normalized tags
  videoRawTagsMap: Map<number, string[]>;    // videoId -> original tags (for display)
  tagVideosMap: Map<string, number[]>;       // normalized tag -> videoIds
  tagDisplayName: Map<string, string>;       // normalized tag -> preferred display name
  popularTags: Set<string>;                  // normalized names of tags with MOCs
  relatedMap: Map<number, number[]>;         // videoId -> related videoIds
  videoById: Map<number, Video>;             // videoId -> Video
  topicVideoMap: Map<string, Video[]>;       // topic key -> videos matching that topic
}

// --- Pre-computation ---

function buildGraphData(videos: Video[]): GraphData {
  const videoTagsMap = new Map<number, string[]>();
  const videoRawTagsMap = new Map<number, string[]>();
  const tagVideosMap = new Map<string, number[]>();
  const tagDisplayName = new Map<string, string>();
  const videoById = new Map<number, Video>();

  // Step 1: Build tag indexes
  for (const video of videos) {
    videoById.set(video.id, video);
    const rawTags = parseTags(video.aiTags, video.youtubeTags, video.keywords);
    videoRawTagsMap.set(video.id, rawTags);

    const normalizedTags: string[] = [];
    for (const tag of rawTags) {
      const norm = normalizeTag(tag);
      if (!norm) continue;
      normalizedTags.push(norm);

      if (!tagDisplayName.has(norm)) {
        tagDisplayName.set(norm, tag); // Keep first-seen casing
      }

      if (!tagVideosMap.has(norm)) tagVideosMap.set(norm, []);
      tagVideosMap.get(norm)!.push(video.id);
    }
    videoTagsMap.set(video.id, [...new Set(normalizedTags)]);
  }

  // Step 2: Determine popular tags
  const tagsByCount = Array.from(tagVideosMap.entries())
    .filter(([, ids]) => ids.length >= MIN_TAG_VIDEOS)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_TAG_MOCS);

  const popularTags = new Set(tagsByCount.map(([tag]) => tag));

  // Step 3: Compute related videos (Jaccard similarity)
  const relatedMap = new Map<number, number[]>();
  const videoIds = videos.map((v) => v.id);

  for (let i = 0; i < videoIds.length; i++) {
    const idA = videoIds[i];
    const tagsA = new Set(videoTagsMap.get(idA) || []);
    if (tagsA.size === 0) continue;

    const scores: { id: number; score: number }[] = [];

    for (let j = 0; j < videoIds.length; j++) {
      if (i === j) continue;
      const idB = videoIds[j];
      const tagsB = new Set(videoTagsMap.get(idB) || []);
      if (tagsB.size === 0) continue;

      let intersection = 0;
      for (const t of tagsA) {
        if (tagsB.has(t)) intersection++;
      }
      if (intersection === 0) continue;

      const union = new Set([...tagsA, ...tagsB]).size;
      const score = intersection / union;

      if (score >= MIN_SIMILARITY) {
        scores.push({ id: idB, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    relatedMap.set(idA, scores.slice(0, MAX_RELATED).map((s) => s.id));
  }

  // Step 4: Compute topic-to-videos mapping
  const topicVideoMap = new Map<string, Video[]>();
  for (const [key, hub] of Object.entries(TOPIC_HUBS)) {
    const hubTagsNorm = new Set(hub.tags.map(normalizeTag));
    const matchingVideos: Video[] = [];

    for (const video of videos) {
      const vTags = videoTagsMap.get(video.id) || [];
      if (vTags.some((t) => hubTagsNorm.has(t))) {
        matchingVideos.push(video);
      }
    }
    topicVideoMap.set(key, matchingVideos);
  }

  return { videoTagsMap, videoRawTagsMap, tagVideosMap, tagDisplayName, popularTags, relatedMap, videoById, topicVideoMap };
}

// --- Generators ---

function generateVideoNote(
  video: Video,
  graph: GraphData,
): string {
  const rawTags = graph.videoRawTagsMap.get(video.id) || [];
  const normalizedTags = graph.videoTagsMap.get(video.id) || [];
  const publishedDate = video.publishedAt
    ? video.publishedAt.toISOString().split("T")[0]
    : null;

  // Build YAML frontmatter
  const props: string[] = [];
  props.push(`title: ${escapeYaml(video.title)}`);
  props.push(`channel: ${escapeYaml(video.channelName || "Desconocido")}`);
  if (video.category) props.push(`category: ${escapeYaml(video.category)}`);
  if (video.language) props.push(`language: ${video.language}`);
  if (rawTags.length > 0) {
    props.push(`tags:`);
    rawTags.forEach((t) => props.push(`  - ${escapeYaml(t)}`));
  }
  if (video.viewCount != null) props.push(`views: ${video.viewCount}`);
  if (video.likeCount != null) props.push(`likes: ${video.likeCount}`);
  if (video.commentCount != null) props.push(`comments: ${video.commentCount}`);
  if (publishedDate) props.push(`published: ${publishedDate}`);
  if (video.duration) props.push(`duration: ${escapeYaml(formatDuration(video.duration))}`);
  props.push(`url: ${escapeYaml(video.url)}`);
  props.push(`youtubeId: ${video.youtubeId}`);
  props.push(`enriched: ${video.isEnriched}`);

  const frontmatter = `---\n${props.join("\n")}\n---`;

  // Build content sections
  const sections: string[] = [];

  if (video.description) {
    sections.push(`## Descripción\n\n${video.description}`);
  }

  sections.push(`## Video\n\n[Ver en YouTube](${video.url})`);

  if (video.thumbnailUrl) {
    sections.push(`![Thumbnail](${video.thumbnailUrl})`);
  }

  if (video.notes) {
    sections.push(`## Notas\n\n${video.notes}`);
  }

  // Related videos section
  const relatedIds = graph.relatedMap.get(video.id) || [];
  if (relatedIds.length >= 2) {
    const relatedLinks = relatedIds
      .map((id) => {
        const v = graph.videoById.get(id);
        return v ? `- [[${sanitizeFilename(v.title)}]]` : null;
      })
      .filter(Boolean)
      .join("\n");
    sections.push(`## Relacionados\n\n${relatedLinks}`);
  }

  // Links section
  const links: string[] = [];
  const channelName = video.channelName || "Desconocido";
  links.push(`**Canal**: [[${channelName}]]`);
  if (video.category) {
    links.push(`**Categoría**: [[${video.category}]]`);
  }

  // Topic hubs this video belongs to
  const videoTopics: string[] = [];
  for (const [key, hub] of Object.entries(TOPIC_HUBS)) {
    const hubTagsNorm = new Set(hub.tags.map(normalizeTag));
    if (normalizedTags.some((t) => hubTagsNorm.has(t))) {
      videoTopics.push(hub.title);
    }
  }
  if (videoTopics.length > 0) {
    links.push(`**Temas**: ${videoTopics.map((t) => `[[${t}]]`).join(" ")}`);
  }

  // Tags as wikilinks (popular) or hashtags (non-popular)
  if (rawTags.length > 0) {
    const tagLinks = rawTags.map((tag) => {
      const norm = normalizeTag(tag);
      const displayName = graph.tagDisplayName.get(norm) || tag;
      if (graph.popularTags.has(norm)) {
        return `[[${displayName}]]`;
      }
      return `#${tag.replace(/\s+/g, "-")}`;
    });
    // Deduplicate wikilinks (same normalized tag may appear with different casing)
    const seen = new Set<string>();
    const uniqueLinks = tagLinks.filter((link) => {
      const key = link.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    links.push(`**Tags**: ${uniqueLinks.join(" ")}`);
  }

  sections.push(links.join("\n"));

  return `${frontmatter}\n\n${sections.join("\n\n")}`;
}

function generateChannelMOC(channelName: string, videos: Video[]): string {
  const sorted = [...videos].sort((a, b) => {
    if (a.publishedAt && b.publishedAt) return b.publishedAt.getTime() - a.publishedAt.getTime();
    return 0;
  });

  const videoCount = videos.length;
  const categories = [...new Set(videos.map((v) => v.category).filter(Boolean))];

  const props = [
    `title: ${escapeYaml(channelName)}`,
    `type: canal`,
    `videos: ${videoCount}`,
  ];
  if (categories.length > 0) {
    props.push(`categorias:`);
    categories.forEach((c) => props.push(`  - ${escapeYaml(c!)}`));
  }

  const videoLinks = sorted
    .map((v) => `- [[${sanitizeFilename(v.title)}]] ${v.publishedAt ? `(${v.publishedAt.toISOString().split("T")[0]})` : ""}`)
    .join("\n");

  return `---\n${props.join("\n")}\n---\n\n# ${channelName}\n\n> [!info] ${videoCount} videos\n\n## Videos\n\n${videoLinks}`;
}

function generateCategoryMOC(category: string, videos: Video[]): string {
  const sorted = [...videos].sort((a, b) => {
    if (a.publishedAt && b.publishedAt) return b.publishedAt.getTime() - a.publishedAt.getTime();
    return 0;
  });

  const channels = [...new Set(videos.map((v) => v.channelName).filter(Boolean))];

  const props = [
    `title: ${escapeYaml(category)}`,
    `type: categoria`,
    `videos: ${videos.length}`,
  ];

  const videoLinks = sorted
    .map((v) => `- [[${sanitizeFilename(v.title)}]] — [[${v.channelName || "Desconocido"}]]`)
    .join("\n");

  const channelLinks = channels
    .map((c) => `- [[${c}]]`)
    .join("\n");

  return `---\n${props.join("\n")}\n---\n\n# ${category}\n\n> [!info] ${videos.length} videos de ${channels.length} canales\n\n## Canales\n\n${channelLinks}\n\n## Videos\n\n${videoLinks}`;
}

function generateTagMOC(
  tagNorm: string,
  graph: GraphData,
  videos: Video[],
): string {
  const displayName = graph.tagDisplayName.get(tagNorm) || tagNorm;
  const videoIds = graph.tagVideosMap.get(tagNorm) || [];
  const tagVideos = videoIds
    .map((id) => graph.videoById.get(id))
    .filter((v): v is Video => v !== undefined);

  // Sort by views descending
  tagVideos.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  const props = [
    `title: ${escapeYaml(displayName)}`,
    `type: tag`,
    `videos: ${tagVideos.length}`,
  ];

  // Group videos by category
  const byCategory = new Map<string, Video[]>();
  for (const v of tagVideos) {
    const cat = v.category || "Sin categoría";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(v);
  }

  let videosSection = "";
  if (byCategory.size > 1) {
    const parts: string[] = [];
    for (const [cat, catVideos] of byCategory) {
      const links = catVideos
        .map((v) => `- [[${sanitizeFilename(v.title)}]] — [[${v.channelName || "Desconocido"}]]`)
        .join("\n");
      parts.push(`### ${cat}\n\n${links}`);
    }
    videosSection = parts.join("\n\n");
  } else {
    videosSection = tagVideos
      .map((v) => `- [[${sanitizeFilename(v.title)}]] — [[${v.channelName || "Desconocido"}]]`)
      .join("\n");
  }

  // Co-occurring tags (related tags)
  const coOccurrence = new Map<string, number>();
  const videoIdsSet = new Set(videoIds);
  for (const [otherTag, otherIds] of graph.tagVideosMap) {
    if (otherTag === tagNorm) continue;
    if (!graph.popularTags.has(otherTag)) continue;
    const overlap = otherIds.filter((id) => videoIdsSet.has(id)).length;
    if (overlap >= 2) coOccurrence.set(otherTag, overlap);
  }

  const relatedTags = Array.from(coOccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let relatedSection = "";
  if (relatedTags.length > 0) {
    const tagLinks = relatedTags
      .map(([tag, count]) => `- [[${graph.tagDisplayName.get(tag) || tag}]] (${count} videos en común)`)
      .join("\n");
    relatedSection = `\n\n## Tags Relacionados\n\n${tagLinks}`;
  }

  return `---\n${props.join("\n")}\n---\n\n# ${displayName}\n\n> [!info] ${tagVideos.length} videos con este tag\n\n## Videos\n\n${videosSection}${relatedSection}`;
}

function generateTopicHub(
  key: string,
  hub: { title: string; description: string; tags: string[] },
  graph: GraphData,
): string {
  const matchingVideos = graph.topicVideoMap.get(key) || [];

  const props = [
    `title: ${escapeYaml(hub.title)}`,
    `type: tema`,
    `videos: ${matchingVideos.length}`,
  ];

  // Tag MOC links (only popular tags that have MOCs)
  const hubTagLinks = hub.tags
    .map(normalizeTag)
    .filter((t) => graph.popularTags.has(t))
    .map((t) => `- [[${graph.tagDisplayName.get(t) || t}]]`)
    .join("\n");

  // Top 15 videos by views
  const topVideos = [...matchingVideos]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 15)
    .map((v) => `- [[${sanitizeFilename(v.title)}]] — [[${v.channelName || "Desconocido"}]]`)
    .join("\n");

  // Related topic hubs (share videos)
  const relatedHubs: string[] = [];
  for (const [otherKey, otherHub] of Object.entries(TOPIC_HUBS)) {
    if (otherKey === key) continue;
    const otherVideos = graph.topicVideoMap.get(otherKey) || [];
    const otherIds = new Set(otherVideos.map((v) => v.id));
    const overlap = matchingVideos.filter((v) => otherIds.has(v.id)).length;
    if (overlap >= 3) {
      relatedHubs.push(`- [[${otherHub.title}]] (${overlap} videos en común)`);
    }
  }

  let relatedSection = "";
  if (relatedHubs.length > 0) {
    relatedSection = `\n\n## Temas Relacionados\n\n${relatedHubs.join("\n")}`;
  }

  return `---\n${props.join("\n")}\n---\n\n# ${hub.title}\n\n> [!abstract] ${hub.description}\n\n## Tags\n\n${hubTagLinks || "_(ningún tag popular asociado)_"}\n\n## Videos Destacados\n\n${topVideos || "_(sin videos)_"}${relatedSection}`;
}

function generateBase(): string {
  return `filters:
  and:
    - 'file.inFolder("Videos")'
    - 'file.ext == "md"'

formulas:
  views_formatted: 'if(views, views.toLocaleString(), "")'
  likes_formatted: 'if(likes, likes.toLocaleString(), "")'
  days_ago: 'if(published, (today() - date(published)).days, "")'

properties:
  title:
    displayName: "Título"
  channel:
    displayName: "Canal"
  category:
    displayName: "Categoría"
  language:
    displayName: "Idioma"
  formula.views_formatted:
    displayName: "Vistas"
  formula.likes_formatted:
    displayName: "Likes"
  published:
    displayName: "Fecha"
  duration:
    displayName: "Duración"
  enriched:
    displayName: "Enriquecido"
  formula.days_ago:
    displayName: "Hace (días)"

views:
  - type: table
    name: "Todos los Videos"
    order:
      - title
      - channel
      - category
      - language
      - formula.views_formatted
      - published
      - duration
    summaries:
      views: Sum
      formula.days_ago: Average

  - type: table
    name: "Por Categoría"
    order:
      - title
      - channel
      - category
      - formula.views_formatted
      - published
    groupBy:
      property: category
      direction: ASC

  - type: table
    name: "Por Canal"
    order:
      - title
      - category
      - formula.views_formatted
      - published
    groupBy:
      property: channel
      direction: ASC

  - type: table
    name: "Más Vistos"
    order:
      - title
      - channel
      - category
      - formula.views_formatted
      - formula.likes_formatted
      - published

  - type: cards
    name: "Galería"
    order:
      - title
      - channel
      - category
      - published`;
}

function generateCanvas(categoryMap: Map<string, Video[]>): string {
  const nodes: object[] = [];
  const edges: object[] = [];

  const centerId = generateHexId();
  nodes.push({
    id: centerId,
    type: "text",
    x: 0,
    y: 0,
    width: 300,
    height: 100,
    color: "5",
    text: "# Videos AI\n\n289 videos sobre Inteligencia Artificial",
  });

  // Category ring (outer)
  const categories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const catAngleStep = (2 * Math.PI) / Math.max(categories.length, 1);
  const catRadius = 800;
  const colors = ["1", "2", "3", "4", "5", "6"];

  categories.forEach(([category, videos], index) => {
    const angle = index * catAngleStep - Math.PI / 2;
    const x = Math.round(Math.cos(angle) * catRadius);
    const y = Math.round(Math.sin(angle) * catRadius);

    const groupId = generateHexId();
    const nodeId = generateHexId();
    const color = colors[index % colors.length];

    nodes.push({
      id: groupId,
      type: "group",
      x: x - 180,
      y: y - 60,
      width: 360,
      height: 140,
      label: category || "Sin categoría",
      color,
    });

    const topVideos = [...videos]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map((v) => `- ${v.title.slice(0, 50)}`)
      .join("\n");

    nodes.push({
      id: nodeId,
      type: "text",
      x: x - 160,
      y: y - 40,
      width: 320,
      height: 100,
      text: `**${videos.length} videos**\n\n${topVideos}`,
    });

    edges.push({
      id: generateHexId(),
      fromNode: centerId,
      toNode: groupId,
      toEnd: "arrow",
      label: `${videos.length}`,
    });
  });

  // Topic hub ring (inner)
  const topicEntries = Object.entries(TOPIC_HUBS);
  const topicAngleStep = (2 * Math.PI) / Math.max(topicEntries.length, 1);
  const topicRadius = 400;

  topicEntries.forEach(([, hub], index) => {
    const angle = index * topicAngleStep;
    const x = Math.round(Math.cos(angle) * topicRadius);
    const y = Math.round(Math.sin(angle) * topicRadius);

    const nodeId = generateHexId();
    nodes.push({
      id: nodeId,
      type: "text",
      x: x - 120,
      y: y - 40,
      width: 240,
      height: 80,
      color: "4",
      text: `## ${hub.title}`,
    });

    edges.push({
      id: generateHexId(),
      fromNode: centerId,
      toNode: nodeId,
      toEnd: "arrow",
      color: "4",
    });
  });

  return JSON.stringify({ nodes, edges }, null, 2);
}

// --- Main ---

async function main() {
  console.log("Exportando videos a Obsidian vault...\n");

  const videos = await prisma.video.findMany() as Video[];
  console.log(`Encontrados ${videos.length} videos en la BD.`);

  // Build graph data (tags, similarity, topics)
  console.log("Computando tags, similitud y temas...");
  const graph = buildGraphData(videos);
  console.log(`  Tags únicos: ${graph.tagVideosMap.size}`);
  console.log(`  Tags populares (≥${MIN_TAG_VIDEOS} videos): ${graph.popularTags.size}`);
  const videosWithRelated = Array.from(graph.relatedMap.values()).filter((r) => r.length >= 2).length;
  console.log(`  Videos con ≥2 relacionados: ${videosWithRelated}`);
  console.log("");

  // Create directories
  [VAULT_DIR, VIDEOS_DIR, CANALES_DIR, CATEGORIAS_DIR, TAGS_DIR, TEMAS_DIR].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Clean old files in regenerated directories
  for (const dir of [VIDEOS_DIR, CANALES_DIR, CATEGORIAS_DIR, TAGS_DIR, TEMAS_DIR]) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
  }

  // Group by channel and category
  const channelMap = new Map<string, Video[]>();
  const categoryMap = new Map<string, Video[]>();

  for (const video of videos) {
    const channel = video.channelName || "Desconocido";
    if (!channelMap.has(channel)) channelMap.set(channel, []);
    channelMap.get(channel)!.push(video);

    const category = video.category || "Sin categoría";
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(video);
  }

  // Generate video notes
  let count = 0;
  for (const video of videos) {
    const filename = sanitizeFilename(video.title) + ".md";
    const filepath = path.join(VIDEOS_DIR, filename);
    fs.writeFileSync(filepath, generateVideoNote(video, graph), "utf-8");
    count++;
  }
  console.log(`✓ ${count} notas de video generadas en Videos/`);

  // Generate channel MOCs
  let channelCount = 0;
  for (const [channel, channelVideos] of channelMap) {
    const filename = sanitizeFilename(channel) + ".md";
    const filepath = path.join(CANALES_DIR, filename);
    fs.writeFileSync(filepath, generateChannelMOC(channel, channelVideos), "utf-8");
    channelCount++;
  }
  console.log(`✓ ${channelCount} notas de canal generadas en Canales/`);

  // Generate category MOCs
  let catCount = 0;
  for (const [category, catVideos] of categoryMap) {
    const filename = sanitizeFilename(category) + ".md";
    const filepath = path.join(CATEGORIAS_DIR, filename);
    fs.writeFileSync(filepath, generateCategoryMOC(category, catVideos), "utf-8");
    catCount++;
  }
  console.log(`✓ ${catCount} notas de categoría generadas en Categorías/`);

  // Generate Tag MOCs
  let tagCount = 0;
  for (const tagNorm of graph.popularTags) {
    const displayName = graph.tagDisplayName.get(tagNorm) || tagNorm;
    const filename = sanitizeFilename(displayName) + ".md";
    const filepath = path.join(TAGS_DIR, filename);
    fs.writeFileSync(filepath, generateTagMOC(tagNorm, graph, videos), "utf-8");
    tagCount++;
  }
  console.log(`✓ ${tagCount} Tag MOCs generados en Tags/`);

  // Generate Topic Hubs
  let topicCount = 0;
  for (const [key, hub] of Object.entries(TOPIC_HUBS)) {
    const filename = sanitizeFilename(hub.title) + ".md";
    const filepath = path.join(TEMAS_DIR, filename);
    fs.writeFileSync(filepath, generateTopicHub(key, hub, graph), "utf-8");
    topicCount++;
  }
  console.log(`✓ ${topicCount} Topic Hubs generados en Temas/`);

  // Generate Obsidian Base
  const basePath = path.join(VAULT_DIR, "Videos AI.base");
  fs.writeFileSync(basePath, generateBase(), "utf-8");
  console.log(`✓ Base generada: Videos AI.base`);

  // Generate JSON Canvas
  const canvasPath = path.join(VAULT_DIR, "Dashboard.canvas");
  fs.writeFileSync(canvasPath, generateCanvas(categoryMap), "utf-8");
  console.log(`✓ Canvas generado: Dashboard.canvas`);

  console.log(`\n¡Vault generado en ${VAULT_DIR}!`);
  console.log(`Abre esa carpeta como vault en Obsidian para explorar los videos.`);
  console.log(`\nTip: En Graph View, usa los filtros de color por 'path' para colorear:`);
  console.log(`  - Videos/ → un color`);
  console.log(`  - Tags/ → otro color`);
  console.log(`  - Temas/ → otro color`);
  console.log(`  - Canales/ → otro color`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e);
  prisma.$disconnect();
  process.exit(1);
});
