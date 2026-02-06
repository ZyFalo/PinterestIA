import Link from "next/link";
import { Board } from "@/lib/types";
import { ROUTES } from "@/lib/constants";

interface BoardCardProps {
  board: Board;
}

export default function BoardCard({ board }: BoardCardProps) {
  const isCompleted = board.status === "completed";
  const isFailed = board.status === "failed";
  const outfitsCount = board.outfits?.length ?? board.outfitsCount ?? 0;

  return (
    <Link href={ROUTES.tablero(board.id)}>
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
        <div className="h-[180px] overflow-hidden bg-bg-muted">
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
  );
}
