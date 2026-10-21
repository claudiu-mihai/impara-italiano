import type { StoredCard } from "../srs/types.ts";

/** Starea locală a unui card: cardul (dacă există) și momentul ștergerii marcate (dacă a fost șters). */
export interface LocalCardState {
  card?: StoredCard;
  deletedAt?: number;
}

/** Starea unui card pe server: o versiune activă sau o ștergere marcată, cu momentul modificării. */
export interface RemoteCardState {
  updatedAt: number;
  deleted: boolean;
  /** Prezent doar când `deleted` este fals. */
  card?: StoredCard;
}

export type CardMerge =
  /** Serverul are aceeași versiune sau una mai veche, iar local nu s-a schimbat nimic de trimis. */
  | { action: "keep" }
  /** Local este mai nou decât serverul: se păstrează și trebuie (re)trimis. */
  | { action: "keep-and-push" }
  /** Serverul este mai nou: cardul local se înlocuiește cu cel de pe server. */
  | { action: "apply"; card: StoredCard }
  /** Serverul are o ștergere mai nouă: cardul local (dacă există) se șterge. */
  | { action: "remove" };

/**
 * Combină starea locală a unui card cu cea de pe server: câștigă versiunea mai nouă (după `updatedAt`).
 * La egalitate regula este aceeași pe ambele dispozitive, ca să ajungă la același rezultat:
 * ștergerea bate cardul activ, iar între două carduri active câștigă cel cu mai multe repetiții.
 */
export function mergeCard(local: LocalCardState, remote: RemoteCardState): CardMerge {
  const localAt = Math.max(local.card?.updatedAt ?? Number.NEGATIVE_INFINITY, local.deletedAt ?? Number.NEGATIVE_INFINITY);
  const hasLocal = local.card !== undefined || local.deletedAt !== undefined;

  if (remote.updatedAt > localAt) return remote.deleted || !remote.card ? { action: "remove" } : { action: "apply", card: remote.card };
  if (remote.updatedAt < localAt) return { action: "keep-and-push" };

  // aceeași oră: aceeași versiune sau o coincidență care trebuie rezolvată la fel pe ambele dispozitive
  if (!hasLocal) return { action: "keep" };
  const localDeleted = local.card === undefined || (local.deletedAt ?? Number.NEGATIVE_INFINITY) >= (local.card.updatedAt ?? Number.NEGATIVE_INFINITY);
  if (remote.deleted && !localDeleted) return { action: "remove" };
  if (!remote.deleted && localDeleted) return { action: "keep-and-push" };
  if (!remote.deleted && !localDeleted && remote.card && local.card && remote.card.reps > local.card.reps) {
    return { action: "apply", card: remote.card };
  }
  return { action: "keep" };
}

/** Rezultatul sincronizării setărilor: câștigă varianta mai nouă; fără setări locale câștigă serverul. */
export function mergeSettingsTimes(localAt: number | undefined, remoteAt: number): "apply" | "keep-and-push" | "keep" {
  if (localAt === undefined || remoteAt > localAt) return "apply";
  return remoteAt < localAt ? "keep-and-push" : "keep";
}

/**
 * La prima autentificare pe un dispozitiv: dacă progres există și local, și pe server, utilizatorul alege
 * (altfel contul altcuiva s-ar amesteca în progresul de pe telefon). Altfel combinarea este sigură:
 * dacă una dintre părți e goală, „combină” înseamnă doar a copia cealaltă parte.
 */
export function firstLoginChoice(localHasProgress: boolean, remoteHasProgress: boolean): "merge" | "ask" {
  return localHasProgress && remoteHasProgress ? "ask" : "merge";
}
