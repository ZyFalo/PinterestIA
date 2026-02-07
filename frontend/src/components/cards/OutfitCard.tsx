import Link from "next/link";
import { Outfit } from "@/lib/types";
import { ROUTES } from "@/lib/constants";

interface OutfitCardProps {
  outfit: Outfit;
  boardId?: string;
}

export default function OutfitCard({ outfit, boardId }: OutfitCardProps) {
  const bid = boardId || outfit.boardId || "";
  const displayImage = outfit.cloudinaryUrl || outfit.imageUrl;

  return (
    <Link href={ROUTES.outfit(bid, outfit.id)} target="_blank">
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
        <div className="overflow-hidden">
          <img
            src={displayImage}
            alt={`Outfit ${outfit.style || ""}`}
            className="w-full h-auto object-cover"
          />
        </div>
        <div className="flex justify-center px-3 py-2">
          <span className="text-[12px] text-text-secondary">
            {outfit.garments?.length ?? outfit.garmentsCount ?? 0} prendas
            {outfit.style ? `, ${outfit.style.toLowerCase()}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
