import { parseEvents } from "@/lib/parseEvents";
import { TimelineClientWrapper } from "@/components/Timeline/TimelineClientWrapper";
import { SerializedOilEvent } from "@/types";

export default function HomePage() {
  const events = parseEvents();

  const serialized: SerializedOilEvent[] = events.map((e) => ({
    ...e,
    start_date: e.start_date.toISOString(),
    end_date: e.end_date ? e.end_date.toISOString() : null,
  }));

  return (
    <main className="flex flex-col h-[100dvh] overflow-hidden bg-[#f5f3ee]">
      {/* Header */}
      <header className="shrink-0 px-4 md:px-6 py-2.5 border-b border-black/[0.07] flex items-center gap-3 bg-white shadow-sm">
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight leading-none">
            Timeline do Petróleo
          </h1>
          <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide uppercase">
            Geopolítica energética · 1950–2024
          </p>
        </div>
        <div className="ml-auto hidden lg:block">
          <span className="text-[10px] text-gray-300 font-mono">
            Ctrl+Scroll ou botões para zoom
          </span>
        </div>
      </header>

      <TimelineClientWrapper serializedEvents={serialized} />
    </main>
  );
}
