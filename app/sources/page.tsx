import Link from "next/link";
import { listSources, Source } from "@/lib/sources";

function SourceIcon({ type }: { type: string }) {
  if (type === "book") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    );
  }
  if (type === "website") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>
    );
  }
  if (type === "dataset") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5V19A9 3 0 0 0 21 19V5" />
        <path d="M3 12A9 3 0 0 0 21 12" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}


export default function SourcesPage() {
  const sources = listSources();

  return (
    <main className="flex flex-col min-h-[100dvh] bg-app">
      {/* Header */}
      <header className="shrink-0 px-4 md:px-6 py-2.5 border-b border-line flex items-center justify-between gap-3 bg-surface dark:shadow-brand-glow shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-base md:text-lg font-bold text-content-primary tracking-tight leading-none dark:drop-shadow-text-glow">
            Fontes & Referências
          </h1>
          <p className="text-[10px] text-content-tertiary mt-0.5 tracking-wide uppercase">
            Timeline do Petróleo
          </p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-[#f2f7f4] dark:bg-[#151c24] dark:hover:bg-[#1d2a36] rounded-md transition-colors border border-line-subtle"
        >
          ← Voltar ao Início
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none text-content-tertiary">
            <p>
              Esta página lista as principais referências, livros e bases de dados utilizadas
              para construir a cronologia e os dados da Timeline do Petróleo. Outras referências estão disponíveis ao acessar cada evento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="p-5 bg-surface rounded-xl border border-line shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-alt text-gray-600 dark:text-[#b0bdcc] uppercase tracking-wider">
                    {source.type}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-[#6a7a8c]">
                    {source.year}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 hidden sm:block">
                    {source.imageUrl ? (
                      <img
                        src={source.imageUrl}
                        alt={source.title}
                        className="w-20 h-28 object-cover rounded-md border border-line-strong bg-surface"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-28 flex items-center justify-center rounded-md border border-line-subtle bg-surface-alt">
                        <SourceIcon type={source.type} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-content-primary mb-1">
                      {source.title}
                    </h3>
                    <p className="text-sm text-content-tertiary mb-3 font-medium">
                      {source.author}
                    </p>
                    <p className="text-sm text-content-tertiary leading-relaxed mb-4">
                      {source.description}
                    </p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-[#b7ff00] dark:hover:text-[#caff33] transition-colors"
                      >
                        Acessar Fonte ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
