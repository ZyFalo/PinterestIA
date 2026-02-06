import { cn } from "@/lib/utils";

interface AvatarProps {
  initial: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
};

export default function Avatar({
  initial,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-accent-red text-white font-semibold flex items-center justify-center flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
