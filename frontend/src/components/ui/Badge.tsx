import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "red" | "outline";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        variant === "default" && "bg-bg-muted text-text-secondary",
        variant === "red" && "bg-accent-red-light text-accent-red",
        variant === "outline" &&
          "bg-transparent border border-border-default text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
