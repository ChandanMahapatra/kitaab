"use client";

import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
}

export function Toast({ message, isVisible }: ToastProps) {
  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2
        flex items-center gap-2 px-4 py-3
        bg-[var(--toast-bg)] text-[var(--toast-text)]
        rounded-lg shadow-lg
        text-sm font-medium
        transition-all duration-300 ease-out
        z-[100]
        ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }
      `}
      role="alert"
      aria-live="polite"
    >
      <Check className="w-4 h-4 text-[var(--toast-icon)]" />
      <span>{message}</span>
    </div>
  );
}
