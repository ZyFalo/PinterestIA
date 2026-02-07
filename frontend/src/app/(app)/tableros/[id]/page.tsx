"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RefreshCw,
  TrendingUp,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import type { Board, Outfit } from "@/lib/types";
import OutfitCard from "@/components/cards/OutfitCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TableroDetallePage() {
  const params = useParams();
  const boardId = params.id as string;
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
        setOutfitsList(
          [...o].sort(
            (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
          )
        );
      })
      .catch((e) => setError(e.detail || "Error al cargar el tablero"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [boardId]);

  if (loading) return <LoadingSpinner />;
  if (error || !board)
    return (
      <ErrorMessage
        message={error || "Tablero no encontrado"}
        onRetry={fetchData}
      />
    );

  const formattedDate = board.analyzedAt
    ? new Date(board.analyzedAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex h-full p-8 px-10 gap-8">
      {/* Left Sidebar */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <Link
            href={ROUTES.inicio}
            className="text-text-tertiary hover:text-accent-red transition-colors"
          >
            Tableros
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-text-primary font-medium truncate">
            {board.name}
          </span>
        </div>

        {/* Board Cover */}
        <div className="rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {board.imageUrl ? (
            <div className="relative h-[180px]">
              <img
                src={board.imageUrl}
                alt={board.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className="font-playfair text-[22px] font-bold text-white leading-tight">
                  {board.name}
                </h1>
              </div>
              <a
                href={board.pinterestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-accent-red to-accent-red-dark p-5 h-[120px] flex items-end relative">
              <h1 className="font-playfair text-[22px] font-bold text-white leading-tight">
                {board.name}
              </h1>
              <a
                href={board.pinterestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-secondary">Outfits</span>
            <span className="text-[14px] font-semibold text-text-primary">
              {outfitsList.length}
            </span>
          </div>
          {formattedDate && (
            <>
              <div className="h-px bg-border-light" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-secondary">
                  Analizado
                </span>
                <span className="text-[14px] font-medium text-text-secondary">
                  {formattedDate}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Ver Tendencias */}
        <Link
          href={ROUTES.tendencias(board.id)}
          className="w-full flex items-center justify-center gap-2 bg-accent-red-light text-accent-red text-[14px] font-medium py-3 rounded-xl hover:bg-accent-red hover:text-white transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Ver Tendencias
        </Link>

        {/* Reanalizar */}
        {(board.status === "completed" || board.status === "failed") && (
          <Link
            href={ROUTES.progreso(board.id)}
            className="w-full flex items-center justify-center gap-2 border border-border-default text-text-secondary text-[14px] py-3 rounded-xl hover:border-accent-red hover:text-accent-red transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reanalizar tablero
          </Link>
        )}
      </div>

      {/* Right - Outfit Grid */}
      <div className="flex-1">
        {outfitsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-[14px] text-text-secondary">
              No hay outfits en este tablero
            </p>
          </div>
        ) : (
          <div className="columns-[290px] gap-4">
            {outfitsList.map((outfit) => (
              <div key={outfit.id} className="break-inside-avoid mb-4">
                <OutfitCard outfit={outfit} boardId={boardId} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
