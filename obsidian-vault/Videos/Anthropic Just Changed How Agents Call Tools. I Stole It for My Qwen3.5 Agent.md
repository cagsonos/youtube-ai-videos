---
title: Anthropic Just Changed How Agents Call Tools. I Stole It for My Qwen3.5 Agent
channel: Desconocido
category: Agentes IA y Sistemas Multi-Agente
language: inglés
tags:
  - anthropic
  - qwen 3.5
  - tool search
  - patrones de arquitectura
  - ejecución de código
  - agentes locales
  - reducción de tokens
  - docker
  - tool bridge
  - orquestación de herramientas
views: 78718
likes: 1912
comments: 69
duration: 17m 41s
url: "https://youtu.be/R7OCrqyGMeY?si=75jBK4eCM6OU25X3"
youtubeId: R7OCrqyGMeY
enriched: true
---

## Descripción

• El video enseña cómo implementar dos patrones avanzados de Anthropic para optimizar agentes de IA: la búsqueda de herramientas bajo demanda (*tool search*) y la ejecución programática de herramientas mediante sandboxes de código.

• Explica cómo reducir drásticamente el consumo de tokens y el ruido en el contexto al permitir que el agente busque herramientas solo cuando las necesite, en lugar de cargar todas las definiciones al inicio.

• Demuestra el uso de la ejecución programática para que el LLM escriba código que orqueste múltiples llamadas a herramientas en bucles eficientes, mejorando la precisión en tareas complejas frente al método tradicional de "paso a paso".

• Presenta una comparativa de rendimiento entre Claude Haiku y el nuevo Qwen 3.5 27B ejecutado localmente, mostrando cómo estas técnicas son agnósticas al modelo y escalan mejor para flujos de trabajo con grandes volúmenes de datos.

• Detalla una arquitectura segura de "puente de herramientas" (*tool bridge*) utilizando Docker y gVisor para permitir que el agente ejecute código y acceda a APIs sin comprometer la seguridad o las credenciales.

## Video

[Ver en YouTube](https://youtu.be/R7OCrqyGMeY?si=75jBK4eCM6OU25X3)

![Thumbnail](https://i.ytimg.com/vi/R7OCrqyGMeY/maxresdefault.jpg)

**Canal**: [[Desconocido]]
**Categoría**: [[Agentes IA y Sistemas Multi-Agente]]
**Temas**: [[Infraestructura y Deploy]]
**Tags**: [[Anthropic]] #qwen-3.5 #tool-search #patrones-de-arquitectura #ejecución-de-código #agentes-locales #reducción-de-tokens #docker #tool-bridge #orquestación-de-herramientas