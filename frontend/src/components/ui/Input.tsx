import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export default function Input({
  label,
  icon: Icon,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-red w-[18px] h-[18px]" />
        )}
        <input
          className={cn(
            "w-full px-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-200",
            "focus:border-accent-red focus:ring-1 focus:ring-accent-red",
            Icon && "pl-11",
            error && "border-status-negative",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-status-negative">{error}</p>
      )}
    </div>
  );
}
