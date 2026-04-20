import { listCategories } from "@/lib/categories";
import { CategoriesEditor } from "./CategoriesEditor";

export const metadata = { title: "Categorias — Admin" };

export default function CategoriesPage() {
  const categories = listCategories();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Categorias</h1>
        <p className="text-sm text-gray-400 mt-1">
          Edite nomes e cores das categorias existentes, ou crie novas.
          O ID de uma categoria não pode ser alterado após ser criado.
        </p>
      </div>
      <CategoriesEditor initial={categories} />
    </div>
  );
}
