"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EventType } from "@/types";
import { AdminEventInput } from "@/lib/adminEvents";
import { useCategories } from "@/context/CategoriesContext";

const REGIONS = ["Middle East", "South America", "North America", "Europe", "Africa", "Asia", "Other"];

interface Props {
  initial?: AdminEventInput;
  mode: "create" | "edit";
  existingCountries: string[];
  existingCompanies: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const EMPTY: AdminEventInput = {
  id: "",
  title: "",
  start_date: "",
  end_date: "",
  country: "",
  region: "Middle East",
  type: "policy",
  company: "",
  wikipedia: "",
  description: "",
};

export function EventForm({ initial, mode, existingCountries, existingCompanies }: Props) {
  const router = useRouter();
  const { categories } = useCategories();
  const [form, setForm] = useState<AdminEventInput>(initial ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoId, setAutoId] = useState(mode === "create");

  // Auto-generate id from title when creating
  useEffect(() => {
    if (autoId && form.title) {
      const year = form.start_date ? form.start_date.slice(0, 4) : "";
      setForm((f) => ({ ...f, id: slugify(form.title) + (year ? "-" + year : "") }));
    }
  }, [form.title, form.start_date, autoId]);

  function set<K extends keyof AdminEventInput>(key: K, value: AdminEventInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload: AdminEventInput = {
      ...form,
      end_date: form.end_date || undefined,
      company: form.company || undefined,
      wikipedia: form.wikipedia || undefined,
    };

    try {
      const res = mode === "create"
        ? await fetch("/api/admin/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/events/${encodeURIComponent(initial!.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao salvar");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">

      {/* Title */}
      <Field label="Título *">
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={INPUT}
          placeholder="Ex: Embargo do Petróleo da OPEP"
        />
      </Field>

      {/* ID */}
      <Field label="ID único *" hint="Gerado automaticamente — pode editar">
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={form.id}
            onChange={(e) => { setAutoId(false); set("id", e.target.value); }}
            className={INPUT + " font-mono text-xs"}
            placeholder="ex: opec-embargo-1973"
          />
          {mode === "create" && (
            <button
              type="button"
              onClick={() => { setAutoId(true); }}
              className="text-xs text-amber-600 hover:text-amber-800 whitespace-nowrap"
              title="Regenerar a partir do título"
            >
              ↺ Auto
            </button>
          )}
        </div>
      </Field>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de início *">
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Data de fim (opcional)">
          <input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => set("end_date", e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      {/* Type */}
      <Field label="Tipo *">
        <select
          required
          value={form.type}
          onChange={(e) => set("type", e.target.value as EventType)}
          className={INPUT + " bg-white"}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
      </Field>

      {/* Country + Region */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="País *">
          <input
            type="text"
            required
            list="countries-list"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            className={INPUT}
            placeholder="Ex: Saudi Arabia"
          />
          <datalist id="countries-list">
            {existingCountries.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Região *">
          <select
            required
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            className={INPUT + " bg-white"}
          >
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      {/* Company */}
      <Field label="Empresa (opcional)">
        <input
          type="text"
          list="companies-list"
          value={form.company ?? ""}
          onChange={(e) => set("company", e.target.value)}
          className={INPUT}
          placeholder="Ex: Petrobras"
        />
        <datalist id="companies-list">
          {existingCompanies.map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>

      {/* Wikipedia */}
      <Field label="Wikipedia (opcional)">
        <input
          type="url"
          value={form.wikipedia ?? ""}
          onChange={(e) => set("wikipedia", e.target.value)}
          className={INPUT}
          placeholder="https://en.wikipedia.org/wiki/…"
        />
      </Field>

      {/* Description */}
      <Field label="Descrição">
        <textarea
          rows={6}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className={INPUT + " resize-y font-normal leading-relaxed"}
          placeholder="Descreva o evento em português…"
        />
      </Field>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Salvando…" : mode === "create" ? "Criar Evento" : "Salvar Alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
        {hint && <span className="ml-2 text-gray-300 normal-case font-normal tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
