import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 flex flex-col items-center text-center",
        className
      )}
    >
      <Icon className="w-5 h-5 text-accent-red mb-2" />
      <p className="text-2xl font-bold text-accent-red">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}
