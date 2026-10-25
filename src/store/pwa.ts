/** Tracks PWA install availability (captured from `beforeinstallprompt`). */
import { create } from "zustand";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  setPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: () => void;
}

export const usePwaStore = create<PwaState>((set) => ({
  deferredPrompt: null,
  installed: false,
  setPrompt: (deferredPrompt) => set({ deferredPrompt }),
  setInstalled: () => set({ installed: true, deferredPrompt: null }),
}));

/** Fire the native install prompt, if one was captured. */
export async function promptInstall(): Promise<void> {
  const e = usePwaStore.getState().deferredPrompt;
  if (!e) return;
  await e.prompt();
  try {
    await e.userChoice;
  } catch {
    /* ignore */
  }
  usePwaStore.getState().setPrompt(null);
}

/** Register the service worker (prod only) and wire up install events. Idempotent-ish. */
export function setupPwa(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    usePwaStore.getState().setPrompt(e as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => usePwaStore.getState().setInstalled());

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support unavailable — non-fatal */
      });
    });
  }
}
