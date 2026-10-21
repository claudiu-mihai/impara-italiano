import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

const listeners = new Set<() => void>();
let needRefresh = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

/** Înregistrează service worker-ul; anunță când există o versiune nouă. */
export function initPwa(): void {
  updateServiceWorker = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      for (const l of listeners) l();
    },
  });
}

export function applyPwaUpdate(): void {
  void updateServiceWorker?.(true);
}

export function usePwaNeedRefresh(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => needRefresh,
    () => false,
  );
}
