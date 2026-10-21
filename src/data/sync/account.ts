import PocketBase, { ClientResponseError } from "pocketbase";
import { firstLoginChoice } from "../../domain/sync/merge.ts";
import type { ImparaDb } from "../db/db.ts";
import { syncUserOf } from "../db/repositories.ts";
import { runSync } from "./engine.ts";
import { hasLocalProgress, pendingCount } from "./pending.ts";
import { PocketBaseRemote } from "./pocketbaseRemote.ts";
import { normalizeEmail, registerErrorMessage } from "./messages.ts";
import type { SyncReport } from "./types.ts";

/**
 * Contul și sincronizarea, partea cu serverul real. Modulul se încarcă lazy (cu SDK-ul PocketBase): fără cont
 * nu este încărcat niciodată și aplicația nu face nicio cerere de rețea.
 */

let client: PocketBase | undefined;

/** Clientul unic; cererile merg pe același domeniu (`/api/`), unde nginx le trimite la PocketBase. */
export function pocketbase(): PocketBase {
  if (!client) {
    client = new PocketBase(window.location.origin);
    // sincronizarea face cereri paralele către aceeași colecție; fără asta SDK-ul le-ar anula una pe alta
    client.autoCancellation(false);
  }
  return client;
}

export type SyncStatus = "ok" | "offline" | "auth-required" | "error";

export interface SyncOutcome {
  status: SyncStatus | "signed-out";
  report?: SyncReport;
  message?: string;
}

/** Un mesaj în română pentru o eroare de autentificare. */
function loginMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 0) return "Nu pot contacta serverul. Verifică conexiunea.";
    if (error.status === 429) return "Prea multe încercări. Așteaptă puțin și încearcă din nou.";
    if (error.status === 400 || error.status === 403) return "Email sau parolă greșite.";
  }
  return "Autentificarea a eșuat. Încearcă din nou.";
}

async function setStatus(db: ImparaDb, status: SyncStatus, message?: string): Promise<void> {
  await db.meta.bulkPut([
    { key: "syncStatus", value: status },
    { key: "syncMessage", value: message ?? null },
  ]);
}

let inFlight: Promise<SyncOutcome> | undefined;

/** Sincronizează acum. O singură sincronizare rulează la un moment dat; apelurile suprapuse primesc același rezultat. */
export function syncNow(db: ImparaDb): Promise<SyncOutcome> {
  inFlight ??= syncOnce(db).finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

const statusOf = (error: unknown): number | undefined => (error instanceof ClientResponseError ? error.status : undefined);

async function syncOnce(db: ImparaDb): Promise<SyncOutcome> {
  const userId = await syncUserOf(db);
  if (!userId) return { status: "signed-out" };
  const pb = pocketbase();

  const fail = async (status: SyncStatus, message?: string): Promise<SyncOutcome> => {
    if (status === "auth-required") pb.authStore.clear();
    await setStatus(db, status, message);
    return { status, message };
  };

  if (!pb.authStore.isValid || pb.authStore.record?.id !== userId) return fail("auth-required");

  // prelungește sesiunea și verifică pe server că contul există încă și parola nu s-a schimbat:
  // orice răspuns de refuz înseamnă că trebuie să te autentifici din nou
  try {
    await pb.collection("users").authRefresh();
  } catch (error) {
    const status = statusOf(error);
    if (status === 0) return fail("offline");
    // 429 = prea multe cereri într-un timp scurt: nu are legătură cu sesiunea, se reîncearcă mai târziu
    if (status === 429) return fail("error", "Prea multe cereri într-un timp scurt. Încearcă din nou peste câteva secunde.");
    if (status !== undefined && status < 500) return fail("auth-required");
    return fail("error", error instanceof Error ? error.message : undefined);
  }

  try {
    const report = await runSync(db, new PocketBaseRemote(pb, userId));
    await setStatus(db, "ok");
    return { status: "ok", report };
  } catch (error) {
    const status = statusOf(error);
    if (status === 0) return fail("offline");
    if (status === 401 || status === 403) return fail("auth-required");
    return fail("error", error instanceof Error ? error.message : "Eroare necunoscută.");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Autentificare

export type SignInResult =
  | { status: "synced"; outcome: SyncOutcome }
  /** Există progres și pe telefon, și în cont: utilizatorul alege cum se combină (vezi `completeSignIn`). */
  | { status: "choice" }
  | { status: "error"; message: string };

let pendingLogin: { userId: string; email: string } | undefined;

export async function signIn(db: ImparaDb, email: string, password: string): Promise<SignInResult> {
  const pb = pocketbase();
  let userId: string;
  try {
    const auth = await pb.collection("users").authWithPassword(normalizeEmail(email), password);
    userId = auth.record.id;
  } catch (error) {
    pb.authStore.clear();
    return { status: "error", message: loginMessage(error) };
  }

  const current = await syncUserOf(db);
  if (current && current !== userId) {
    pb.authStore.clear();
    return { status: "error", message: "Pe acest dispozitiv este deja asociat alt cont. Deconectează-te mai întâi." };
  }

  if (current === userId) {
    // reautentificare după expirarea sesiunii: aceleași date, doar continuă
    await db.meta.put({ key: "syncEmail", value: normalizeEmail(email) });
    return { status: "synced", outcome: await syncNow(db) };
  }

  try {
    const remoteHasProgress = await new PocketBaseRemote(pb, userId).hasProgress();
    if (firstLoginChoice(await hasLocalProgress(db), remoteHasProgress) === "ask") {
      pendingLogin = { userId, email: normalizeEmail(email) };
      return { status: "choice" };
    }
  } catch (error) {
    pb.authStore.clear();
    return { status: "error", message: loginMessage(error) };
  }
  pendingLogin = { userId, email: normalizeEmail(email) };
  return completeSignIn(db, "merge");
}

/**
 * Creează un cont nou și intră în el. Contul nou nu are date pe server, deci nu se întreabă nimic: progresul de pe
 * telefon urcă în cont. Emailul se scrie cu litere mici (serverul ar accepta ca conturi diferite variante care diferă
 * doar prin majuscule, deși autentificarea nu face diferența).
 */
export async function register(db: ImparaDb, email: string, password: string): Promise<SignInResult> {
  const address = normalizeEmail(email);
  try {
    await pocketbase().collection("users").create({ email: address, password, passwordConfirm: password });
  } catch (error) {
    return { status: "error", message: registerErrorMessage(error) };
  }
  const result = await signIn(db, address, password);
  if (result.status === "error") {
    return { status: "error", message: `Contul a fost creat, dar autentificarea a eșuat. ${result.message}` };
  }
  return result;
}

/** Renunță la autentificare în timp ce se alege cum se combină progresul: nu s-a schimbat nimic local. */
export function cancelSignIn(): void {
  pendingLogin = undefined;
  pocketbase().authStore.clear();
}

/**
 * Termină prima autentificare. „merge”: progresul de pe telefon și cel din cont se combină (câștigă versiunea mai
 * nouă a fiecărui card, repetițiile se adună). „account-only”: progresul și setările de pe telefon se șterg și
 * rămâne doar ce e în cont.
 */
export async function completeSignIn(db: ImparaDb, mode: "merge" | "account-only"): Promise<SignInResult> {
  const login = pendingLogin;
  if (!login) return { status: "error", message: "Sesiunea de autentificare a expirat. Autentifică-te din nou." };
  pendingLogin = undefined;

  if (mode === "account-only") await wipeLocalData(db);
  await db.meta.bulkDelete(["syncPulled", "syncReplace", "syncStatus", "syncMessage", "syncLastAt"]);
  await db.meta.bulkPut([
    { key: "syncUserId", value: login.userId },
    { key: "syncEmail", value: login.email },
  ]);
  return { status: "synced", outcome: await syncNow(db) };
}

/** Șterge progresul, setările și marcajele de sincronizare de pe telefon (backup-ul făcut rămâne înregistrat). */
export async function wipeLocalData(db: ImparaDb): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewLog, db.reports, db.settings, db.tombstones, db.meta], async () => {
    await Promise.all([db.cards.clear(), db.reviewLog.clear(), db.reports.clear(), db.settings.clear(), db.tombstones.clear()]);
    await db.meta.where("key").notEqual("lastExportAt").delete();
  });
}

