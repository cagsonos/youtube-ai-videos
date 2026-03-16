"use client";

import { Badge } from "@/components/ui/badge";

export const CATEGORY_COLORS: Record<string, string> = {
  "Agentes IA":
    "bg-purple-500/10 text-purple-300 border-purple-500/20 shadow-purple-500/5",
  LLMs: "bg-blue-500/10 text-blue-300 border-blue-500/20 shadow-blue-500/5",
  "Modelos de Imagen":
    "bg-pink-500/10 text-pink-300 border-pink-500/20 shadow-pink-500/5",
  "Herramientas No-Code":
    "bg-orange-500/10 text-orange-300 border-orange-500/20 shadow-orange-500/5",
  "Tutoriales Técnicos":
    "bg-green-500/10 text-green-300 border-green-500/20 shadow-green-500/5",
  "Noticias y Tendencias":
    "bg-yellow-500/10 text-yellow-300 border-yellow-500/20 shadow-yellow-500/5",
  "Productividad con IA":
    "bg-cyan-500/10 text-cyan-300 border-cyan-500/20 shadow-cyan-500/5",
  "Programación con IA":
    "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-emerald-500/5",
  Automatización:
    "bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-amber-500/5",
  Robótica:
    "bg-red-500/10 text-red-300 border-red-500/20 shadow-red-500/5",
  Otros: "bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5",
};

export const CATEGORY_DOT_COLORS: Record<string, string> = {
  "Agentes IA": "bg-purple-400",
  LLMs: "bg-blue-400",
  "Modelos de Imagen": "bg-pink-400",
  "Herramientas No-Code": "bg-orange-400",
  "Tutoriales Técnicos": "bg-green-400",
  "Noticias y Tendencias": "bg-yellow-400",
  "Productividad con IA": "bg-cyan-400",
  "Programación con IA": "bg-emerald-400",
  Automatización: "bg-amber-400",
  Robótica: "bg-red-400",
  Otros: "bg-gray-400",
};

export function TagBadge({
  children,
  variant = "tag",
}: {
  children: React.ReactNode;
  variant?: "tag" | "category";
}) {
  if (variant === "category") {
    const text = typeof children === "string" ? children : "";
    const colorClass = CATEGORY_COLORS[text] || CATEGORY_COLORS["Otros"];
    const dotColor = CATEGORY_DOT_COLORS[text] || CATEGORY_DOT_COLORS["Otros"];
    return (
      <Badge
        variant="outline"
        className={`text-[10px] font-medium tracking-wide uppercase shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${colorClass}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} mr-1`} />
        {children}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="text-[10px] bg-teal/5 text-teal border-teal/15 font-normal transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-teal/10"
    >
      {children}
    </Badge>
  );
}
