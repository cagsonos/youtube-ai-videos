"use client";

import { MODEL_OPTIONS, LOCALSTORAGE_KEY } from "@/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

function getModelDotColor(modelValue: string): string {
  if (modelValue.includes("gemini")) return "bg-green-400";
  if (modelValue.includes("claude")) return "bg-orange-400";
  if (modelValue.includes("gpt") || modelValue.includes("openai")) return "bg-emerald-400";
  if (modelValue.includes("llama") || modelValue.includes("meta")) return "bg-blue-400";
  if (modelValue.includes("mistral")) return "bg-amber-400";
  return "bg-teal";
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const currentLabel =
    MODEL_OPTIONS.find((m) => m.value === value)?.label || value;
  const dotColor = getModelDotColor(value);

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (!val) return;
        onChange(val);
        localStorage.setItem(LOCALSTORAGE_KEY, val);
      }}
    >
      <SelectTrigger size="sm" className="w-[180px]">
        <div className="flex items-center gap-1.5">
          <Bot className="size-3.5 text-teal" />
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        </div>
        <SelectValue placeholder="Modelo IA">{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {MODEL_OPTIONS.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${getModelDotColor(m.value)}`} />
              {m.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
