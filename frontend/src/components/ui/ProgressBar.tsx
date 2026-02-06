import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={cn("w-full h-2 bg-bg-muted rounded-full overflow-hidden", className)}
    >
      <div
        className="h-full bg-accent-red rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
