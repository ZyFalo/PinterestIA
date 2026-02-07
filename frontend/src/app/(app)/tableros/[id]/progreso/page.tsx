"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import type { AnalysisStatus } from "@/lib/types";

interface Phase {
  title: string;
  subtitle: string;
  status: "completed" | "active" | "pending" | "failed";
}

function derivePhases(data: AnalysisStatus): Phase[] {
  const { phase, pinsTotal, pinsAnalyzed, outfitsCreated, garmentsCreated } = data;

  if (phase === "failed") {
    return [
      {
        title: "Obteniendo imágenes",
        subtitle: pinsTotal > 0 ? `${pinsTotal} pines obtenidos` : "Completado",
        status: pinsTotal > 0 ? "completed" : "failed",
      },
      {
        title: "Analizando con IA",
        subtitle: `Falló — ${pinsAnalyzed} de ${pinsTotal} analizados`,
        status: "failed",
      },
      {
        title: "Proceso completado",
        subtitle: "No completado",
        status: "pending",
      },
    ];
  }

  // Fase 1: Obteniendo imágenes (scraping)
  const scraping: Phase = (phase === "scraping" || phase === "pending")
    ? { title: "Obteniendo imágenes", subtitle: "Conectando con Pinterest...", status: "active" }
    : { title: "Obteniendo imágenes", subtitle: `${pinsTotal} pines obtenidos`, status: "completed" };

  // Fase 2: Analizando con IA
  const analyzing: Phase = phase === "analyzing"
    ? { title: "Analizando con IA", subtitle: `${pinsAnalyzed} de ${pinsTotal} pines analizados`, status: "active" }
    : phase === "completed"
    ? { title: "Analizando con IA", subtitle: `${pinsAnalyzed} pines analizados`, status: "completed" }
    : { title: "Analizando con IA", subtitle: "Pendiente", status: "pending" };

  // Fase 3: Completado
  const completed: Phase = phase === "completed"
    ? {
        title: "Proceso completado",
        subtitle: `${outfitsCreated} outfits, ${garmentsCreated} prendas identificadas`,
        status: "completed",
      }
    : { title: "Proceso completado", subtitle: "Pendiente", status: "pending" };

  return [scraping, analyzing, completed];
}

function deriveProgress(data: AnalysisStatus): number {
  const { phase, pinsTotal, pinsAnalyzed } = data;
  if (phase === "completed") return 100;
  if (phase === "failed") return 0;
  if (phase === "pending" || phase === "scraping") return 5;
  if (phase === "analyzing") {
    if (pinsTotal > 0) return Math.round(5 + (pinsAnalyzed / pinsTotal) * 93);
    return 5;
  }
  return 0;
}

export default function ProgresoPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  const [progress, setProgress] = useState(0);
  const [phases, setPhases] = useState<Phase[]>([
    {
      title: "Obteniendo imágenes",
      subtitle: "Iniciando...",
      status: "active",
    },
    { title: "Analizando con IA", subtitle: "Pendiente", status: "pending" },
    {
      title: "Proceso completado",
      subtitle: "Pendiente",
      status: "pending",
    },
  ]);
  const [error, setError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const analyzeStarted = useRef(false);

  // Effect 1: Lanzar análisis (fire-once, sobrevive Strict Mode)
  useEffect(() => {
    if (analyzeStarted.current) return;
    analyzeStarted.current = true;

    boardsApi.analyze(boardId).catch((e) => {
      if (e?.detail?.includes("ya está siendo analizado")) return;
      setError(e.detail || "Error al iniciar el análisis");
    });
  }, [boardId]);

  // Effect 2: Polling cada 2s (se re-monta correctamente con Strict Mode)
  useEffect(() => {
    if (isCompleted || error) return;
    let active = true;
    let intervalId: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const data = await boardsApi.status(boardId);
        if (!active) return;
        setPhases(derivePhases(data));
        setProgress(deriveProgress(data));
        if (data.status === "completed") setIsCompleted(true);
        else if (data.status === "failed")
          setError("El análisis ha fallado. Intenta nuevamente.");
      } catch (e: unknown) {
        // 401 = sesión expirada, detener polling (AuthGuard redirige a login)
        const err = e as { status?: number };
        if (err?.status === 401) {
          active = false;
          clearInterval(intervalId);
        }
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [boardId, isCompleted, error]);

  // Effect 3: Redirección automática al completar
  useEffect(() => {
    if (!isCompleted) return;
    const t = setTimeout(() => router.push(ROUTES.tablero(boardId)), 1500);
    return () => clearTimeout(t);
  }, [isCompleted, boardId, router]);

  return (
    <div className="h-full flex items-center justify-center px-[120px] py-10">
      <div className="w-[640px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center gap-10">
        {/* Progress Circle */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-[140px] h-[140px]">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 140 140"
            >
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
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[36px] font-bold text-accent-red">
                {progress}%
              </span>
              <span className="text-[12px] text-text-secondary">
                completado
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full h-1.5 bg-border-default rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-red rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {error ? (
            <p className="text-[14px] text-red-600 text-center">{error}</p>
          ) : (
            <>
              <p className="text-[14px] text-text-secondary text-center">
                {isCompleted
                  ? "¡Análisis completado!"
                  : "Analizando tablero de Pinterest..."}
              </p>
              {!isCompleted && (
                <p className="text-[12px] text-text-tertiary text-center">
                  Esto puede tomar unos minutos
                </p>
              )}
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
                ) : phase.status === "failed" ? (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-[1.5px] border-[#D1D5DB] flex-shrink-0" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-[14px] font-semibold ${
                      phase.status === "pending"
                        ? "text-text-tertiary"
                        : phase.status === "failed"
                        ? "text-red-600"
                        : "text-text-primary"
                    }`}
                  >
                    {phase.title}
                  </span>
                  <span
                    className={`text-[12px] ${
                      phase.status === "active"
                        ? "text-[#FFA000]"
                        : phase.status === "failed"
                        ? "text-red-500"
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

        {/* Botón Ver tablero (completado) */}
        {isCompleted && (
          <button
            onClick={() => router.push(ROUTES.tablero(boardId))}
            className="px-8 py-3 bg-accent-red hover:bg-accent-red-dark text-white text-[15px] font-semibold rounded-xl transition-colors"
          >
            Ver tablero
          </button>
        )}

        {/* Botón Reintentar / Volver (error) */}
        {error && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                analyzeStarted.current = false;
                setError("");
                setIsCompleted(false);
                setProgress(0);
                setPhases([
                  { title: "Obteniendo imágenes", subtitle: "Iniciando...", status: "active" },
                  { title: "Analizando con IA", subtitle: "Pendiente", status: "pending" },
                  { title: "Proceso completado", subtitle: "Pendiente", status: "pending" },
                ]);
              }}
              className="px-6 py-2.5 bg-accent-red hover:bg-accent-red-dark text-white text-[14px] rounded-lg transition-colors"
            >
              Reintentar análisis
            </button>
            <button
              onClick={() => router.push(ROUTES.inicio)}
              className="px-6 py-2.5 border border-border-default text-text-secondary text-[14px] rounded-lg hover:bg-bg-muted transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
