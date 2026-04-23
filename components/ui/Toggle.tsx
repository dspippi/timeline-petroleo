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
          enabled ? "bg-amber-500 dark:bg-[#b7ff00] dark:shadow-[0_0_12px_rgba(183,255,0,0.36)]" : "bg-gray-200 group-hover:bg-gray-300 dark:bg-[#1a2733] dark:group-hover:bg-[#243545]"
        }`}
        onClick={() => onChange(!enabled)}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white dark:bg-[#061018] shadow transition-transform duration-200 ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className={`text-xs transition-colors ${enabled ? "text-gray-700 dark:text-[#f2f7f4]" : "text-gray-400 dark:text-[#526173]"}`}>
        {label}
      </span>
    </label>
  );
}
