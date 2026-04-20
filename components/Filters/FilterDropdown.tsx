"use client";

import { memo, useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}

export const FilterDropdown = memo(function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = selected.size;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors whitespace-nowrap ${
          count > 0
            ? "border-amber-400 bg-amber-50 text-amber-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
        }`}
      >
        <span className="font-medium">{label}</span>
        {count > 0 && (
          <span className="bg-amber-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none shrink-0">
            {count}
          </span>
        )}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[160px] max-h-[260px] overflow-y-auto">
          {count > 0 && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] text-amber-600 hover:bg-amber-50 border-b border-gray-100 font-medium"
            >
              Limpar seleção
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onToggle(opt.value)}
                className="w-3 h-3 accent-amber-500 shrink-0"
              />
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="text-[11px] text-gray-700 truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});
