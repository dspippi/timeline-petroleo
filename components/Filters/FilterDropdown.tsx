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
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-[#b7ff00] dark:bg-[rgba(183,255,0,0.09)] dark:text-[#d8ff66] dark:shadow-[0_0_12px_rgba(183,255,0,0.16)]"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-[#2a3948] dark:bg-[#071018] dark:text-[#dce8e1] dark:hover:border-[#b7ff00] dark:hover:text-[#f2f7f4]"
        }`}
      >
        <span className="font-medium">{label}</span>
        {count > 0 && (
          <span className="bg-amber-500 dark:bg-[#b7ff00] text-white dark:text-[#061018] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none shrink-0">
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
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#071018] border border-gray-200 dark:border-[#2a3948] rounded shadow-lg dark:shadow-[0_12px_36px_rgba(0,0,0,0.42),0_0_0_1px_rgba(183,255,0,0.06)] z-50 min-w-[160px] max-h-[260px] overflow-y-auto">
          {count > 0 && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] text-amber-600 dark:text-[#b7ff00] hover:bg-amber-50 dark:hover:bg-[rgba(183,255,0,0.08)] border-b border-gray-100 dark:border-[#1d2a36] font-medium"
            >
              Limpar seleção
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#0d1823] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onToggle(opt.value)}
                className="w-3 h-3 accent-amber-500 dark:accent-[#b7ff00] shrink-0"
              />
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="text-[11px] text-gray-700 dark:text-[#dce8e1] truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});
