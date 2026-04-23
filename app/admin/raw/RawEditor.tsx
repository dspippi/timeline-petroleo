"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/basePath";

export function RawEditor({ initialText }: { initialText: string }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const dirty = text !== initialText;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/admin/raw"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setMessage({ type: "ok", text: "Arquivo salvo com sucesso!" });
        router.refresh();
      } else {
        const { error } = await res.json();
        setMessage({ type: "error", text: error ?? "Erro ao salvar" });
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSaving(false);
    }
  }, [text, router]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 min-h-[500px] border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        spellCheck={false}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {!dirty && <span className="text-xs text-gray-300">Sem alterações</span>}
        {dirty && <span className="text-xs text-amber-600 font-medium">● Alterações não salvas</span>}
        {message && (
          <span
            className={`text-xs font-medium ${message.type === "ok" ? "text-green-600" : "text-red-500"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
