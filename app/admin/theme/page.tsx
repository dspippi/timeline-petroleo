import { getThemeConfig } from "@/lib/theme";
import { ThemeEditor } from "./ThemeEditor";

export const metadata = { title: "Cores & Tema — Admin" };

export default function ThemeAdminPage() {
  const theme = getThemeConfig();

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuração de Cores & Tema</h1>
        <p className="text-sm text-gray-400 mt-1">
          Altere as cores principais da aplicação. O salvamento modifica diretamente as variáveis CSS.
        </p>
      </div>
      <ThemeEditor initial={theme} />
    </div>
  );
}
