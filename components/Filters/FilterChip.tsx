"use client";

interface Props {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, color, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
        active
          ? "text-gray-900 shadow-sm"
          : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 bg-white"
      }`}
      style={
        active && color
          ? {
              backgroundColor: color + "18",
              borderColor: color + "88",
              color: color,
            }
          : undefined
      }
    >
      {active && color && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
