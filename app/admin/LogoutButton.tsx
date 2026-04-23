"use client";

import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/basePath";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch(withBasePath("/api/admin/logout"), { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
    >
      Sair
    </button>
  );
}
