import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export const metadata = { title: "Admin — Timeline do Petróleo" };

const isVercel = process.env.VERCEL === "1";
const isLocal = process.env.NODE_ENV === "development";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-black/[0.07] px-4 py-3 flex items-center gap-4 shrink-0">
        <Link href="/admin" className="font-bold text-gray-800 text-sm hover:text-amber-600 transition-colors">
          🛢 Admin
        </Link>
        <span className="text-gray-300">|</span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
            Eventos
          </Link>
          <Link href="/admin/events/new" className="text-gray-500 hover:text-gray-900 transition-colors">
            + Novo
          </Link>
          <Link href="/admin/raw" className="text-gray-500 hover:text-gray-900 transition-colors">
            Editor de Texto
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            target="_blank"
          >
            Ver site ↗
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Local mode banner */}
      {isLocal && (
        <div className="shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-3">
          <span className="text-emerald-600 text-sm">●</span>
          <div className="text-xs text-emerald-800">
            <span className="font-semibold">Modo Local</span> — alterações são salvas diretamente em{" "}
            <code className="bg-emerald-100 px-1 rounded font-mono">data/events.md</code>.
            Após editar, faça <code className="bg-emerald-100 px-1 rounded font-mono">git commit</code> e envie para o GitHub.
          </div>
        </div>
      )}

      {/* Vercel read-only warning */}
      {isVercel && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-3">
          <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">Você está no ambiente de produção (Vercel).</span>{" "}
            O sistema de arquivos é somente leitura — qualquer alteração feita aqui{" "}
            <span className="font-semibold">não será salva</span> permanentemente.{" "}
            Para editar os eventos de forma definitiva, use o painel admin no seu computador local
            e depois envie as alterações para o GitHub.
          </div>
        </div>
      )}

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
