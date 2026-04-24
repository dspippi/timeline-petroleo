"use client";

import { createContext, useContext, useState } from "react";
import { Category } from "@/lib/categories";

interface CategoriesContextValue {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  getColor: (type: string) => string;
  getLabel: (type: string) => string;
  getShape: (type: string) => string;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({
  initialCategories,
  children,
}: {
  initialCategories: Category[];
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const getColor = (type: string) =>
    categories.find((c) => c.id === type)?.color ?? "#6b7280";

  const getLabel = (type: string) =>
    categories.find((c) => c.id === type)?.label ?? type;

  const getShape = (type: string) =>
    categories.find((c) => c.id === type)?.shape ?? "diamond";

  return (
    <CategoriesContext.Provider value={{ categories, setCategories, getColor, getLabel, getShape }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
}
