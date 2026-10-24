import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { loadStats } from "../../data/queries.ts";
import { LEVEL_NAME } from "../../domain/content/levels.ts";
import { POS_ICON, POS_LABEL, LEVEL_LABEL } from "../../domain/content/display.ts";
import { browseHref } from "../../domain/browse/filterWords.ts";
import type { Mastery } from "../../domain/srs/mastery.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { MIN_REVIEWS_FOR_STREAK } from "../../domain/stats/stats.ts";
import { ActivityCalendar } from "../../ui/ActivityCalendar.tsx";
import { BarChart } from "../../ui/BarChart.tsx";
import { Lupino } from "../../ui/mascot/Lupino.tsx";
import { CALENDAR_WEEKS } from "../../domain/stats/stats.ts";

const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const fullDate = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
const PROGRESS_ORDER: Mastery[] = ["new", "learning", "mastered"];
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

function ProgressLine({ label, mastered, learned, total }: { label: string; mastered: number; learned: number; total?: number }) {
  return (
    <div className="mt-3">
      <p>
        {label}: <strong>{mastered}</strong> stăpânite
        {total !== undefined && <> din {total}</>} · {learned - mastered} în învățare
      </p>
      {total !== undefined && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={mastered}
          aria-label={`${label} stăpânite`}
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full bg-brand" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} />
        </div>
      )}
    </div>
  );
}

