"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, X, Command } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const debouncedOnChange = useCallback(
    (() => {
      let timer: NodeJS.Timeout;
      return (val: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => onChange(val), 300);
      };
    })(),
    [onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative flex-1 max-w-lg transition-all duration-300 ${
        focused ? "max-w-2xl" : ""
      }`}
    >
      <Search
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors duration-200 ${
          focused ? "text-teal" : "text-muted-foreground"
        }`}
      />
      <input
        ref={inputRef}
        placeholder="Buscar videos, canales, tags..."
        value={localValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full h-12 pl-11 pr-28 rounded-xl text-base transition-all duration-200 outline-none placeholder:text-muted-foreground/50 ${
          focused
            ? "glass-panel border-teal/40 ring-2 ring-teal/15 shadow-xl shadow-teal/10"
            : "bg-surface border border-border hover:border-teal/20"
        }`}
      />

      {/* Right side indicators */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Result count badge */}
        {localValue && resultCount !== undefined && (
          <span className="text-[10px] text-muted-foreground bg-surface-hover px-1.5 py-0.5 rounded-md border border-border/40">
            {resultCount} resultado{resultCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Clear button */}
        {localValue && (
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-surface-hover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Ctrl+K hint */}
        {!localValue && !focused && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40 bg-surface/50 px-1.5 py-0.5 rounded-md border border-border/30">
            <Command className="w-2.5 h-2.5" />
            K
          </span>
        )}
      </div>
    </div>
  );
}
