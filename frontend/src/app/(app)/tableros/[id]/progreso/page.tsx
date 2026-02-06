"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";

interface Phase {
  title: string;
  subtitle: string;
  status: "completed" | "active" | "pending";
}

export default function ProgresoPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  const [progress, setProgress] = useState(0);
  const [phases, setPhases] = useState<Phase[]>([
    { title: "Descargando imágenes", subtitle: "Iniciando...", status: "active" },
    { title: "Analizando con IA", subtitle: "Pendiente", status: "pending" },
    { title: "Guardando resultados", subtitle: "Pendiente", status: "pending" },
  ]);
  const [error, setError] = useState("");
  const analyzeStarted = useRef(false);

  useEffect(() => {
    if (analyzeStarted.current) return;
    analyzeStarted.current = true;

    // Progreso simulado mientras el backend trabaja
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 1;
      });
    }, 500);

    // Rotar fases cada 8 segundos
    const phaseTimer = setTimeout(() => {
      setPhases([
        { title: "Descargando imágenes", subtitle: "Completado", status: "completed" },
        { title: "Analizando con IA", subtitle: "Procesando imágenes...", status: "active" },
        { title: "Guardando resultados", subtitle: "Pendiente", status: "pending" },
      ]);
    }, 8000);

    const phaseTimer2 = setTimeout(() => {
      setPhases([
        { title: "Descargando imágenes", subtitle: "Completado", status: "completed" },
        { title: "Analizando con IA", subtitle: "Completado", status: "completed" },
        { title: "Guardando resultados", subtitle: "Guardando...", status: "active" },
      ]);
    }, 20000);

    // Llamada real al backend
    boardsApi
      .analyze(boardId)
      .then((result) => {
        clearInterval(timer);
        setProgress(100);
        setPhases([
          { title: "Descargando imágenes", subtitle: "Completado", status: "completed" },
          { title: "Analizando con IA", subtitle: "Completado", status: "completed" },
          {
            title: "Guardando resultados",
            subtitle: `${result.outfitsCreated} outfits, ${result.garmentsCreated} prendas`,
            status: "completed",
          },
        ]);
        setTimeout(() => router.push(ROUTES.tablero(boardId)), 1200);
      })
      .catch((e) => {
        clearInterval(timer);
        setError(e.detail || "Error durante el análisis");
      });

    return () => {
      clearInterval(timer);
      clearTimeout(phaseTimer);
      clearTimeout(phaseTimer2);
    };
  }, [boardId, router]);

  return (
    <div className="h-full flex items-center justify-center px-[120px] py-10">
      <div className="w-[640px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center gap-10">
        {/* Progress Circle */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="#E5E5E5"
                strokeWidth="6"
              />
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="#E31E24"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 64}
                strokeDashoffset={
                  2 * Math.PI * 64 - (progress / 100) * 2 * Math.PI * 64
                }
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[36px] font-bold text-accent-red">
                {progress}%
              </span>
              <span className="text-[12px] text-text-secondary">completado</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full h-1.5 bg-border-default rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-red rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {error ? (
            <p className="text-[14px] text-red-600 text-center">{error}</p>
          ) : (
            <>
              <p className="text-[14px] text-text-secondary text-center">
                {progress < 100
                  ? "Analizando tablero de Pinterest..."
                  : "¡Análisis completado!"}
              </p>
              <p className="text-[12px] text-text-tertiary text-center">
                {progress < 100
                  ? "Esto puede tomar unos minutos"
                  : "Redirigiendo..."}
              </p>
            </>
          )}
        </div>

        {/* Phases */}
        <div className="w-full bg-[#F8F8F8] rounded-xl overflow-hidden">
          {phases.map((phase, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-bg-muted" />}
              <div className="flex items-center gap-3 px-5 py-4">
                {phase.status === "completed" ? (
                  <div className="w-6 h-6 rounded-full bg-[#00C853] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : phase.status === "active" ? (
                  <div className="w-6 h-6 rounded-full bg-[#FFA000] flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-[1.5px] border-[#D1D5DB] flex-shrink-0" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-[14px] font-semibold ${
                      phase.status === "pending"
                        ? "text-text-tertiary"
                        : "text-text-primary"
                    }`}
                  >
                    {phase.title}
                  </span>
                  <span
                    className={`text-[12px] ${
                      phase.status === "active"
                        ? "text-[#FFA000]"
                        : "text-text-secondary"
                    }`}
                  >
                    {phase.subtitle}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <button
            onClick={() => router.push(ROUTES.inicio)}
            className="px-6 py-2.5 bg-accent-red hover:bg-accent-red-dark text-white text-[14px] rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}
