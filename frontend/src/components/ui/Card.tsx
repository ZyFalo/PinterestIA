import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export default function Card({
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden",
        hoverable &&
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
