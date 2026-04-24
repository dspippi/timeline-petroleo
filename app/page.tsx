import { parseEvents } from "@/lib/parseEvents";
import { TimelineClientWrapper } from "@/components/Timeline/TimelineClientWrapper";
import { SerializedOilEvent } from "@/types";
import Link from "next/link";

export default function HomePage() {
  const events = parseEvents();

  const serialized: SerializedOilEvent[] = events.map((e) => ({
    ...e,
    start_date: e.start_date.toISOString(),
    end_date: e.end_date ? e.end_date.toISOString() : null,
  }));

  return (
    <main className="flex flex-col h-[100dvh] overflow-hidden bg-[#f5f3ee] dark:bg-[#050a10]">
      {/* Header */}
      <header className="shrink-0 px-4 md:px-6 py-2.5 border-b border-black/[0.07] dark:border-[#1d2a36] flex items-center gap-3 bg-white dark:bg-[#050a10] dark:shadow-[0_1px_0_rgba(183,255,0,0.08)] shadow-sm">
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-[#f2f7f4] tracking-tight leading-none dark:drop-shadow-[0_0_10px_rgba(242,247,244,0.12)]">
            Timeline do Petróleo
          </h1>
          <p className="text-[10px] text-gray-400 dark:text-[#8896a8] mt-0.5 tracking-wide uppercase">
            Geopolítica energética
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Link 
            href="/sources" 
            className="text-xs font-medium text-gray-600 dark:text-[#8896a8] hover:text-gray-900 dark:hover:text-[#f2f7f4] transition-colors bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-md"
          >
            Fontes
          </Link>
          <div className="hidden lg:block">
            <span className="text-[10px] text-gray-300 dark:text-[#8896a8] font-mono">
              Charcoal Lime
            </span>
          </div>
        </div>
      </header>

      <TimelineClientWrapper serializedEvents={serialized} />
    </main>
  );
}
