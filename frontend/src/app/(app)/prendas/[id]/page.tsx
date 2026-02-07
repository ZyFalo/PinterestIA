"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { garments as garmentsApi } from "@/lib/api";
import type { Garment, Product } from "@/lib/types";
import ProductCard from "@/components/cards/ProductCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function PrendaDetallePage() {
  const params = useParams();
  const garmentId = params.id as string;
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  const fetchGarment = () => {
    setLoading(true);
    setError("");
    garmentsApi
      .get(garmentId)
      .then(setGarment)
      .catch((e) => setError(e.detail || "Error al cargar la prenda"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGarment();
  }, [garmentId]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const products = await garmentsApi.searchProducts(garmentId);
      setGarment((prev) => (prev ? { ...prev, products } : prev));
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !garment)
    return <ErrorMessage message={error || "Prenda no encontrada"} onRetry={fetchGarment} />;

  const attrs = [
    { label: "Tipo", value: garment.type },
    { label: "Color", value: garment.color },
    { label: "Material", value: garment.material },
    { label: "Clima", value: garment.season },
  ].filter((a) => a.value);

  const products = garment.products || [];

  return (
    <div className="flex h-full p-8 px-16 gap-10">
      {/* Left - Info Card */}
      <div className="w-[420px] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
          <div className="flex flex-col gap-3">
            <h1 className="font-playfair text-[24px] font-bold text-text-primary">
              {garment.name}
            </h1>
            <p className="text-[15px] text-text-secondary">
              {garment.type}
              {garment.material ? ` · ${garment.material}` : ""}
            </p>
            <div className="flex flex-col gap-3">
              {attrs.map((attr) => (
                <div key={attr.label} className="flex items-center gap-2">
                  <span className="text-[12px] text-text-secondary bg-bg-muted px-3 py-1.5 rounded-lg">
                    {attr.label}
                  </span>
                  <span className="text-[12px] font-medium text-accent-red bg-accent-red-light px-3 py-1.5 rounded-lg">
                    {attr.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Products Column */}
      <div className="flex-1 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-playfair text-[24px] font-bold text-text-primary">
            Productos similares
          </h2>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-accent-red hover:bg-accent-red-dark disabled:opacity-50 text-white text-[13px] rounded-lg transition-colors"
          >
            {searching ? "Buscando..." : "Buscar productos"}
          </button>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-text-secondary">
            Presiona &quot;Buscar productos&quot; para encontrar artículos similares.
          </p>
        )}
      </div>
    </div>
  );
}
