import OpenAI from "openai";
import { DEFAULT_MODEL } from "./models";

export interface CategorizeResult {
  category: string;
  language: string;
  tags: string[];
}

export const FIXED_CATEGORIES = [
  { name: "Agentes IA y Sistemas Multi-Agente", description: "Construcción y despliegue de agentes IA, sistemas multi-agente, frameworks de agentes, patrones de diseño de agentes, agent swarms" },
  { name: "RAG y Bases de Conocimiento", description: "Retrieval-Augmented Generation, vectores, embeddings, chunking, reranking, LightRAG, GraphRAG, bases de conocimiento semánticas" },
  { name: "Agentes de Voz", description: "Voice AI con Retell AI, Vapi, ElevenLabs, LiveKit, Bland AI, telefonía, SIP trunking, Twilio, agentes telefónicos" },
  { name: "WhatsApp y Chatbots", description: "Bots de WhatsApp, Telegram, SMS, interfaces conversacionales, chatbots en plataformas de mensajería" },
  { name: "n8n Workflows y Automatización", description: "Core n8n: creación de workflows, nodos, tips, webhooks, cursos de n8n, hacks, Loop Over Items, datos en n8n" },
  { name: "Web Scraping y Extracción de Datos", description: "Scraping web, Firecrawl, Apify, OCR, extracción de documentos PDF, browser automation, crawling" },
  { name: "Claude Code y Desarrollo con IA", description: "Claude Code tutorials, skills, Cursor, vibe coding, desarrollo de software asistido por IA, AI coding agents" },
  { name: "MCP (Model Context Protocol)", description: "Servidores MCP, clientes MCP, integración MCP con n8n, Docker MCP, Brave Search MCP, protocolo de contexto" },
  { name: "Infraestructura y Despliegue", description: "VPS, Docker, self-hosting n8n, producción, EasyPanel, Hostinger, Coolify, instalación de servidores, deploy" },
  { name: "Bases de Datos y Almacenamiento", description: "Supabase, Redis, Neo4j, PostgreSQL, SQL agents, database webhooks, knowledge graphs con bases de datos" },
  { name: "LLMs y Modelos de IA", description: "Modelos específicos (Gemini, GPT, Claude), comparaciones de modelos, prompt engineering, AI safety, guardrails" },
  { name: "Automatización de Email y CRM", description: "Gmail automation, leads, CRM, GoHighLevel, cold outreach, email workflows, gestión de contactos" },
  { name: "Generación de Contenido con IA", description: "Video AI (Sora, HeyGen, VEO), generación de imágenes, AI clones, content automation, avatares IA" },
  { name: "Negocio y Monetización con IA", description: "Vender servicios IA, agencias de IA, pricing, estrategias de negocio, monetización de workflows" },
  { name: "SaaS y Aplicaciones No-Code", description: "Lovable, Base44, Replit, dashboards, apps sin código, front-ends para sistemas IA, desarrollo no-code" },
  { name: "Herramientas y Recursos IA", description: "Reviews de herramientas, comparaciones de plataformas, conceptos generales de IA, recursos, misceláneos" },
] as const;

const CATEGORY_NAMES = FIXED_CATEGORIES.map((c) => c.name);

let _client: OpenAI | null = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada");
  _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
  return _client;
}

export async function categorizeVideo(input: {
  title: string;
  description: string;
  channelName: string;
  keywords: string | null;
  model?: string;
}): Promise<CategorizeResult> {
  const client = getClient();

  const tagsInstruction = `3. Entre 8 y 12 tags temáticos relevantes en español (palabras clave). Usa minúsculas consistentes (excepto nombres propios y acrónimos). No generes tags que sean variantes menores de otros (ej: "n8n workflow" y "n8n workflow automation" — elige el más específico). Mantén los tags concisos (2-4 palabras máximo)`;

  const categoryList = FIXED_CATEGORIES.map((c) => `- "${c.name}": ${c.description}`).join("\n");

  const prompt = `Dado este video de YouTube:
Título: ${input.title}
Descripción: ${input.description}
Canal: ${input.channelName}
${input.keywords ? `Keywords existentes: ${input.keywords}` : "Sin keywords disponibles."}

Genera en español:
1. Una categoría principal para este video. DEBES elegir EXACTAMENTE una de las siguientes categorías (copia el nombre exacto):
${categoryList}
2. El idioma principal del video (español/inglés/otro)
${tagsInstruction}

Responde SOLO con JSON válido, sin markdown ni texto adicional:
{ "category": "...", "language": "...", "tags": [...] }`;

  const response = await client.chat.completions.create(
    {
      model: input.model || DEFAULT_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    },
    { signal: AbortSignal.timeout(30_000) }
  );

  const text = response.choices[0]?.message?.content || "";

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`La IA no retornó JSON válido: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate category is from the fixed list, fallback if not
  const category = CATEGORY_NAMES.includes(parsed.category)
    ? parsed.category
    : "Herramientas y Recursos IA";

  return {
    category,
    language: parsed.language || "español",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

export async function summarizeVideo(input: {
  title: string;
  description: string;
  channelName: string;
  youtubeDescription?: string | null;
  model?: string;
}): Promise<string> {
  const client = getClient();

  const descriptionContext = input.youtubeDescription
    ? `Descripción de YouTube: ${input.youtubeDescription}`
    : "";

  const prompt = `Dado este video de YouTube:
Título: ${input.title}
Canal: ${input.channelName}
Descripción existente: ${input.description}
${descriptionContext}

Genera un resumen conciso en español del contenido de este video en 3-5 bullet points.
Cada bullet point debe empezar con "•".
Enfócate en los temas clave y lo que el espectador aprenderá.
Responde SOLO con los bullet points, sin introducción ni conclusión.`;

  const response = await client.chat.completions.create(
    {
      model: input.model || DEFAULT_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    },
    { signal: AbortSignal.timeout(30_000) }
  );

  const text = response.choices[0]?.message?.content || "";

  if (!text.trim()) {
    throw new Error("La IA retornó un resumen vacío");
  }

  return text.trim();
}
