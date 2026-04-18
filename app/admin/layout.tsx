import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export const metadata = { title: "Admin — Timeline do Petróleo" };

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

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
