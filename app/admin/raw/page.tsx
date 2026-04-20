import { readRawEvents } from "@/lib/adminEvents";
import { RawEditor } from "./RawEditor";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RawPage() {
  const text = readRawEvents();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/admin" className="hover:text-gray-700">Eventos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Editor de Texto</span>
      </div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Editor de Texto Bruto</h1>
          <p className="text-sm text-gray-400 mt-1">
            Edite o arquivo <code className="bg-gray-100 px-1 rounded text-xs">data/events.json</code> diretamente.
            Salvar sobrescreve o arquivo inteiro. O conteúdo deve ser JSON válido.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4">
        ⚠️ Alterações neste editor sobrescrevem o arquivo completo. Use com cuidado.
      </div>
      <RawEditor initialText={text} />
    </div>
  );
}
