"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import type { Board, ColorRank, GarmentTypeRank, Outfit } from "@/lib/types";
import { COLOR_HEX_MAP, COLOR_NEEDS_BORDER } from "@/lib/color-map";
import OutfitCard from "@/components/cards/OutfitCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

type Connector = "or" | "and";

export default function TendenciasPage() {
  const params = useParams();
  const boardId = params.id as string;
  const [board, setBoard] = useState<Board | null>(null);
  const [typeRanks, setTypeRanks] = useState<GarmentTypeRank[]>([]);
  const [colorRanks, setColorRanks] = useState<ColorRank[]>([]);
  const [totalOutfits, setTotalOutfits] = useState(0);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [filteredOutfits, setFilteredOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [error, setError] = useState("");
  const initialFetchDone = useRef(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      boardsApi.get(boardId),
      boardsApi.trends(boardId),
      boardsApi.colorTrends(boardId),
      boardsApi.outfits(boardId),
    ])
      .then(([b, ranks, colors, allOutfits]) => {
        setBoard(b);
        setTypeRanks(ranks);
        setColorRanks(colors);
        const sorted = [...allOutfits].sort(
          (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
        );
        setTotalOutfits(sorted.length);
        setFilteredOutfits(sorted);
        initialFetchDone.current = true;
      })
      .catch((e) => setError(e.detail || "Error al cargar tendencias"))
      .finally(() => setLoading(false));
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch filtered outfits when filters change
  useEffect(() => {
    if (!initialFetchDone.current) return;

    setLoadingOutfits(true);
    const hasFilters =
      selectedColors.length > 0 || selectedGarments.length > 0;
    const opts = hasFilters
      ? {
          garmentNames:
            selectedGarments.length > 0 ? selectedGarments : undefined,
          garmentColors:
            selectedColors.length > 0 ? selectedColors : undefined,
          connectors: connectors.length > 0 ? connectors : undefined,
        }
      : undefined;

    boardsApi
      .outfits(boardId, opts)
      .then((outfits) =>
        setFilteredOutfits(
          [...outfits].sort(
            (a, b) => (b.garmentsCount ?? 0) - (a.garmentsCount ?? 0)
          )
        )
      )
      .catch(() => setFilteredOutfits([]))
      .finally(() => setLoadingOutfits(false));
  }, [boardId, selectedColors, selectedGarments, connectors]);

  // --- Color helpers (simple toggle, no connectors) ---

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const removeColor = (color: string) => {
    setSelectedColors((prev) => prev.filter((c) => c !== color));
  };

  // --- Garment helpers (with connectors) ---

  const isGarmentSelected = (name: string) => selectedGarments.includes(name);

  const toggleGarment = (name: string) => {
    setSelectedGarments((prev) => {
      if (prev.includes(name)) {
        const idx = prev.indexOf(name);
        const newGarments = prev.filter((n) => n !== name);
        setConnectors((c) => {
          if (c.length === 0) return c;
          const removeIdx = idx === 0 ? 0 : idx - 1;
          return c.filter((_, i) => i !== removeIdx);
        });
        return newGarments;
      } else {
        if (prev.length > 0) {
          setConnectors((c) => [...c, "or"]);
        }
        return [...prev, name];
      }
    });
  };

  const removeGarment = (name: string) => {
    setSelectedGarments((prev) => {
      const idx = prev.indexOf(name);
      if (idx === -1) return prev;
      const newGarments = prev.filter((n) => n !== name);
      setConnectors((c) => {
        if (c.length === 0) return c;
        const removeIdx = idx === 0 ? 0 : idx - 1;
        return c.filter((_, i) => i !== removeIdx);
      });
      return newGarments;
    });
  };

  const handleTypeClick = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
  };

  const toggleConnector = (index: number) => {
    setConnectors((prev) =>
      prev.map((c, i) => (i === index ? (c === "or" ? "and" : "or") : c))
    );
  };

  const setAllConnectors = (value: Connector) => {
    setConnectors((prev) => prev.map(() => value));
  };

  const clearAll = () => {
    setSelectedColors([]);
    setSelectedGarments([]);
    setConnectors([]);
  };

  // Faceted search: update available colors when garment filters change
  useEffect(() => {
    if (!initialFetchDone.current) return;
    const opts =
      selectedGarments.length > 0
        ? {
            garmentNames: selectedGarments,
            connectors: connectors.length > 0 ? connectors : undefined,
          }
        : undefined;
    boardsApi
      .colorTrends(boardId, opts)
      .then((colors) => {
        setColorRanks(colors);
        const available = new Set(colors.map((c) => c.color));
        setSelectedColors((prev) => prev.filter((c) => available.has(c)));
      })
      .catch(() => {});
  }, [boardId, selectedGarments, connectors]);

  if (loading) return <LoadingSpinner />;
  if (error || !board)
    return <ErrorMessage message={error || "Error"} onRetry={fetchData} />;
  if (typeRanks.length === 0)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[15px] text-text-secondary">
          No hay tendencias disponibles.
        </p>
      </div>
    );

  const hasColors = selectedColors.length > 0;
  const hasGarments = selectedGarments.length > 0;
  const hasAnyFilter = hasColors || hasGarments;

  return (
    <div className="flex h-full p-8 px-10 gap-8">
      {/* Left - Sidebar */}
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
          <Link
            href={ROUTES.tablero(boardId)}
            className="text-text-tertiary hover:text-accent-red transition-colors truncate max-w-[120px]"
          >
            {board.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-text-primary font-medium">Tendencias</span>
        </div>

        {/* Board Cover */}
        <div className="rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {board.imageUrl ? (
            <div className="relative h-[140px]">
              <img
                src={board.imageUrl}
                alt={board.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className="font-playfair text-[20px] font-bold text-white leading-tight">
                  {board.name}
                </h1>
                <span className="text-[12px] text-white/70">
                  {totalOutfits} outfits analizados
                </span>
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
            <div className="bg-gradient-to-br from-accent-red to-accent-red-dark p-4 h-[100px] flex flex-col justify-end relative">
              <h1 className="font-playfair text-[20px] font-bold text-white leading-tight">
                {board.name}
              </h1>
              <span className="text-[12px] text-white/70">
                {totalOutfits} outfits analizados
              </span>
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

        {/* Color Swatches */}
        {colorRanks.length > 0 && (
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[14px] font-semibold text-text-primary">
                Colores
              </h2>
              <p className="text-[11px] text-text-tertiary">
                Colores encontrados en el tablero
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {colorRanks.map((cr) => {
                const hex = COLOR_HEX_MAP[cr.color] || "#9CA3AF";
                const selected = selectedColors.includes(cr.color);
                const needsBorder = COLOR_NEEDS_BORDER.has(cr.color);
                return (
                  <button
                    key={cr.color}
                    onClick={() => toggleColor(cr.color)}
                    className="flex flex-col items-center gap-1 group"
                    title={`${cr.color} (${cr.count})`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full transition-all ${
                        selected
                          ? "ring-2 ring-accent-red ring-offset-2"
                          : needsBorder
                            ? "border border-border-default"
                            : ""
                      } ${
                        !selected
                          ? "group-hover:ring-2 group-hover:ring-border-default group-hover:ring-offset-1"
                          : ""
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                    <span
                      className={`text-[10px] leading-tight ${
                        selected
                          ? "font-semibold text-accent-red"
                          : "text-text-secondary"
                      }`}
                    >
                      {cr.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[14px] font-semibold text-text-primary">
            Prendas más repetidas
          </h2>
          <p className="text-[11px] text-text-tertiary">
            Agrupadas por tipo de prenda
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-1.5">
          {typeRanks.map((typeRank) => {
            const isExpanded = expandedType === typeRank.type;
            const selectedInType = typeRank.garments.filter((g) =>
              isGarmentSelected(g.name)
            );
            const hasSelections = selectedInType.length > 0;

            return (
              <div key={typeRank.type}>
                {/* Type Header */}
                <button
                  onClick={() => handleTypeClick(typeRank.type)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-lg transition-all text-left ${
                    isExpanded
                      ? "bg-accent-red-light border border-accent-red"
                      : hasSelections
                        ? "bg-white border border-accent-red/30"
                        : "bg-white hover:bg-bg-muted border border-transparent"
                  }`}
                >
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                      isExpanded
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
                      isExpanded || hasSelections
                        ? "text-accent-red"
                        : "text-text-primary"
                    }`}
                  >
                    {typeRank.type}
                  </span>
                  {hasSelections && !isExpanded && (
                    <span className="text-[11px] text-accent-red bg-accent-red-light px-1.5 py-0.5 rounded-full">
                      {selectedInType.length}
                    </span>
                  )}
                  <span
                    className={`text-[13px] font-semibold ${
                      isExpanded || hasSelections
                        ? "text-accent-red"
                        : "text-text-secondary"
                    }`}
                  >
                    {typeRank.count}
                  </span>
                </button>

                {/* Expanded: Full garment list */}
                <div
                  className="overflow-hidden transition-all duration-200 ease-in-out"
                  style={{
                    maxHeight: isExpanded
                      ? `${typeRank.garments.length * 44 + 8}px`
                      : "0px",
                  }}
                >
                  <div className="ml-5 mt-1 border-l-2 border-border-light pl-3 flex flex-col gap-0.5">
                    {typeRank.garments.map((garment) => {
                      const isSelected = isGarmentSelected(garment.name);
                      return (
                        <button
                          key={garment.name}
                          onClick={() => toggleGarment(garment.name)}
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
                            {garment.name}
                          </span>
                          <span
                            className={`text-[12px] flex-shrink-0 ${
                              isSelected
                                ? "font-semibold text-accent-red"
                                : "text-text-secondary"
                            }`}
                          >
                            {garment.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Collapsed with selections: compact list */}
                {!isExpanded && selectedInType.length > 0 && (
                  <div className="ml-8 mt-1 flex flex-col gap-0.5">
                    {selectedInType.map((garment) => (
                      <div
                        key={garment.name}
                        className="flex items-center gap-2 py-1.5 px-2.5 rounded-md group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
                        <span className="flex-1 text-[12px] text-accent-red truncate">
                          {garment.name}
                        </span>
                        <span className="text-[11px] text-accent-red/60">
                          {garment.count}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGarment(garment.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-accent-red"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right - Filtered Outfits */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Filter Header */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3">
          {!hasAnyFilter ? (
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-text-secondary">
                Todos los outfits
              </span>
              <span className="text-[13px] font-medium text-accent-red">
                {filteredOutfits.length} resultados
              </span>
            </div>
          ) : (
            <>
              {/* Filter chips */}
              <div className="flex flex-col gap-0">
                {/* Color chips zone */}
                {hasColors && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedColors.map((color, i) => (
                      <span
                        key={`color-${color}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        {i > 0 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-bg-muted text-text-secondary">
                            O
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-red bg-accent-red-light px-2.5 py-1 rounded-full">
                          <span
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              COLOR_NEEDS_BORDER.has(color)
                                ? "border border-accent-red/30"
                                : ""
                            }`}
                            style={{
                              backgroundColor:
                                COLOR_HEX_MAP[color] || "#9CA3AF",
                            }}
                          />
                          {color}
                          <button
                            onClick={() => removeColor(color)}
                            className="hover:text-accent-red-dark"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* AND divider between groups */}
                {hasColors && hasGarments && (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="flex-1 border-t border-border-light" />
                    <span className="text-[11px] font-medium text-text-tertiary">
                      Y
                    </span>
                    <div className="flex-1 border-t border-border-light" />
                  </div>
                )}

                {/* Garment chips zone */}
                {hasGarments && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedGarments.map((name, i) => (
                      <span
                        key={`garment-${name}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        {i > 0 && (
                          <button
                            onClick={() => toggleConnector(i - 1)}
                            className={`text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                              connectors[i - 1] === "and"
                                ? "bg-accent-red text-white"
                                : "bg-bg-muted text-text-secondary hover:bg-border-default"
                            }`}
                          >
                            {connectors[i - 1] === "and" ? "Y" : "O"}
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-red bg-accent-red-light px-2.5 py-1 rounded-full">
                          {name}
                          <button
                            onClick={() => removeGarment(name)}
                            className="hover:text-accent-red-dark"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Unified footer: bulk actions + count + clear */}
              <div className="flex items-center gap-2 border-t border-border-light pt-2.5">
                {selectedGarments.length >= 2 && (
                  <>
                    <span className="text-[12px] text-text-tertiary">
                      Cambiar todos a
                    </span>
                    <button
                      onClick={() => setAllConnectors("and")}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                        connectors.every((c) => c === "and")
                          ? "bg-accent-red text-white"
                          : "bg-bg-muted text-text-secondary hover:bg-border-default"
                      }`}
                    >
                      Y
                    </button>
                    <button
                      onClick={() => setAllConnectors("or")}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                        connectors.every((c) => c === "or")
                          ? "bg-accent-red text-white"
                          : "bg-bg-muted text-text-secondary hover:bg-border-default"
                      }`}
                    >
                      O
                    </button>
                  </>
                )}
                <div className="flex-1" />
                <span className="text-[13px] font-medium text-accent-red">
                  {filteredOutfits.length} resultados
                </span>
                <button
                  onClick={clearAll}
                  className="text-[12px] text-text-tertiary hover:text-accent-red transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </>
          )}
        </div>

        {/* Outfit Grid */}
        {loadingOutfits ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-text-secondary">
              No se encontraron outfits.
            </p>
          </div>
        ) : (
          <div className="columns-[290px] gap-4">
            {filteredOutfits.map((outfit) => (
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
