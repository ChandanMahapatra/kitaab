"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast, ToastType } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{ message: string; isVisible: boolean; type: ToastType }>({
    message: "",
    isVisible: false,
    type: "success",
  });

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, isVisible: true, type });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={toast.message} isVisible={toast.isVisible} type={toast.type} />
    </ToastContext.Provider>
  );
}