export function StatsPage() {
  const content = useContent();
  const [days, setDays] = useState<7 | 30>(7);
  const stats = useLiveQuery(() => loadStats(db, content, days), [content, days]);
  const settings = useLiveQuery(() => getSettings(db), []);

  if (!stats) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  const total = content.words.length;
  const totalReviews = stats.daily.reduce((sum, d) => sum + d.reviews, 0);
  const newCards = stats.daily.reduce((sum, d) => sum + d.newCards, 0);
  const calendarDays = stats.calendar.flat().filter((d) => d.reviews > 0).length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">Statistici</h1>

      <section className={card} aria-labelledby="streak">
        <h2 id="streak" className={heading}>
          Serie de zile
        </h2>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-4xl font-bold" data-testid="streak">
            {stats.streak} <span className="text-lg font-normal text-muted">{stats.streak === 1 ? "zi" : "zile"} 🔥</span>
          </p>
          {stats.streak > 0 && (
            <span className="flex items-center gap-2 text-right">
              <span className="text-sm text-muted">
                <span lang="it" className="block font-semibold text-slate-900 dark:text-slate-100">
                  Continua così!
                </span>
                Ține-o tot așa!
              </span>
              <Lupino pose="serie" size={72} />
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Azi: {stats.todayReviews} din {MIN_REVIEWS_FOR_STREAK} repetiții necesare pentru serie.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <dt className="text-sm text-muted">Cea mai lungă serie</dt>
            <dd className="text-2xl font-bold" data-testid="longest-streak">
              {stats.longestStreak} <span className="text-base font-normal text-muted">{plural(stats.longestStreak, "zi", "zile")} 🏆</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Zile de studiu</dt>
            <dd className="text-2xl font-bold" data-testid="active-days">
              {stats.activeDays} <span className="text-base font-normal text-muted">{plural(stats.activeDays, "zi", "zile")} 📅</span>
            </dd>
          </div>
        </dl>
        {stats.firstDay && <p className="mt-3 text-sm text-muted">Înveți din {fullDate(stats.firstDay)}.</p>}
      </section>

      <section className={card} aria-labelledby="calendar">
        <h2 id="calendar" className={heading}>
          Calendar de activitate
        </h2>
        <div className="mt-4">
          <ActivityCalendar
            weeks={stats.calendar}
            ariaLabel={`Activitate în ultimele ${CALENDAR_WEEKS} săptămâni: ${calendarDays} ${plural(calendarDays, "zi", "zile")} cu repetiții`}
          />
        </div>
      </section>

      <section className={card} aria-labelledby="progress">
        <h2 id="progress" className={heading}>
          Progres
        </h2>
        <ProgressLine label="Cuvinte" mastered={stats.vocab.mastered} learned={stats.vocab.learned} total={total} />
        <ProgressLine label="Conjugări (verb × timp)" mastered={stats.conj.mastered} learned={stats.conj.learned} />
      </section>

      <section className={card} aria-labelledby="levels">
        <h2 id="levels" className={heading}>
          Niveluri
        </h2>
        <p className="mt-1 text-xs text-muted">Niveluri CEFR estimate din frecvența cuvintelor.</p>
        <ul className="mt-3 flex flex-col gap-4">
          {stats.levels.map((l) => (
            <li key={l.level}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span>
                  <strong>{l.level}</strong> · {LEVEL_NAME[l.level]}
                  {settings?.level === l.level && <span className="ml-2 text-brand-fg">(nivel curent)</span>}
                </span>
                <span className="text-muted">
                  {l.total === 0 ? "în pregătire" : `${l.started} începute · ${l.mastered} stăpânite din ${l.total}`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Nivelul ${l.level}: cuvinte începute`}
                aria-valuemin={0}
                aria-valuemax={l.total}
                aria-valuenow={l.started}
                className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-brand/40"
                  style={{ width: `${l.total ? (l.started / l.total) * 100 : 0}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-brand"
                  style={{ width: `${l.total ? (l.mastered / l.total) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="words-progress">
        <h2 id="words-progress" className={heading}>
          Cuvinte după progres
        </h2>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {PROGRESS_ORDER.map((progress) => (
            <li key={progress}>
              <Link
                to={browseHref({ progress })}
                data-testid={`progress-${progress}`}
                className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-slate-100 p-2 text-center active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700"
              >
                <span className="text-2xl font-bold">{stats.progress[progress]}</span>
                <span className="text-sm text-muted">{LEVEL_LABEL[progress]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="words-categories">
        <h2 id="words-categories" className={heading}>
          Cuvinte pe categorii
        </h2>
        <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
          {stats.categories.map((c) => (
            <li key={c.pos}>
              <Link
                to={browseHref({ pos: c.pos })}
                data-testid={`category-${c.pos}`}
                className="flex min-h-14 items-center gap-3 py-2"
              >
                <span aria-hidden="true" className="w-8 text-center text-2xl">
                  {POS_ICON[c.pos]}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold capitalize">{POS_LABEL[c.pos]}</span>
                  <span className="block text-sm text-muted">
                    {c.mastered} stăpânite · {c.learning} în învățare
                  </span>
                </span>
                <span className="text-lg font-bold">{c.total}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="activity">
        <div className="flex items-center justify-between">
          <h2 id="activity" className={heading}>
            Activitate
          </h2>
          <div role="group" aria-label="Perioada" className="flex gap-1">
            {([7, 30] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={days === n}
                onClick={() => setDays(n)}
                className={`min-h-10 rounded-lg px-3 text-sm ${
                  days === n ? "bg-brand text-white" : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {n} zile
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <BarChart
            ariaLabel={`Repetiții pe zi în ultimele ${days} zile: ${totalReviews} în total`}
            labelEvery={days === 7 ? 1 : 5}
            bars={stats.daily.map((d) => ({
              label: dayLabel(d.day),
              value: d.reviews,
              title: `${dayLabel(d.day)}: ${d.reviews} repetiții`,
            }))}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {totalReviews} repetiții · {newCards} carduri noi
          {stats.accuracy !== null && <> · {stats.accuracy}% răspunsuri corecte</>}
        </p>
      </section>

      <section className={card} aria-labelledby="forecast">
        <h2 id="forecast" className={heading}>
          Următoarele 7 zile
        </h2>
        <div className="mt-4">
          <BarChart
            ariaLabel={`Carduri scadente în următoarele 7 zile: ${stats.forecast.map((f) => f.due).join(", ")}`}
            bars={stats.forecast.map((f, i) => ({
              label: i === 0 ? "azi" : dayLabel(f.day),
              value: f.due,
              title: `${i === 0 ? "Azi (inclusiv restanțe)" : dayLabel(f.day)}: ${f.due} carduri`,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
