"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { boards as boardsApi } from "@/lib/api";
import { GARMENT_COLORS } from "@/lib/constants";
import type { Board, GarmentRank, Outfit } from "@/lib/types";
import OutfitCard from "@/components/cards/OutfitCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TendenciasPage() {
  const params = useParams();
  const boardId = params.id as string;
  const [board, setBoard] = useState<Board | null>(null);
  const [ranks, setRanks] = useState<GarmentRank[]>([]);
  const [outfitsList, setOutfitsList] = useState<Outfit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    setError("");
    Promise.all([
      boardsApi.get(boardId),
      boardsApi.trends(boardId),
      boardsApi.outfits(boardId),
    ])
      .then(([b, r, o]) => {
        setBoard(b);
        setRanks(r);
        setOutfitsList(o);
      })
      .catch((e) => setError(e.detail || "Error al cargar tendencias"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [boardId]);

  if (loading) return <LoadingSpinner />;
  if (error || !board) return <ErrorMessage message={error || "Error"} onRetry={fetchData} />;
  if (ranks.length === 0)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[15px] text-text-secondary">No hay tendencias disponibles.</p>
      </div>
    );

  const maxCount = ranks[0]?.count || 1;
  const selectedType = ranks[selectedIndex];
  const colorHex = selectedType.color
    ? GARMENT_COLORS[selectedType.color] || "#9CA3AF"
    : "#9CA3AF";

  return (
    <div className="flex h-full p-8 px-16 gap-8">
      {/* Left - Ranking Sidebar */}
      <div className="w-[400px] flex-shrink-0 flex flex-col gap-5">
        {/* Board Context Card */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex items-center gap-3">
          {board.imageUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={board.imageUrl}
                alt={board.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-text-primary">
              {board.name}
            </span>
            <span className="text-[12px] text-text-secondary">
              {outfitsList.length} outfits analizados
            </span>
          </div>
        </div>

        {/* Rank Header */}
        <div className="flex flex-col gap-1">
          <h2 className="font-playfair text-[22px] font-bold text-text-primary">
            Prendas más repetidas
          </h2>
          <p className="text-[13px] text-text-secondary">
            Ordenadas por frecuencia en tus outfits
          </p>
        </div>

        {/* Rank List */}
        <div className="flex flex-col gap-2">
          {ranks.map((rank, index) => {
            const isSelected = selectedIndex === index;
            const pct = Math.round((rank.count / maxCount) * 100);
            const rc = rank.color
              ? GARMENT_COLORS[rank.color] || "#9CA3AF"
              : "#9CA3AF";
            return (
              <button
                key={`${rank.type}-${rank.color}`}
                onClick={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2.5 p-3 rounded-lg transition-all text-left ${
                  isSelected
                    ? "bg-accent-red-light border-[3px] border-accent-red"
                    : "bg-white hover:bg-bg-muted"
                }`}
              >
                <span className="text-[20px] font-bold text-accent-red w-6 text-center">
                  {index + 1}
                </span>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-border-default"
                  style={{ backgroundColor: rc }}
                />
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="text-[14px] font-semibold text-text-primary">
                    {rank.type}
                    {rank.color ? ` · ${rank.color}` : ""}
                  </span>
                  <span className="text-[12px] text-text-secondary">
                    En {rank.count} de {outfitsList.length} outfits
                  </span>
                </div>
                <div className="w-[60px] h-1.5 bg-bg-muted rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className="h-full bg-accent-red rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-accent-red w-4">
                  {rank.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right - Filtered Outfits */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Filter Header */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-text-primary">Outfits con</span>
            <span className="text-[13px] font-medium text-accent-red bg-accent-red-light px-3 py-1 rounded-full">
              {selectedType.type}
              {selectedType.color ? ` · ${selectedType.color}` : ""}
            </span>
            {selectedType.color && (
              <div
                className="w-3 h-3 rounded-full border border-border-default"
                style={{ backgroundColor: colorHex }}
              />
            )}
          </div>
          <span className="text-[13px] font-medium text-accent-red">
            {selectedType.count} resultados
          </span>
        </div>

        {/* Outfit Grid */}
        <div className="flex flex-wrap gap-4">
          {outfitsList
            .slice(0, Math.min(selectedType.count, 6))
            .map((outfit) => (
              <div key={outfit.id} className="w-[290px]">
                <OutfitCard outfit={outfit} boardId={boardId} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
