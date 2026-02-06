"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Info, Sparkles } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";

export default function ImportarPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const board = await boardsApi.create(url);
      router.push(ROUTES.progreso(board.id));
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e.detail || "Error al crear el tablero");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-[120px] py-10">
      <div className="w-[720px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-playfair text-[28px] font-bold text-text-primary">
            Importar tablero
          </h1>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            Pega la URL de un tablero público de Pinterest para analizar los
            outfits.
          </p>
        </div>

        {/* Tip Card */}
        <div className="flex gap-3 bg-[#F8F8F8] rounded-xl p-4">
          <Info className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Asegúrate de que el tablero sea público. La URL debe tener el
            formato: pinterest.com/usuario/tablero
          </p>
        </div>

        {error && (
          <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-4 py-3 text-center">
            {error}
          </p>
        )}

        {/* URL Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-primary">
            URL del tablero
          </label>
          <div className="relative">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-tertiary" />
            <input
              type="url"
              placeholder="pinterest.com/usuario/tablero"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
            />
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleSubmit}
          disabled={!url.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-accent-red hover:bg-accent-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[14px] tracking-[1.5px] py-4 rounded-lg transition-colors"
        >
          <Sparkles className="w-[18px] h-[18px]" />
          {loading ? "CREANDO..." : "ANALIZAR TABLERO"}
        </button>
      </div>
    </div>
  );
}
