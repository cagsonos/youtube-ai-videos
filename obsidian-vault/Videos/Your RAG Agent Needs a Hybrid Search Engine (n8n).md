---
title: Your RAG Agent Needs a Hybrid Search Engine (n8n)
channel: The AI Automators
category: RAG y Bases de Conocimiento
language: inglés
tags:
  - hybrid search
  - n8n
  - embeddings densos
  - BM25
  - reciprocal rank fusion
  - procesamiento de PDF
  - búsqueda léxica
  - Pinecone
  - Supabase
  - retrieval semántico
  - OCR
views: 17389
likes: 680
comments: 33
published: 2025-10-01
duration: 28m 44s
url: "https://youtu.be/FgUJ2kzhmKQ"
youtubeId: FgUJ2kzhmKQ
enriched: true
---

## Descripción

• El video explica por qué los embeddings densos solos fallan en búsquedas exactas como códigos o IDs en PDFs, y presenta un motor de búsqueda híbrida en n8n que combina embeddings densos, retrieval esparcido (BM25) y coincidencia de patrones (wildcards, trigrams, fuzzy).
• Aprenderás cómo funciona la búsqueda dinámica, donde el agente AI ajusta pesos según el tipo de consulta (patrones para códigos, semántica para conceptos) y usa Reciprocal Rank Fusion (RRF) para fusionar resultados.
• Se detalla la construcción del sistema con Supabase, Pinecone y n8n, incluyendo OCR, preprocesamiento de PDFs y fallbacks para datos no estructurados.
• Temas clave: limitaciones de vectores, retrieval léxico/esparcido, matching de patrones y optimización de RAG para consultas complejas.

## Video

[Ver en YouTube](https://youtu.be/FgUJ2kzhmKQ)

![Thumbnail](https://i.ytimg.com/vi/FgUJ2kzhmKQ/maxresdefault.jpg)

## Relacionados

- [[n8n RAG Masterclass - Build AI Agents + Systems that Actually Work]]
- [[How to Create an RAG Chatbot AI Agent with n8n (No Code, Step-by-Step Tutorial)]]
- [[Import EVERYTHING Into Your RAG Agent (Docling & LlamaParse)]]
- [[The One RAG Method for Incredibly Accurate Responses (n8n)]]
- [[This AI Agent Extracts Text From Images in n8n]]

**Canal**: [[The AI Automators]]
**Categoría**: [[RAG y Bases de Conocimiento]]
**Temas**: [[n8n y Automatización]] [[RAG y Bases de Conocimiento]] [[Datos y Web Scraping]] [[Infraestructura y Deploy]]
**Tags**: #hybrid-search [[n8n]] #embeddings-densos #BM25 #reciprocal-rank-fusion #procesamiento-de-PDF #búsqueda-léxica [[pinecone]] [[supabase]] #retrieval-semántico #OCR