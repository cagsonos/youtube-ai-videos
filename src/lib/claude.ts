import Anthropic from "@anthropic-ai/sdk";
import { FIXED_CATEGORIES } from "./ai";

export interface CategorizeResult {
  category: string;
  language: string;
  tags: string[];
}

const CATEGORY_NAMES = FIXED_CATEGORIES.map((c) => c.name);

export async function categorizeVideo(input: {
  title: string;
  description: string;
  channelName: string;
  keywords: string | null;
}): Promise<CategorizeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const client = new Anthropic({ apiKey });

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

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude no retornó JSON válido: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

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
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const client = new Anthropic({ apiKey });

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

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  if (!text.trim()) {
    throw new Error("Claude retornó un resumen vacío");
  }

  return text.trim();
}
