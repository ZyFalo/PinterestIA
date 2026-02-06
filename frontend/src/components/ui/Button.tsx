import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-semibold text-sm uppercase tracking-[1.5px] px-8 py-4 rounded-lg transition-colors duration-200",
        variant === "primary" &&
          "bg-accent-red hover:bg-accent-red-dark text-white",
        variant === "secondary" &&
          "bg-white border border-border-default text-text-primary hover:bg-bg-muted",
        variant === "ghost" &&
          "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-muted",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
