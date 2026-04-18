"use client";

import { AnimatePresence, motion } from "framer-motion";
import { OilEvent } from "@/types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/colorMap";
import { formatEventDate, isBrasil } from "@/lib/utils";

interface Props {
  event: OilEvent | null;
  onClose: () => void;
}

export function EventCard({ event, onClose }: Props) {
  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            key="card"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] max-w-[92vw] rounded-2xl border border-black/10 bg-white shadow-2xl"
          >
            {/* Top accent */}
            <div
              className="h-1 w-full rounded-t-2xl"
              style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
            />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: EVENT_TYPE_COLORS[event.type] + "18",
                      color: EVENT_TYPE_COLORS[event.type],
                      border: `1px solid ${EVENT_TYPE_COLORS[event.type]}44`,
                    }}
                  >
                    {EVENT_TYPE_LABELS[event.type]}
                  </span>
                  <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">
                    {event.region}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* Title */}
              <h2
                className={`text-xl font-bold leading-tight mb-2 ${
                  isBrasil(event.country) ? "text-amber-700" : "text-gray-900"
                }`}
              >
                {event.title}
              </h2>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-sm text-gray-400">
                <span>{formatEventDate(event.start_date, event.end_date)}</span>
                <span className="w-px h-3 bg-gray-200" />
                <span className={isBrasil(event.country) ? "text-amber-600 font-medium" : ""}>
                  {event.country}
                </span>
                {event.company && (
                  <>
                    <span className="w-px h-3 bg-gray-200" />
                    <span className="text-gray-600">{event.company}</span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                {event.description}
              </p>

              {/* Wikipedia link */}
              {event.wikipedia && (
                <a
                  href={event.wikipedia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors group"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Ver no Wikipedia
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
