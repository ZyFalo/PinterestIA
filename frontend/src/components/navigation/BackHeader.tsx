"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackHeaderProps {
  title: string;
  className?: string;
}

export default function BackHeader({ title, className }: BackHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        onClick={() => router.back()}
        className="p-2 -ml-2 rounded-lg hover:bg-bg-muted transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-text-primary" />
      </button>
      <h1 className="text-[16px] font-semibold text-text-primary">{title}</h1>
    </div>
  );
}
