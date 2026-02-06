"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { Board } from "@/lib/types";
import { ROUTES } from "@/lib/constants";
import { boards as boardsApi } from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface BoardCardProps {
  board: Board;
  onDelete?: (id: string) => void;
}

export default function BoardCard({ board, onDelete }: BoardCardProps) {
  const router = useRouter();
  const isCompleted = board.status === "completed";
  const isFailed = board.status === "failed";
  const canReanalyze = isCompleted || isFailed;
  const outfitsCount = board.outfits?.length ?? board.outfitsCount ?? 0;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleReanalyze = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(ROUTES.progreso(board.id));
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await boardsApi.delete(board.id);
      setConfirmOpen(false);
      onDelete?.(board.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link href={ROUTES.tablero(board.id)}>
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
          <div className="relative h-[180px] overflow-hidden bg-bg-muted">
            {board.imageUrl ? (
              <img
                src={board.imageUrl}
                alt={board.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-tertiary text-[13px]">
                Sin imagen
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {canReanalyze && (
                <button
                  onClick={handleReanalyze}
                  title="Reanalizar tablero"
                  className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm hover:bg-accent-red hover:text-white text-text-secondary transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                title="Eliminar tablero"
                className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm hover:bg-red-600 hover:text-white text-text-secondary transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-[16px] text-text-primary">
              {board.name}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-secondary">
                {outfitsCount} outfits
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-[3px] rounded ${
                  isCompleted
                    ? "bg-[#E8F5E9] text-[#00C853]"
                    : isFailed
                    ? "bg-red-50 text-red-600"
                    : "bg-[#FFF3E0] text-[#FFA000]"
                }`}
              >
                {isCompleted
                  ? "Completado"
                  : isFailed
                  ? "Error"
                  : board.status === "analyzing"
                  ? "Analizando"
                  : "Pendiente"}
              </span>
            </div>
          </div>
        </div>
      </Link>
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar tablero"
        message={`¿Estás seguro de que quieres eliminar "${board.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={deleting}
      />
    </>
  );
}
