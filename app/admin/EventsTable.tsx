"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OilEvent, EventType, EVENT_TYPES } from "@/types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/colorMap";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function EventsTable({ events }: { events: OilEvent[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "">("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.country.toLowerCase().includes(q);
    const matchType = !typeFilter || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!confirm(`Excluir "${title}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const { error } = await res.json();
        alert("Erro: " + error);
      }
    } finally {
      setDeleting(null);
    }
  }, [router]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-black/[0.06]">
        <input
          type="text"
          placeholder="Buscar por título ou país…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EventType | "")}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        >
          <option value="">Todos os tipos</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <Link
          href="/admin/events/new"
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          + Novo Evento
        </Link>
        <Link
          href="/admin/raw"
          className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Editor de Texto
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Título</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">País</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Data</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empresa</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Nenhum evento encontrado
                </td>
              </tr>
            )}
            {filtered.map((event) => {
              const color = EVENT_TYPE_COLORS[event.type];
              return (
                <tr key={event.id} className="border-b border-black/[0.04] hover:bg-gray-50/80 group">
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[280px] truncate">
                    {event.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: color + "22", color }}
                    >
                      {EVENT_TYPE_LABELS[event.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.country}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {format(event.start_date, "dd/MM/yyyy", { locale: ptBR })}
                    {event.end_date && (
                      <span className="text-gray-300"> → {format(event.end_date, "dd/MM/yyyy", { locale: ptBR })}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{event.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/events/${encodeURIComponent(event.id)}`}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(event.id, event.title)}
                        disabled={deleting === event.id}
                        className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-50"
                      >
                        {deleting === event.id ? "…" : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="px-4 py-3 text-xs text-gray-400 border-t border-black/[0.04]">
          {filtered.length} de {events.length} eventos
        </div>
      )}
    </div>
  );
}
