# YouTube AI Videos

Aplicación web para organizar y explorar una colección personal de videos de YouTube sobre IA.

## Stack
- Next.js 16 (App Router, async params) + TypeScript + Tailwind CSS 4 + shadcn/ui
- SQLite + Prisma ORM (base de datos local, `dev.db`)
- YouTube Data API v3 (thumbnails, estadísticas, duración)
- OpenRouter API (categorización + tags, modelo seleccionable desde la UI, default: `google/gemini-3-flash-preview`)
- xlsx (exportación de Excel, requiere `serverExternalPackages` en next.config.mjs)

## Variables de entorno
Copiar `.env.example` a `.env` y completar:
- `YOUTUBE_API_KEY` — Google Cloud Console → APIs & Services → habilitar YouTube Data API v3
- `OPENROUTER_API_KEY` — openrouter.ai → API Keys
- `DATABASE_URL` — ya configurado para SQLite local (`file:./dev.db`)

## Comandos
```bash
npm run dev          # Servidor de desarrollo en localhost:3000 (usa --webpack + 4GB heap)
npm run build        # Build de producción (4GB heap)
npm start            # Servidor de producción
npm run lint         # ESLint
npx prisma db push   # Sincronizar schema con BD
npx prisma studio    # GUI para explorar la BD
npx prisma generate  # Regenerar cliente Prisma
```

## Scripts
```bash
npx tsx scripts/import.ts              # Importar data/Lista de Videos AI.xlsx → BD
npx tsx scripts/export-obsidian.ts     # Exportar BD → obsidian-vault/
npx tsx scripts/categorize-pending.ts  # Categorizar videos con category=null vía OpenRouter
```

## API Routes

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/videos` | GET | Query galería: `q`, `canal`, `categoria`, `tags`, `enriched`, `sort`, `order`, `page` (solo videos + paginación) |
| `/api/videos/[id]` | GET | Video por ID |
| `/api/videos/[id]` | PATCH | Editar: `notes`, `aiTags`, `keywords`, `category` |
| `/api/filters` | GET | Canales, categorías y stats (total/enriched) — cacheado en frontend, refrescado solo en mutaciones |
| `/api/enrich` | POST | Enriquecer 1 video. Body: `{ id, model? }` o `{ youtubeId, model? }` |
| `/api/enrich-all` | POST | Enriquecer todos — **streaming NDJSON**, concurrencia=3. Body: `{ model? }` |
| `/api/recategorize-all` | POST | Recategorizar todos — **streaming NDJSON**. Body: `{ model? }` |
| `/api/add-video` | POST | Agregar video por URL de YouTube |
| `/api/export` | GET | Exportar biblioteca completa a Excel (.xlsx) |
| `/api/categories` | GET | Lista de categorías únicas |
| `/api/tags` | GET | Lista de tags únicos |

Las rutas streaming envían NDJSON con eventos: `start`, `progress`, `enriched`, `error`, `done`. Config requerida: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

## Arquitectura

```
src/
├── lib/
│   ├── prisma.ts       # Prisma client singleton
│   ├── youtube.ts      # YouTube Data API v3 (batch fetch, 50/request)
│   ├── ai.ts           # OpenRouter: categorización + resumen (singleton client)
│   ├── enrich.ts       # Lógica compartida de enriquecimiento (YouTube + IA + DB update)
│   ├── buildVideoWhere.ts # Query builder: construye Prisma where conditions para filtros
│   ├── claude.ts       # ⚠️ Anthropic SDK alternativo — NO IMPORTADO, dead code
│   ├── models.ts       # 8 modelos disponibles (DEFAULT_MODEL: google/gemini-3-flash-preview)
│   ├── excel.ts        # Import/export Excel (parseExcelFile solo para scripts)
│   └── utils.ts        # cn() helper
├── app/
│   ├── page.tsx        # Galería principal: paginación, filtros, búsqueda
│   ├── video/[id]/     # Detalle de video: notas editables, tags, embed
│   └── api/            # Ver tabla API Routes
├── components/         # 14 custom + 13 shadcn/ui
```

Otros directorios:
- `prisma/schema.prisma` — modelo Video (25 campos)
- `scripts/` — `import.ts`, `export-obsidian.ts`
- `obsidian-vault/` — vault generado (Videos/, Canales/, Categorías/, Tags/, Temas/)
- `data/` — `Lista de Videos AI.xlsx` (fuente original)
- `next.config.mjs` — remote images (YouTube), serverExternalPackages: ["xlsx"]

## Convenciones
- Interfaz y contenido generado en español
- Dark mode por defecto
- Path alias: `@/*` → `./src/*`
- Campos JSON en SQLite como String: `aiTags` y `youtubeTags` → `JSON.stringify/parse`
- Campo `keywords` → string delimitado por `-` o `\n` (no JSON)
- 16 categorías fijas en `src/lib/ai.ts` (`FIXED_CATEGORIES`) — la IA debe elegir de esta lista
- Enriquecimiento parcial: si YouTube falla pero la IA funciona (o viceversa), se marca `isEnriched: true`
- Modelo IA seleccionable desde UI (ModelSelector), preferencia en localStorage
- `enrich.ts` centraliza la lógica de enriquecimiento — tanto `enrich/route.ts` como `enrich-all/route.ts` lo usan
- `enrich-all` usa concurrencia acotada (`CONCURRENCY=3`), sin delay fijo entre requests
- `/api/filters` se fetchea una vez al montar y se refresca solo en mutaciones (add, delete, enrich, recategorize)

## Gotchas
- **Descripción se sobreescribe**: Al enriquecer, el resumen IA reemplaza `description` — la descripción original del Excel se pierde
- **`aiSummary` no se usa**: El campo existe en el schema pero siempre es `null` (el resumen va a `description`)
- **`channelThumbnailUrl` nunca se puebla**: Requeriría un call extra a `channels.list` de YouTube
- **Búsqueda limitada**: Prisma `.contains()` = LIKE en SQLite — sin stemming ni fuzzy matching
- **`claude.ts` es dead code**: Duplica `ai.ts` con Anthropic SDK directo, pero ningún archivo lo importa
- **`parseExcelFile` en `excel.ts`**: Usa `path` y `fs` — solo se llama desde `scripts/import.ts`, no desde la app web
- **Errores pre-existentes en tsc**: `.next/` cache tiene tipos stale de una ruta `/api/import` eliminada; `export/route.ts` tiene un tipo Buffer incompatible

## Rate limits
- YouTube Data API: 10,000 units/día (videos.list = 1 unit por batch de 50 IDs)
- OpenRouter API: según modelo y plan (enrich-all procesa 3 videos en paralelo)
