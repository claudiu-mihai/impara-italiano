import metaData from "../generated/meta.json";
import wordsData from "../generated/words.json";
import type { ContentMeta, Conjugations, Sentence, Topic, Word } from "../../domain/content/schema.ts";
import type { CoreWord } from "../../domain/content/types.ts";
import { decodeWords, type CompactWords } from "../../domain/content/wordsCodec.ts";

export interface ContentStore {
  /** Datele de bază ale tuturor cuvintelor, în ordinea rangului. */
  words: CoreWord[];
  meta: ContentMeta;
  byId: (id: string) => CoreWord | undefined;
}

export function createContentStore(words: CoreWord[], meta: ContentMeta): ContentStore {
  const index = new Map(words.map((w) => [w.id, w]));
  return { words, meta, byId: (id) => index.get(id) };
}

let cached: Promise<ContentStore> | undefined;

/**
 * Încarcă dicționarul inclus în build. Datele sunt validate cu Zod la build
 * (`npm run validate`), deci aici nu se mai validează la fiecare pornire.
 */
export function loadContentStore(): Promise<ContentStore> {
  cached ??= Promise.resolve(
    createContentStore(decodeWords(wordsData as unknown as CompactWords), metaData as unknown as ContentMeta),
  );
  return cached;
}

/** Conjugările se încarcă separat, doar când e nevoie de ele. */
export async function loadConjugations(): Promise<Conjugations> {
  const module = await import("../generated/conjugations.json");
  return module.default as unknown as Conjugations;
}

/** Propozițiile pentru exercițiul de reconstruire, încărcate doar când e nevoie. */
export async function loadSentences(): Promise<Sentence[]> {
  const module = await import("../generated/sentences.json");
  return module.default as unknown as Sentence[];
}

/** Temele (fișe, subgrupe, exerciții), încărcate doar de ecranele care le folosesc. */
export async function loadTopics(): Promise<Topic[]> {
  const module = await import("../generated/topics.json");
  return module.default as unknown as Topic[];
}

let detailsCache: Promise<Map<string, Word>> | undefined;

/** Cuvintele complete (exemple, note, forme), încărcate doar de ecranele care le afișează. */
export function loadWordDetails(): Promise<Map<string, Word>> {
  detailsCache ??= import("../generated/details.json").then(
    (module) => new Map((module.default as unknown as Word[]).map((w) => [w.id, w])),
  );
  return detailsCache;
}
