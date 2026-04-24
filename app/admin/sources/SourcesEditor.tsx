"use client";

import { useState } from "react";
import { Source } from "@/lib/sources";
import { withBasePath } from "@/lib/basePath";

const INPUT = "border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full";

function SourceFormFields({ 
  source, 
  onChange 
}: { 
  source: Source; 
  onChange: (field: keyof Source, value: string | number) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-1 md:col-span-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
        <input type="text" value={source.title} onChange={(e) => onChange("title", e.target.value)} className={INPUT} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Autor / Organização</label>
        <input type="text" value={source.author} onChange={(e) => onChange("author", e.target.value)} className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
          <input type="number" value={source.year} onChange={(e) => onChange("year", parseInt(e.target.value) || new Date().getFullYear())} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select value={source.type} onChange={(e) => onChange("type", e.target.value)} className={INPUT}>
            <option value="book">Livro</option>
            <option value="website">Website</option>
            <option value="dataset">Dataset</option>
            <option value="article">Artigo</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">URL (opcional)</label>
        <input type="text" value={source.url || ""} onChange={(e) => onChange("url", e.target.value)} className={INPUT} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">URL da Imagem (opcional)</label>
        <input type="text" value={source.imageUrl || ""} onChange={(e) => onChange("imageUrl", e.target.value)} className={INPUT} placeholder="https://..." />
      </div>
      <div className="col-span-1 md:col-span-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
        <textarea value={source.description} onChange={(e) => onChange("description", e.target.value)} className={INPUT} rows={3} />
      </div>
    </div>
  );
}

export function SourcesEditor({ initial }: { initial: Source[] }) {
  const [sources, setSources] = useState<Source[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Source | null>(null);

  const [newSource, setNewSource] = useState<Source>({
    id: "", title: "", author: "", year: new Date().getFullYear(), type: "website", url: "", imageUrl: "", description: ""
  });

  function handleSaveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) { setError("Título é obrigatório."); return; }
    const nextSources = sources.map((s) => (s.id === draft.id ? draft : s));
    setSources(nextSources);
    handleSaveToServer(nextSources);
    setEditingId(null);
    setDraft(null);
    setError("");
  }

  function handleAddSource() {
    if (!newSource.title.trim()) { setError("Título é obrigatório."); return; }
    const id = Date.now().toString(); // simple ID generator for sources
    const nextSources = [...sources, { ...newSource, id }];
    setSources(nextSources);
    handleSaveToServer(nextSources);
    setNewSource({ id: "", title: "", author: "", year: new Date().getFullYear(), type: "website", url: "", imageUrl: "", description: "" });
    setError("");
  }

  function deleteSource(id: string) {
    if (!confirm("Remover esta fonte?")) return;
    const nextSources = sources.filter((s) => s.id !== id);
    setSources(nextSources);
    handleSaveToServer(nextSources);
  }

  async function handleSaveToServer(payload: Source[]) {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(withBasePath("/api/admin/sources"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
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

  return (
    <div className="space-y-6">
      {/* List of existing sources */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <h2 className="font-semibold text-gray-800 text-sm">Fontes Existentes</h2>
        </div>
        <ul className="divide-y divide-black/[0.04]">
          {sources.map((source) => (
            <li key={source.id} className="p-5">
              {editingId === source.id && draft ? (
                <div className="space-y-4 bg-gray-50 -m-5 p-5 border-y border-amber-200">
                  <h3 className="font-semibold text-gray-800 text-sm">Editar Fonte</h3>
                  <SourceFormFields 
                    source={draft} 
                    onChange={(k, v) => setDraft({ ...draft, [k]: v })} 
                  />
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleSaveDraft} className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                      Confirmar
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{source.title} <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-2">{source.type}</span></h3>
                    <p className="text-sm text-gray-600 mt-1">{source.author} ({source.year})</p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    <button onClick={() => { setEditingId(source.id); setDraft(source); }} className="text-xs font-medium text-amber-600 hover:text-amber-800">
                      Editar
                    </button>
                    <button onClick={() => deleteSource(source.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {sources.length === 0 && (
            <li className="p-5 text-sm text-gray-500 text-center">Nenhuma fonte cadastrada.</li>
          )}
        </ul>
      </div>

      {/* Add new source */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <h2 className="font-semibold text-gray-800 text-sm">Nova Fonte</h2>
        </div>
        <div className="p-5 space-y-4">
          <SourceFormFields 
            source={newSource} 
            onChange={(k, v) => setNewSource({ ...newSource, [k]: v })} 
          />
          <button onClick={handleAddSource} className="text-sm bg-gray-800 hover:bg-gray-900 text-white font-semibold px-4 py-2 rounded-lg transition-colors mt-2">
            + Adicionar à Lista
          </button>
        </div>
      </div>

      {/* Errors / Feedback */}
      {error && <p className="text-xs text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</p>}
      {success && <p className="text-xs text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">✓ Fontes salvas com sucesso no arquivo sources.json!</p>}
      {saving && <p className="text-xs text-amber-600 font-medium">Salvando alterações...</p>}
    </div>
  );
}
