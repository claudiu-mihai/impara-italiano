import type { ImparaDb } from "../db/db.ts";
import { syncUserOf } from "../db/repositories.ts";
import { pendingCount } from "./pending.ts";
import { LOCAL_CHANGE_EVENT } from "./signal.ts";

/** După ultima modificare locală se așteaptă puțin, ca o sesiune de studiu să plece într-o singură sincronizare. */
export const DEBOUNCE_MS = 20_000;
/** Revenind în aplicație se sincronizează doar dacă ultima sincronizare e mai veche de atât. */
export const STALE_MS = 2 * 60_000;

/**
 * Sincronizarea automată, doar cu cont: la pornire, la revenirea conexiunii, la o pauză după modificări și când
 * aplicația trece în fundal. Modulul nu importă SDK-ul: fără cont nu încarcă și nu cere nimic.
 */
export function startAutoSync(db: ImparaDb): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const run = async () => {
    if (stopped || !(await syncUserOf(db))) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const { syncNow } = await import("./account.ts");
    await syncNow(db);
  };
  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), ms);
  };

  const onChange = () => schedule(DEBOUNCE_MS);
  const onOnline = () => schedule(1000);
  const onVisibility = async () => {
    if (!(await syncUserOf(db))) return;
    if (document.visibilityState === "hidden") {
      // la plecare se trimite ce a rămas, fără să se facă cereri degeaba
      if ((await pendingCount(db)) > 0) {
        clearTimeout(timer);
        void run();
      }
      return;
    }
    const last = (await db.meta.get("syncLastAt"))?.value as string | undefined;
    if (!last || Date.now() - new Date(last).getTime() > STALE_MS) schedule(1000);
  };

  window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);
  schedule(500); // la pornire

  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