export type SignOutResult = { status: "signed-out" } | { status: "pending"; pending: number };

/**
 * Deconectare: telefonul revine la modul fără cont, curat. Dacă există modificări netrimise (ex. ești offline),
 * se încearcă o sincronizare, iar dacă tot rămân, se întoarce `pending` ca interfața să avertizeze;
 * cu `force` se deconectează oricum.
 */
export async function signOut(db: ImparaDb, force = false): Promise<SignOutResult> {
  if (!force) {
    await syncNow(db);
    const pending = await pendingCount(db);
    if (pending > 0) return { status: "pending", pending };
  }
  await wipeLocalData(db);
  pocketbase().authStore.clear();
  return { status: "signed-out" };
}

export type DeleteAccountResult = { status: "deleted" } | { status: "error"; message: string };

/**
 * Șterge contul și toate datele lui de pe server (cascadă), apoi ca la deconectare. Cere parola: o ștergere este
 * ireversibilă, iar un telefon deblocat nu trebuie să fie de ajuns. Verificarea reautentifică, deci ștergerea merge
 * și cu sesiunea expirată; cu parola greșită nu se șterge nimic.
 */
export async function deleteAccount(db: ImparaDb, password: string): Promise<DeleteAccountResult> {
  const pb = pocketbase();
  const userId = await syncUserOf(db);
  const email = (await db.meta.get("syncEmail"))?.value as string | undefined;
  if (!userId || !email) return { status: "error", message: "Nu ești autentificat." };

  try {
    const auth = await pb.collection("users").authWithPassword(email, password);
    if (auth.record.id !== userId) {
      pb.authStore.clear();
      return { status: "error", message: "Parola e greșită." };
    }
  } catch (error) {
    const status = error instanceof ClientResponseError ? error.status : undefined;
    if (status === 0) return { status: "error", message: "Nu pot contacta serverul. Verifică conexiunea." };
    if (status === 429) return { status: "error", message: "Prea multe încercări. Așteaptă puțin și încearcă din nou." };
    return { status: "error", message: "Parola e greșită." };
  }

  try {
    await pb.collection("users").delete(userId);
  } catch (error) {
    const offline = error instanceof ClientResponseError && error.status === 0;
    return { status: "error", message: offline ? "Nu pot contacta serverul. Verifică conexiunea." : "Nu am putut șterge contul." };
  }
  await wipeLocalData(db);
  pb.authStore.clear();
  return { status: "deleted" };
}
