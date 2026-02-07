"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RefreshCw,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import type { Board, Outfit, OutfitFacets } from "@/lib/types";
import OutfitCard from "@/components/cards/OutfitCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TableroDetallePage() {
  const params = useParams();
  const boardId = params.id as string;
  const [board, setBoard] = useState<Board | null>(null);
  const [outfitsList, setOutfitsList] = useState<Outfit[]>([]);
  const [facets, setFacets] = useState<OutfitFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [stylesExpanded, setStylesExpanded] = useState(false);
  const [filtering, setFiltering] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError("");
    Promise.all([
      boardsApi.get(boardId),
      boardsApi.outfits(boardId),
      boardsApi.outfitFacets(boardId),
    ])
      .then(([b, o, f]) => {
        setBoard(b);
        setOutfitsList(
          [...o].sort(
            (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
          )
        );
        setFacets(f);
      })
      .catch((e) => setError(e.detail || "Error al cargar el tablero"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [boardId]);

  // Apply filters when selections change
  const applyFilters = useCallback(() => {
    if (!board) return;
    const hasFilters =
      selectedSeasons.length > 0 || selectedStyles.length > 0;
    if (!hasFilters) {
      // Reload unfiltered
      setFiltering(true);
      boardsApi
        .outfits(boardId)
        .then((o) =>
          setOutfitsList(
            [...o].sort(
              (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
            )
          )
        )
        .finally(() => setFiltering(false));
      return;
    }
    setFiltering(true);
    boardsApi
      .outfits(boardId, {
        outfitSeason: selectedSeasons.length > 0 ? selectedSeasons : undefined,
        outfitStyle: selectedStyles.length > 0 ? selectedStyles : undefined,
      })
      .then((o) =>
        setOutfitsList(
          [...o].sort(
            (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
          )
        )
      )
      .finally(() => setFiltering(false));
  }, [boardId, board, selectedSeasons, selectedStyles]);

  useEffect(() => {
    if (!loading && board) {
      applyFilters();
    }
  }, [selectedSeasons, selectedStyles]);

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const removeStyle = (style: string) => {
    setSelectedStyles((prev) => prev.filter((s) => s !== style));
  };

  const clearFilters = () => {
    setSelectedSeasons([]);
    setSelectedStyles([]);
  };

  const hasFilters = selectedSeasons.length > 0 || selectedStyles.length > 0;

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

  const totalStylesCount =
    facets?.styles.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const selectedStyleFacets =
    facets?.styles.filter((s) => selectedStyles.includes(s.name)) ?? [];

  return (
    <div className="flex h-full p-8 px-10 gap-8">
      {/* Left Sidebar */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-5 overflow-y-auto scrollbar-hidden">
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

        {/* Filters Section */}
        {facets &&
          (facets.seasons.length > 0 || facets.styles.length > 0) && (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-4">
              {/* Filter Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
                  <span className="text-[14px] font-semibold text-text-primary">
                    Filtros
                  </span>
                </div>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[12px] text-accent-red hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Season Filters */}
              {facets.seasons.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-text-primary">
                    Temporada
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {facets.seasons.map((season) => {
                      const isSelected = selectedSeasons.includes(season.name);
                      return (
                        <button
                          key={season.name}
                          onClick={() => toggleSeason(season.name)}
                          className={`w-full flex items-center gap-2 py-2.5 px-2.5 rounded-md transition-all text-left ${
                            isSelected
                              ? "bg-accent-red-light"
                              : "hover:bg-bg-muted"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-accent-red border-accent-red"
                                : "border-border-default"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
                          <span
                            className={`flex-1 text-[13px] truncate ${
                              isSelected
                                ? "font-medium text-accent-red"
                                : "text-text-primary"
                            }`}
                          >
                            {season.name}
                          </span>
                          <span
                            className={`text-[12px] flex-shrink-0 ${
                              isSelected
                                ? "font-semibold text-accent-red"
                                : "text-text-secondary"
                            }`}
                          >
                            {season.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {facets.seasons.length > 0 && facets.styles.length > 0 && (
                <div className="h-px bg-border-light" />
              )}

              {/* Style Filters (Accordion) */}
              {facets.styles.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {/* Accordion Header */}
                  <button
                    onClick={() => setStylesExpanded(!stylesExpanded)}
                    className={`w-full flex items-center gap-2.5 p-3 rounded-lg transition-all text-left ${
                      stylesExpanded
                        ? "bg-accent-red-light border border-accent-red"
                        : selectedStyles.length > 0
                          ? "bg-white border border-accent-red/30"
                          : "bg-white hover:bg-bg-muted border border-transparent"
                    }`}
                  >
                    <svg
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                        stylesExpanded
                          ? "rotate-90 text-accent-red"
                          : "text-text-tertiary"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span
                      className={`flex-1 text-[14px] font-semibold ${
                        stylesExpanded || selectedStyles.length > 0
                          ? "text-accent-red"
                          : "text-text-primary"
                      }`}
                    >
                      Estilo
                    </span>
                    {selectedStyles.length > 0 && !stylesExpanded && (
                      <span className="text-[11px] text-accent-red bg-accent-red-light px-1.5 py-0.5 rounded-full">
                        {selectedStyles.length}
                      </span>
                    )}
                    <span
                      className={`text-[13px] font-semibold ${
                        stylesExpanded || selectedStyles.length > 0
                          ? "text-accent-red"
                          : "text-text-secondary"
                      }`}
                    >
                      {totalStylesCount}
                    </span>
                  </button>

                  {/* Expanded: Full style list */}
                  <div
                    className="overflow-hidden transition-all duration-200 ease-in-out"
                    style={{
                      maxHeight: stylesExpanded
                        ? `${facets.styles.length * 44 + 8}px`
                        : "0px",
                    }}
                  >
                    <div className="ml-5 mt-1 border-l-2 border-border-light pl-3 flex flex-col gap-0.5">
                      {facets.styles.map((style) => {
                        const isSelected = selectedStyles.includes(style.name);
                        return (
                          <button
                            key={style.name}
                            onClick={() => toggleStyle(style.name)}
                            className={`w-full flex items-center gap-2 py-2.5 px-2.5 rounded-md transition-all text-left ${
                              isSelected
                                ? "bg-accent-red-light"
                                : "hover:bg-bg-muted"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-accent-red border-accent-red"
                                  : "border-border-default"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </span>
                            <span
                              className={`flex-1 text-[13px] truncate ${
                                isSelected
                                  ? "font-medium text-accent-red"
                                  : "text-text-primary"
                              }`}
                            >
                              {style.name}
                            </span>
                            <span
                              className={`text-[12px] flex-shrink-0 ${
                                isSelected
                                  ? "font-semibold text-accent-red"
                                  : "text-text-secondary"
                              }`}
                            >
                              {style.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Collapsed with selections: compact list */}
                  {!stylesExpanded && selectedStyleFacets.length > 0 && (
                    <div className="ml-8 mt-1 flex flex-col gap-0.5">
                      {selectedStyleFacets.map((style) => (
                        <div
                          key={style.name}
                          className="flex items-center gap-2 py-1.5 px-2.5 rounded-md group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
                          <span className="flex-1 text-[12px] text-accent-red truncate">
                            {style.name}
                          </span>
                          <span className="text-[11px] text-accent-red/60">
                            {style.count}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStyle(style.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-accent-red"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
        {filtering && (
          <div className="flex items-center justify-center py-4 mb-4">
            <div className="w-5 h-5 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {outfitsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-[14px] text-text-secondary">
              {hasFilters
                ? "No hay outfits que coincidan con los filtros"
                : "No hay outfits en este tablero"}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[13px] text-accent-red hover:underline"
              >
                Limpiar filtros
              </button>
            )}
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
