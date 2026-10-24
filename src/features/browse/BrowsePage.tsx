import { useLiveQuery } from "dexie-react-hooks";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { filterWords, filtersFromSearch, NO_FILTERS, presentCategories, type BrowseFilters } from "../../domain/browse/filterWords.ts";
import type { Pos } from "../../domain/content/constants.ts";
import { POS } from "../../domain/content/constants.ts";
import { italianText, LEVEL_LABEL, POS_ICON, POS_LABEL } from "../../domain/content/display.ts";
import type { CoreWord } from "../../domain/content/types.ts";
import { LEVEL_GROUP_LABEL, LEVEL_GROUPS } from "../../domain/content/levels.ts";
import { masteryByWord, type Mastery } from "../../domain/srs/mastery.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { LevelBadge } from "./LevelBadge.tsx";

const control = "min-h-12 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";

/** Câte cuvinte se afișează deodată; restul se adaugă pe măsură ce derulezi (sau la butonul „Arată mai multe”). */
const PAGE_SIZE = 40;

/** Un rând al listei; memoizat, ca la schimbarea filtrelor sau a progresului să nu se redeseneze rândurile neschimbate. */
const WordRow = memo(function WordRow({ word, mastery }: { word: CoreWord; mastery: Mastery }) {
  const text = italianText(word);
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-white shadow-sm dark:bg-slate-900">
      <Link to={`/browse/${word.id}`} className="flex min-h-16 flex-1 flex-col justify-center px-4 py-2">
        <span className="text-lg font-semibold">{text}</span>
        <span className="flex items-center gap-2 text-sm text-muted">
          {word.ro}
          <CefrBadge level={word.level} />
          <LevelBadge level={mastery} />
        </span>
      </Link>
      <div className="pr-2">
        <AudioButton text={text} size="sm" />
      </div>
    </li>
  );
});

/**
 * Filtrul de nivel: trei butoane, A · B · C (grupe de niveluri CEFR), cel mult unul activ. Apăsarea celui activ îl
 * deselectează; fără niciunul activ se afișează toate nivelurile.
 */
function LevelButtons({ value, onChange }: { value: BrowseFilters["cefr"]; onChange: (cefr: BrowseFilters["cefr"]) => void }) {
  return (
    <div role="group" aria-label="Nivel CEFR" className="grid grid-cols-3 gap-1">
      {LEVEL_GROUPS.map((group) => {
        const active = group === value;
        return (
          <button
            key={group}
            type="button"
            aria-label={LEVEL_GROUP_LABEL[group]}
            title={LEVEL_GROUP_LABEL[group]}
            aria-pressed={active}
            onClick={() => onChange(active ? "all" : group)}
            className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
              active
                ? "border-brand bg-brand/10 text-brand-fg"
                : "border-transparent bg-white active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
            }`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}

/** Filtrul de categorie: o iconiță pe categorie, cu numele ca etichetă accesibilă și ca tooltip. */
function CategoryIcons({
  categories,
  value,
  onChange,
}: {
  categories: readonly Pos[];
  value: BrowseFilters["pos"];
  onChange: (pos: BrowseFilters["pos"]) => void;
}) {
  const options: { value: BrowseFilters["pos"]; icon: string; label: string }[] = [
    { value: "all", icon: "🗂️", label: "Toate categoriile" },
    ...categories.map((pos) => ({ value: pos, icon: POS_ICON[pos], label: POS_LABEL[pos] })),
  ];
  const current = options.find((o) => o.value === value);
  return (
    <div>
      <div role="group" aria-label="Categorie" className="grid grid-cols-6 gap-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-label={o.label}
              title={o.label}
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex min-h-12 items-center justify-center rounded-xl border-2 text-2xl ${
                active
                  ? "border-brand bg-brand/10"
                  : "border-transparent bg-white active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
              }`}
            >
              <span aria-hidden="true">{o.icon}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden="true">
        {current?.label}
      </p>
    </div>
  );
}

/**
 * Ultimele filtre folosite, ținute cât timp aplicația rămâne deschisă: după ce intri pe un cuvânt și te întorci în
 * Dicționar (cu „Înapoi” sau din meniu), filtrele rămân cum le-ai lăsat.
 */
let lastFilters: BrowseFilters = NO_FILTERS;

/** Pagina se reia (filtre din adresă) când adresa se schimbă, de exemplu dintr-un link din Statistici. */
export function BrowsePage() {
  const [params] = useSearchParams();
  return <BrowseView key={params.toString()} />;
}

function BrowseView() {
  const content = useContent();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);
  // filtrele pot veni din adresă (linkurile din Statistici: /browse?pos=verb&progress=learning)
  const [params] = useSearchParams();
  // fără filtre în adresă (ex. din meniu sau din „Înapoi”) se reiau ultimele filtre folosite
  const [filters, setFilters] = useState<BrowseFilters>(() =>
    params.size > 0 ? filtersFromSearch(params) : lastFilters,
  );
  useEffect(() => {
    lastFilters = filters;
  }, [filters]);

  const levels = useMemo(() => masteryByWord(cards ?? []), [cards]);
  // în ordinea fixă a categoriilor, ca iconițele să nu-și schimbe locul
  const categories = useMemo(() => {
    const present = new Set(presentCategories(content.words));
    return POS.filter((pos) => present.has(pos));
  }, [content.words]);
  const results = useMemo(() => filterWords(content.words, filters, levels), [content.words, filters, levels]);

  // listă incrementală: 2000+ de rânduri deodată încarcă inutil pagina; se adaugă încă o pagină când ajungi la sfârșit
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [filters]);
  const sentinel = useRef<HTMLDivElement>(null);
  const more = results.length > shown;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE_SIZE);
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [more, shown]);

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

      <CategoryIcons categories={categories} value={filters.pos} onChange={(pos) => setFilters({ ...filters, pos })} />

      <LevelButtons value={filters.cefr} onChange={(cefr) => setFilters({ ...filters, cefr })} />

      {filters.progress !== "all" && (
        <button
          type="button"
          onClick={() => setFilters({ ...filters, progress: "all" })}
          aria-label={`Scoate filtrul Progres: ${LEVEL_LABEL[filters.progress]}`}
          className="flex min-h-12 w-fit items-center gap-2 rounded-full border-2 border-brand bg-brand/10 pl-4 pr-3 text-sm font-semibold text-brand-fg"
        >
          Progres: {LEVEL_LABEL[filters.progress]}
          <span aria-hidden="true" className="text-base">
            ✕
          </span>
        </button>
      )}

      <p className="text-sm text-muted" role="status">
        {results.length} {results.length === 1 ? "cuvânt" : "cuvinte"}
      </p>

      {results.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted dark:bg-slate-900">Niciun cuvânt găsit.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {results.slice(0, shown).map((word) => (
              <WordRow key={word.id} word={word} mastery={levels.get(word.id) ?? "new"} />
            ))}
          </ul>
          {more && (
            <div ref={sentinel}>
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="min-h-12 w-full rounded-xl bg-white text-sm font-semibold text-brand-fg shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
              >
                Arată mai multe ({results.length - shown} rămase)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
