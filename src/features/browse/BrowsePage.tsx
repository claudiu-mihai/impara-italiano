import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { filterWords, presentCategories, type BrowseFilters } from "../../domain/browse/filterWords.ts";
import { LEVELS, type Level } from "../../domain/content/constants.ts";
import { italianText, LEVEL_LABEL, POS_LABEL } from "../../domain/content/display.ts";
import { LEVEL_NAME } from "../../domain/content/levels.ts";
import { masteryByWord, type Mastery } from "../../domain/srs/mastery.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { LevelBadge } from "./LevelBadge.tsx";

const control = "min-h-12 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";

export function BrowsePage() {
  const content = useContent();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);
  const [filters, setFilters] = useState<BrowseFilters>({ query: "", pos: "all", progress: "all", cefr: "all" });

  const levels = useMemo(() => masteryByWord(cards ?? []), [cards]);
  const categories = useMemo(() => presentCategories(content.words), [content.words]);
  const results = useMemo(() => filterWords(content.words, filters, levels), [content.words, filters, levels]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">Dicționar</h1>

      <input
        type="search"
        aria-label="Caută în dicționar"
        placeholder="Caută în italiană sau română"
        value={filters.query}
        onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${control} w-full text-lg`}
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Nivel CEFR"
          value={filters.cefr}
          onChange={(e) => setFilters({ ...filters, cefr: e.target.value as Level | "all" })}
          className={control}
        >
          <option value="all">Toate nivelurile</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {level} · {LEVEL_NAME[level]}
            </option>
          ))}
        </select>
        <select
          aria-label="Progres"
          value={filters.progress}
          onChange={(e) => setFilters({ ...filters, progress: e.target.value as Mastery | "all" })}
          className={control}
        >
          <option value="all">Tot progresul</option>
          {(Object.keys(LEVEL_LABEL) as Mastery[]).map((progress) => (
            <option key={progress} value={progress}>
              {LEVEL_LABEL[progress]}
            </option>
          ))}
        </select>
        <select
          aria-label="Categorie"
          value={filters.pos}
          onChange={(e) => setFilters({ ...filters, pos: e.target.value as BrowseFilters["pos"] })}
          className={`${control} col-span-2`}
        >
          <option value="all">Toate categoriile</option>
          {categories.map((pos) => (
            <option key={pos} value={pos}>
              {POS_LABEL[pos]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted" role="status">
        {results.length} {results.length === 1 ? "cuvânt" : "cuvinte"}
      </p>

      {results.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted dark:bg-slate-900">Niciun cuvânt găsit.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((word) => (
            <li key={word.id} className="flex items-center gap-2 rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              <Link to={`/browse/${word.id}`} className="flex min-h-16 flex-1 flex-col justify-center px-4 py-2">
                <span className="text-lg font-semibold">{italianText(word)}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  {word.ro}
                  <CefrBadge level={word.level} />
                  <LevelBadge level={levels.get(word.id) ?? "new"} />
                </span>
              </Link>
              <div className="pr-2">
                <AudioButton text={italianText(word)} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
