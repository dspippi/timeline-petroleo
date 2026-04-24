import { listSources } from "@/lib/sources";
import { SourcesEditor } from "./SourcesEditor";

export const metadata = { title: "Fontes — Admin" };

export default function SourcesAdminPage() {
  const sources = listSources();

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fontes & Referências</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gerencie as referências bibliográficas, sites e datasets utilizados no projeto.
        </p>
      </div>
      <SourcesEditor initial={sources} />
    </div>
  );
}
