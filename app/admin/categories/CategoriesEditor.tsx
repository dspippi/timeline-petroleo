"use client";

import { useState } from "react";
import { Category, CategoryShape } from "@/lib/categories";
import { useCategories } from "@/context/CategoriesContext";
import { withBasePath } from "@/lib/basePath";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6", "#6366f1",
  "#a855f7", "#ec4899", "#6b7280", "#0ea5e9",
];

const AVAILABLE_SHAPES: { value: CategoryShape; label: string; icon: string }[] = [
  { value: "diamond", label: "Losango", icon: "♦" },
  { value: "triangle", label: "Triângulo", icon: "▲" },
  { value: "circle", label: "Círculo", icon: "●" },
  { value: "square", label: "Quadrado", icon: "■" },
  { value: "star", label: "Estrela", icon: "✦" },
  { value: "hexagon", label: "Hexágono", icon: "⬢" },
];

export function CategoriesEditor({ initial }: { initial: Category[] }) {
  const { setCategories: setCtxCategories } = useCategories();
  const [cats, setCats] = useState<Category[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Draft for the category being edited
  const [draft, setDraft] = useState<Category>({ id: "", label: "", color: "#6b7280", shape: "diamond" });
  // New category draft
  const [newCat, setNewCat] = useState<Category>({ id: "", label: "", color: "#6b7280", shape: "diamond" });
  const [autoId, setAutoId] = useState(true);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setDraft({ ...cat });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    if (!draft.label.trim()) { setError("O nome não pode estar vazio."); return; }
    setCats((prev) => prev.map((c) => (c.id === editingId ? { ...draft } : c)));
    setEditingId(null);
    setError("");
  }

  function deleteCategory(id: string) {
    if (!confirm(`Remover a categoria "${id}"?\n\nEventos com esse tipo ainda mantêm o ID salvo, mas aparecerão sem cor/nome até que você reatribua o tipo.`)) return;
    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  function addCategory() {
    setError("");
    if (!newCat.label.trim()) { setError("Digite um nome para a nova categoria."); return; }
    const id = newCat.id.trim() || slugify(newCat.label);
    if (!id) { setError("ID inválido."); return; }
    if (cats.find((c) => c.id === id)) { setError(`Já existe uma categoria com o ID "${id}".`); return; }
    setCats((prev) => [...prev, { ...newCat, id }]);
    setNewCat({ id: "", label: "", color: "#6b7280", shape: "diamond" });
    setAutoId(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(withBasePath("/api/admin/categories"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cats),
      });
      if (res.ok) {
        setCtxCategories(cats);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao salvar.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  const INPUT = "border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Existing categories ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <h2 className="font-semibold text-gray-800 text-sm">Categorias existentes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Clique em "Editar" para alterar nome ou cor.</p>
        </div>

        <ul className="divide-y divide-black/[0.04]">
          {cats.map((cat) => (
            <li key={cat.id} className="px-5 py-3">
              {editingId === cat.id ? (
                /* ── Edit row ── */
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Color picker */}
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={draft.color}
                        onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        title="Escolher cor"
                      />
                    </div>
                    {/* Label */}
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                      className={INPUT + " flex-1"}
                      placeholder="Nome da categoria"
                      autoFocus
                    />
                  </div>

                  {/* Color presets */}
                  <div className="flex flex-wrap gap-1.5 pl-12">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, color: c }))}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: draft.color === c ? "#1f2937" : "transparent",
                        }}
                        title={c}
                      />
                    ))}
                  </div>

                  {/* Shape selector */}
                  <div className="pl-12 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium mr-2">Formato:</span>
                    {AVAILABLE_SHAPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, shape: s.value }))}
                        className={`w-7 h-7 flex items-center justify-center rounded transition-all text-sm ${
                          draft.shape === s.value || (!draft.shape && s.value === "diamond")
                            ? "bg-amber-100 text-amber-700 font-bold border border-amber-300"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                        }`}
                        title={s.label}
                      >
                        {s.icon}
                      </button>
                    ))}
                  </div>

                  {/* Preview badge */}
                  <div className="pl-12 flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: draft.color + "22", color: draft.color, border: `1px solid ${draft.color}44` }}
                    >
                      {draft.label || "Prévia"}
                    </span>
                    <button
                      onClick={saveEdit}
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Display row ── */
                <div className="flex items-center gap-3">
                  <div 
                    className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm border" 
                    style={{ backgroundColor: cat.color + "22", color: cat.color, borderColor: cat.color + "44" }}
                    title={AVAILABLE_SHAPES.find(s => s.value === (cat.shape || "diamond"))?.label}
                  >
                    {AVAILABLE_SHAPES.find(s => s.value === (cat.shape || "diamond"))?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{cat.label}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{cat.id}</span>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color + "22", color: cat.color }}
                  >
                    {cat.label}
                  </span>
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium shrink-0"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0"
                  >
                    Remover
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Add new category ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <h2 className="font-semibold text-gray-800 text-sm">Nova categoria</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat((n) => ({ ...n, color: e.target.value }))}
              className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
              title="Escolher cor"
            />
            <input
              type="text"
              value={newCat.label}
              onChange={(e) => {
                const label = e.target.value;
                setNewCat((n) => ({
                  ...n,
                  label,
                  id: autoId ? slugify(label) : n.id,
                }));
              }}
              className={INPUT + " flex-1"}
              placeholder="Nome da categoria  (ex: Geopolítica)"
            />
          </div>

          {/* Color presets */}
          <div className="flex flex-wrap gap-1.5 pl-12">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCat((n) => ({ ...n, color: c }))}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: newCat.color === c ? "#1f2937" : "transparent",
                }}
                title={c}
              />
            ))}
          </div>

          {/* Shape selector */}
          <div className="pl-12 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium mr-2">Formato:</span>
            {AVAILABLE_SHAPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setNewCat((n) => ({ ...n, shape: s.value }))}
                className={`w-7 h-7 flex items-center justify-center rounded transition-all text-sm ${
                  newCat.shape === s.value || (!newCat.shape && s.value === "diamond")
                    ? "bg-gray-800 text-white font-bold border border-gray-900"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                }`}
                title={s.label}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* ID field */}
          <div className="pl-12 flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">ID:</span>
            <input
              type="text"
              value={newCat.id}
              onChange={(e) => { setAutoId(false); setNewCat((n) => ({ ...n, id: e.target.value })); }}
              className={INPUT + " flex-1 font-mono text-xs"}
              placeholder="gerado-automaticamente"
            />
            <button
              type="button"
              onClick={() => { setAutoId(true); setNewCat((n) => ({ ...n, id: slugify(n.label) })); }}
              className="text-xs text-amber-600 hover:text-amber-800 shrink-0"
            >
              ↺ Auto
            </button>
          </div>

          {/* Preview + add button */}
          <div className="pl-12 flex items-center gap-3">
            {newCat.label && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: newCat.color + "22", color: newCat.color, border: `1px solid ${newCat.color}44` }}
              >
                {newCat.label}
              </span>
            )}
            <button
              onClick={addCategory}
              className="text-sm bg-gray-800 hover:bg-gray-900 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              + Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* ── Errors / feedback ──────────────────────────────────── */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
          ✓ Categorias salvas com sucesso!
        </p>
      )}

      {/* ── Save button ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar categorias"}
        </button>
        <p className="text-xs text-gray-400">
          As alterações ficam visíveis imediatamente no site após salvar e fazer git push.
        </p>
      </div>
    </div>
  );
}
