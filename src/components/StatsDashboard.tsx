"use client";

import { useState, useEffect } from "react";
import { Film, Sparkles, Clock, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

interface StatsDashboardProps {
  stats: {
    total: number;
    enriched: number;
  } | null;
  categoriesCount: number;
}

function ProgressRing({ percentage }: { percentage: number }) {
  const size = 80;
  const radius = 33;
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
        stroke="url(#dashTealGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
      <defs>
        <linearGradient id="dashTealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.5 0.12 185)" />
          <stop offset="100%" stopColor="oklch(0.72 0.16 185)" />
        </linearGradient>
      </defs>
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-teal font-extrabold"
        fontSize="18"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export function StatsDashboard({ stats, categoriesCount }: StatsDashboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!stats) return null;

  const enrichPercent = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;
  const pendingCount = stats.total - stats.enriched;

  return (
    <div className="animate-fade-slide-up">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-200 mb-3"
      >
        {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        {collapsed ? "Mostrar estadísticas" : "Ocultar estadísticas"}
      </button>

      {!collapsed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Videos */}
          <div
            className="animate-card-reveal glass-panel stat-gradient-teal rounded-xl p-5 flex items-center gap-4"
            style={{ animationDelay: "0s" }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal/15 border border-teal/25 icon-glow-teal">
              <Film className="w-6 h-6 text-teal" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gradient-teal">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium">Videos totales</p>
            </div>
          </div>

          {/* Enriched with ring */}
          <div
            className="animate-card-reveal glass-panel stat-gradient-teal rounded-xl p-5 flex items-center gap-4"
            style={{ animationDelay: "0.06s" }}
          >
            <ProgressRing percentage={enrichPercent} />
            <div>
              <p className="text-3xl font-extrabold text-teal">{stats.enriched}</p>
              <p className="text-xs text-muted-foreground font-medium">Enriquecidos</p>
            </div>
          </div>

          {/* Pending */}
          <div
            className="animate-card-reveal glass-panel stat-gradient-amber rounded-xl p-5 flex items-center gap-4"
            style={{ animationDelay: "0.12s" }}
          >
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-amber/15 border border-amber/25 ${pendingCount > 0 ? "animate-pulse-glow icon-glow-amber" : ""}`}>
              <Clock className="w-6 h-6 text-amber" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber">{pendingCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Pendientes</p>
            </div>
          </div>

          {/* Categories */}
          <div
            className="animate-card-reveal glass-panel stat-gradient-purple rounded-xl p-5 flex items-center gap-4"
            style={{ animationDelay: "0.18s" }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/25 icon-glow-purple">
              <FolderOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-300">{categoriesCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Categorías</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
