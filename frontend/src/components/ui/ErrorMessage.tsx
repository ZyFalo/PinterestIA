"use client";

import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="w-10 h-10 text-accent-red" />
      <p className="text-[15px] text-text-secondary text-center max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-accent-red hover:bg-accent-red-dark text-white text-[14px] rounded-lg transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
