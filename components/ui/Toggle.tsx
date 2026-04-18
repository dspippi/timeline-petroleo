"use client";

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Toggle({ enabled, onChange, label }: Props) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      <div
        role="switch"
        aria-checked={enabled}
        className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
          enabled ? "bg-amber-500" : "bg-gray-200 group-hover:bg-gray-300"
        }`}
        onClick={() => onChange(!enabled)}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className={`text-xs transition-colors ${enabled ? "text-gray-700" : "text-gray-400"}`}>
        {label}
      </span>
    </label>
  );
}
