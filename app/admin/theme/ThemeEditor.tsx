"use client";

import { useState } from "react";
import { ThemeConfig } from "@/lib/theme";
import { withBasePath } from "@/lib/basePath";

const DEFAULT_THEME: ThemeConfig = {
  light: {
    "bg-app": "#f5f3ee",
    "bg-surface": "#ffffff",
    "bg-surface-alt": "#f3f4f6",
    "text-primary": "#111827",
    "text-secondary": "#4b5563",
    "text-tertiary": "#9ca3af",
    "text-muted": "#d1d5db",
    "border-subtle": "rgba(0, 0, 0, 0.05)",
    "border-default": "rgba(0, 0, 0, 0.07)",
    "border-strong": "rgba(0, 0, 0, 0.1)",
    "accent-main": "#f59e0b",
    "accent-hover": "#d97706",
    "accent-bg": "#fffbeb",
  },
  dark: {
    "bg-app": "#050a10",
    "bg-surface": "#071018",
    "bg-surface-alt": "#151c24",
    "text-primary": "#f2f7f4",
    "text-secondary": "#dce8e1",
    "text-tertiary": "#8896a8",
    "text-muted": "#526173",
    "border-subtle": "rgba(255, 255, 255, 0.03)",
    "border-default": "rgba(255, 255, 255, 0.06)",
    "border-strong": "rgba(255, 255, 255, 0.12)",
    "accent-main": "#b7ff00",
    "accent-hover": "#d8ff66",
    "accent-bg": "#0f1710",
  }
};

export function ThemeEditor({ initial }: { initial: ThemeConfig }) {
  const [config, setConfig] = useState<ThemeConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (mode: "light" | "dark", key: string, val: string) => {
    setConfig(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: val }
    }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_THEME);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError("");
    try {
      const res = await fetch(withBasePath("/api/admin/theme"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
      }
    } catch (e) {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const ColorInput = ({ mode, varKey, label, isRgba }: { mode: "light"|"dark", varKey: string, label: string, isRgba?: boolean }) => {
    const val = config[mode][varKey as keyof typeof config.light] || "";
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <div className="flex items-center gap-2">
          {!isRgba && (
            <input 
              type="color" 
              value={val} 
              onChange={e => handleChange(mode, varKey, e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0 shrink-0" 
            />
          )}
          <input 
            type="text" 
            value={val} 
            onChange={e => handleChange(mode, varKey, e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-xs font-mono w-full" 
          />
        </div>
      </div>
    );
  };

  const ModeSection = ({ mode, title }: { mode: "light"|"dark", title: string }) => (
    <div className={`p-5 rounded-2xl border ${mode === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'}`}>
      <h2 className={`font-bold mb-4 ${mode === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className={`text-xs uppercase tracking-wider font-semibold ${mode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>Fundos</h3>
          <ColorInput mode={mode} varKey="bg-app" label="Fundo da Aplicação" />
          <ColorInput mode={mode} varKey="bg-surface" label="Superfícies (Paineis)" />
          <ColorInput mode={mode} varKey="bg-surface-alt" label="Superfície Alt (Hover/Div)" />
        </div>
        
        <div className="space-y-4">
          <h3 className={`text-xs uppercase tracking-wider font-semibold ${mode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>Textos</h3>
          <ColorInput mode={mode} varKey="text-primary" label="Texto Principal" />
          <ColorInput mode={mode} varKey="text-secondary" label="Texto Secundário" />
          <ColorInput mode={mode} varKey="text-tertiary" label="Texto Terciário" />
          <ColorInput mode={mode} varKey="text-muted" label="Texto Mutado (Discreto)" />
        </div>
        
        <div className="space-y-4">
          <h3 className={`text-xs uppercase tracking-wider font-semibold ${mode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>Destaques & Linhas</h3>
          <ColorInput mode={mode} varKey="accent-main" label="Cor Principal (Accent)" />
          <ColorInput mode={mode} varKey="accent-hover" label="Cor Hover (Accent)" />
          <ColorInput mode={mode} varKey="accent-bg" label="Fundo Claro (Accent)" />
          <ColorInput mode={mode} varKey="border-default" label="Borda Padrão (RGBA)" isRgba />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModeSection mode="light" title="Light Mode" />
        <ModeSection mode="dark" title="Dark Mode" />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 hover:bg-black text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar Variáveis no CSS"}
        </button>
        <button
          onClick={handleReset}
          className="text-gray-500 hover:text-gray-800 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Restaurar Padrão
        </button>
        {success && <span className="text-xs text-emerald-600 font-medium">✓ Cores atualizadas com sucesso! Recarregue a página para ver o efeito.</span>}
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        <p className="text-xs text-gray-400 ml-auto hidden md:block">
          Ao salvar, o arquivo <code className="bg-gray-100 px-1 rounded">globals.css</code> é modificado.
        </p>
      </div>
    </div>
  );
}
