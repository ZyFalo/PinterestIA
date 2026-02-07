"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ChevronRight } from "lucide-react";

import { ROUTES } from "@/lib/constants";
import { COLOR_HEX_MAP, COLOR_NEEDS_BORDER } from "@/lib/color-map";
import { boards as boardsApi, outfits as outfitsApi } from "@/lib/api";
import type { Outfit, Board } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function OutfitDetallePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = params.id as string;
  const outfitId = params.outfitId as string;
  const fromTendencias = searchParams.get("from") === "tendencias";
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    setError("");
    Promise.all([outfitsApi.get(outfitId), boardsApi.get(boardId)])
      .then(([o, b]) => {
        setOutfit(o);
        setBoard(b);
      })
      .catch((e) => setError(e.detail || "Error al cargar el outfit"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [outfitId, boardId]);

  if (loading) return <LoadingSpinner />;
  if (error || !outfit)
    return (
      <ErrorMessage
        message={error || "Outfit no encontrado"}
        onRetry={fetchData}
      />
    );

  const garmentsList = outfit.garments || [];

  return (
    <div className="flex h-full p-8 px-16 gap-10">
      {/* Left Column - Image & Metadata */}
      <div className="w-[500px] flex-shrink-0 flex flex-col gap-4">
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
            className="text-text-tertiary hover:text-accent-red transition-colors truncate max-w-[140px]"
          >
            {board?.name || "Tablero"}
          </Link>
          {fromTendencias && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
              <Link
                href={ROUTES.tendencias(boardId)}
                className="text-text-tertiary hover:text-accent-red transition-colors"
              >
                Tendencias
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-text-primary font-medium">Outfit</span>
        </div>

        {/* Image with Overlay */}
        <div className="rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative group">
          <img
            src={outfit.imageUrl}
            alt={`Outfit ${outfit.style || ""}`}
            className="w-full h-auto object-cover"
          />

          {/* Hover overlay with style badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2">
                {outfit.style && (
                  <span className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                    {outfit.style}
                  </span>
                )}
                {outfit.season && (
                  <span className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                    {outfit.season}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Source pin link */}
          {outfit.sourcePinUrl && (
            <a
              href={outfit.sourcePinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
              title="Ver pin original en Pinterest"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Outfit Summary Card */}
        <Card className="p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-secondary">
              Prendas identificadas
            </span>
            <span className="text-[14px] font-semibold text-accent-red">
              {garmentsList.length}
            </span>
          </div>

          {outfit.style && (
            <>
              <div className="h-px bg-border-light" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-secondary">Estilo</span>
                <Badge>{outfit.style}</Badge>
              </div>
            </>
          )}

          {outfit.season && (
            <>
              <div className="h-px bg-border-light" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-secondary">
                  Temporada
                </span>
                <Badge>{outfit.season}</Badge>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Right Column - Garment Analysis */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Dynamic Title */}
        <div className="flex flex-col gap-1">
          <h1 className="font-playfair text-[24px] font-bold text-text-primary">
            {outfit.style
              ? `Análisis de outfit ${outfit.style.toLowerCase()}`
              : "Análisis de outfit"}
          </h1>
          <p className="text-[14px] text-text-secondary">
            {garmentsList.length}{" "}
            {garmentsList.length === 1
              ? "prenda identificada"
              : "prendas identificadas"}
            {outfit.season && ` · ${outfit.season}`}
          </p>
        </div>

        {/* Enhanced Garment Cards */}
        <div className="flex flex-col gap-4">
          {garmentsList.length > 0 ? (
            garmentsList.map((garment) => {
              const colorKey = garment.color?.toLowerCase() || "";
              const colorHex = COLOR_HEX_MAP[colorKey];
              const needsBorder = COLOR_NEEDS_BORDER.has(colorKey);
              const confidence = garment.confidence
                ? Math.round(garment.confidence)
                : null;

              return (
                <Link href={ROUTES.prenda(garment.id)} key={garment.id}>
                  <Card hoverable className="p-0">
                    <div className="flex items-stretch">
                      {/* Color Swatch Column */}
                      {colorHex && (
                        <div className="w-16 flex-shrink-0 flex items-center justify-center bg-bg-muted/50 border-r border-border-light">
                          <div
                            className={`w-9 h-9 rounded-full ${
                              needsBorder
                                ? "border border-border-default"
                                : ""
                            }`}
                            style={{ backgroundColor: colorHex }}
                            title={garment.color || ""}
                          />
                        </div>
                      )}

                      {/* Main Content */}
                      <div className="flex-1 p-4 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[16px] text-text-primary">
                              {garment.name}
                            </h4>
                            <p className="text-[13px] text-text-secondary mt-0.5">
                              {garment.type}
                              {garment.material
                                ? ` · ${garment.material}`
                                : ""}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5" />
                        </div>

                        {/* Attribute Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {garment.color && <Badge>{garment.color}</Badge>}
                          {garment.season && <Badge>{garment.season}</Badge>}
                          {garment.style && <Badge>{garment.style}</Badge>}
                        </div>

                        {/* Confidence Bar */}
                        {confidence !== null && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-text-tertiary">
                                Confianza
                              </span>
                              <span className="text-[11px] font-medium text-accent-red">
                                {confidence}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent-red rounded-full transition-all"
                                style={{ width: `${confidence}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <p className="text-[14px] text-text-secondary">
              No se identificaron prendas en este outfit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
