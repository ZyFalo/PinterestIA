"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Share2 } from "lucide-react";
import { outfits as outfitsApi } from "@/lib/api";
import type { Outfit } from "@/lib/types";
import GarmentCard from "@/components/cards/GarmentCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function OutfitDetallePage() {
  const params = useParams();
  const outfitId = params.outfitId as string;
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOutfit = () => {
    setLoading(true);
    setError("");
    outfitsApi
      .get(outfitId)
      .then(setOutfit)
      .catch((e) => setError(e.detail || "Error al cargar el outfit"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOutfit();
  }, [outfitId]);

  if (loading) return <LoadingSpinner />;
  if (error || !outfit) return <ErrorMessage message={error || "Outfit no encontrado"} onRetry={fetchOutfit} />;

  const displayImage = outfit.cloudinaryUrl || outfit.imageUrl;

  return (
    <div className="flex h-full p-8 px-16 gap-10">
      {/* Left - Large Image */}
      <div className="w-[500px] flex-shrink-0">
        <div className="rounded-2xl overflow-hidden h-full">
          <img
            src={displayImage}
            alt={`Outfit ${outfit.style || ""}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right - Garments Column */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h1 className="font-playfair text-[24px] font-bold text-text-primary">
            Prendas identificadas
          </h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default text-text-secondary text-[13px] hover:bg-bg-muted transition-colors">
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        </div>

        {/* Garment Cards */}
        <div className="flex flex-col gap-4">
          {(outfit.garments || []).length > 0 ? (
            outfit.garments!.map((garment) => (
              <GarmentCard key={garment.id} garment={garment} />
            ))
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
