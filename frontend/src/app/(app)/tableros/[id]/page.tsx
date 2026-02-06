"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import type { Board, Outfit } from "@/lib/types";
import OutfitCard from "@/components/cards/OutfitCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

const categories = ["Todos", "Tops", "Bottoms", "Accesorios"];

export default function TableroDetallePage() {
  const params = useParams();
  const boardId = params.id as string;
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [board, setBoard] = useState<Board | null>(null);
  const [outfitsList, setOutfitsList] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    setError("");
    Promise.all([boardsApi.get(boardId), boardsApi.outfits(boardId)])
      .then(([b, o]) => {
        setBoard(b);
        setOutfitsList(o);
      })
      .catch((e) => setError(e.detail || "Error al cargar el tablero"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [boardId]);

  if (loading) return <LoadingSpinner />;
  if (error || !board) return <ErrorMessage message={error || "Tablero no encontrado"} onRetry={fetchData} />;

  return (
    <div className="flex h-full">
      {/* Body */}
      <div className="flex-1 p-8 px-16 flex gap-8">
        {/* Left Sidebar Info */}
        <div className="w-[320px] flex-shrink-0 flex flex-col gap-6">
          <h1 className="font-playfair text-[28px] font-bold text-text-primary">
            {board.name}
          </h1>

          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 flex justify-around">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[28px] font-bold text-accent-red">
                {outfitsList.length}
              </span>
              <span className="text-[13px] text-text-secondary">Outfits</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[28px] font-bold text-accent-red">
                {board.pinsCount}
              </span>
              <span className="text-[13px] text-text-secondary">Pins</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[28px] font-bold text-accent-red">
                {board.analyzedAt
                  ? new Date(board.analyzedAt).toLocaleDateString("es-ES", {
                      month: "short",
                      year: "2-digit",
                    })
                  : "—"}
              </span>
              <span className="text-[13px] text-text-secondary">Fecha</span>
            </div>
          </div>

          {/* Category Tabs - Vertical list */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            {categories.map((cat, i) => (
              <div key={cat}>
                {i > 0 && <div className="h-px bg-bg-muted" />}
                <button
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-5 py-3.5 text-[14px] transition-colors ${
                    activeCategory === cat
                      ? "bg-white border-l-[3px] border-accent-red text-accent-red font-medium"
                      : "text-text-secondary hover:bg-bg-muted"
                  }`}
                >
                  {cat}
                </button>
              </div>
            ))}
          </div>

          {/* Tendencias Button */}
          <Link
            href={ROUTES.tendencias(board.id)}
            className="w-full flex items-center justify-center gap-2 bg-accent-red-light text-accent-red text-[14px] py-3 rounded-xl hover:bg-accent-red hover:text-white transition-colors"
          >
            Ver Tendencias
          </Link>
        </div>

        {/* Right - Outfit Grid */}
        <div className="flex-1 flex flex-wrap gap-4 content-start">
          {outfitsList.map((outfit) => (
            <div key={outfit.id} className="w-[300px]">
              <OutfitCard outfit={outfit} boardId={boardId} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
