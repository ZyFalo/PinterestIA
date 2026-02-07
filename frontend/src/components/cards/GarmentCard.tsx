import Link from "next/link";
import { Garment } from "@/lib/types";
import { ROUTES } from "@/lib/constants";
import { ChevronRight } from "lucide-react";

interface GarmentCardProps {
  garment: Garment;
}

const tagStyles: Record<string, string> = {
  Verano: "bg-accent-red-light text-accent-red",
  Casual: "bg-[#E8F5E9] text-[#00C853]",
  Denim: "bg-[#E3F2FD] text-[#1976D2]",
  Plataforma: "bg-[#FFF3E0] text-[#FFA000]",
  Elegante: "bg-[#F3E5F5] text-[#9C27B0]",
  Street: "bg-[#E8F5E9] text-[#00C853]",
};

function getTagStyle(tag: string | null) {
  if (!tag) return "bg-bg-muted text-text-secondary";
  return tagStyles[tag] || "bg-bg-muted text-text-secondary";
}

export default function GarmentCard({ garment }: GarmentCardProps) {
  return (
    <Link href={ROUTES.prenda(garment.id)}>
      <div className="bg-[#F8F8F8] rounded-xl p-4 flex items-center gap-3 border-l-[3px] border-accent-red hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
        {garment.imageUrl && (
          <div className="w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={garment.imageUrl}
              alt={garment.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[16px] text-text-primary">
            {garment.name}
          </h4>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {garment.type}
            {garment.color ? ` · ${garment.color}` : ""}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {garment.season && (
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${getTagStyle(
                  garment.season
                )}`}
              >
                {garment.season}
              </span>
            )}
            {garment.style && (
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${getTagStyle(
                  garment.style
                )}`}
              >
                {garment.style}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
      </div>
    </Link>
  );
}
