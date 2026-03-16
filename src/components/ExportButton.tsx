"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/export");

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al exportar");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "Neural-Cinema-Biblioteca.xlsx";

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Biblioteca exportada correctamente");
    } catch {
      toast.error("Error de conexión al exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              onClick={handleExport}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2 border-border hover:border-teal/30 hover:bg-teal/5 hover:text-teal transition-all duration-200"
            />
          }
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar
        </TooltipTrigger>
        <TooltipContent side="bottom">Descargar biblioteca como Excel</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
