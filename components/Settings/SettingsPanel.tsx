"use client";

import { useRef, useEffect } from "react";
import { useSettings, DEFAULT_SETTINGS } from "@/context/SettingsContext";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-600">{label}</span>
        <span className="text-[11px] font-mono text-gray-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500"
      />
    </label>
  );
}

export function SettingsPanel({ open, onClose, anchorRef }: Props) {
  const { settings, updateSettings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-xl border border-black/10 shadow-lg p-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Configurações
        </span>
        <button
          onClick={() => updateSettings(DEFAULT_SETTINGS)}
          className="text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
        >
          Restaurar padrões
        </button>
      </div>

      <Slider
        label="Altura das linhas"
        value={settings.rowHeight}
        min={36}
        max={120}
        step={4}
        unit="px"
        onChange={(v) => updateSettings({ rowHeight: v })}
      />

      <Slider
        label="Tamanho do marcador"
        value={settings.markerSize}
        min={6}
        max={30}
        step={1}
        unit="px"
        onChange={(v) => updateSettings({ markerSize: v })}
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.showEventLabels}
          onChange={(e) => updateSettings({ showEventLabels: e.target.checked })}
          className="w-3.5 h-3.5 rounded accent-amber-500"
        />
        <span className="text-[11px] font-medium text-gray-600">
          Mostrar rótulos dos eventos
        </span>
      </label>
    </div>
  );
}
