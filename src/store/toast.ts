/** Minimal toast store. Push from anywhere; <Toaster/> renders + auto-dismisses. */
import { create } from "zustand";
import { newId } from "@/db/database";

export type ToastVariant = "default" | "success" | "danger" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ title, description, variant = "default", duration = 3500 }) => {
    const id = newId();
    set((s) => ({ toasts: [...s.toasts, { id, title, description, variant, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper for non-component code. */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: "success" }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: "danger" }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: "warning" }),
};
