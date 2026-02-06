"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { boards as boardsApi } from "@/lib/api";
import type { Board } from "@/lib/types";
import BoardCard from "@/components/cards/BoardCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function InicioPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [boardsList, setBoardsList] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBoards = () => {
    setLoading(true);
    setError("");
    boardsApi
      .list()
      .then(setBoardsList)
      .catch((e) => setError(e.detail || "Error al cargar tableros"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchBoards} />;

  const filteredBoards = boardsList.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-10 px-[120px]">
      {/* Greeting Row */}
      <div className="flex items-end justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-playfair text-[32px] font-bold text-text-primary">
            Hola, {user?.name.split(" ")[0]}
          </h1>
          <p className="text-[16px] text-text-secondary">
            ¿Qué tablero analizamos hoy?
          </p>
        </div>
        <Link
          href={ROUTES.importar}
          className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-dark text-white font-semibold text-[14px] px-6 py-3 rounded-lg transition-colors"
        >
          <Plus className="w-[18px] h-[18px]" />
          Importar tablero
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="text"
          placeholder="Buscar tableros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-5 py-3.5 rounded-xl border border-border-default bg-white text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
        />
      </div>

      {/* Boards Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-playfair text-[22px] font-bold text-text-primary">
          Mis tableros
        </h2>
        <span className="text-[14px] text-text-secondary">
          {filteredBoards.length} tableros
        </span>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredBoards.map((board) => (
          <BoardCard key={board.id} board={board} onDelete={(id) => setBoardsList((prev) => prev.filter((b) => b.id !== id))} />
        ))}
      </div>

      {/* FAB */}
      <Link
        href={ROUTES.importar}
        className="fixed bottom-8 left-[244px] w-14 h-14 bg-accent-red hover:bg-accent-red-dark text-white rounded-full shadow-[0_8px_24px_rgba(227,30,36,0.16)] flex items-center justify-center transition-colors"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
