import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { loadStats } from "../../data/queries.ts";
import { LEVEL_NAME } from "../../domain/content/levels.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
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
const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

function ProgressLine({ label, mastered, learned, total }: { label: string; mastered: number; learned: number; total?: number }) {
  const { t, rich } = useT();
  return (
    <div className="mt-3">
      <p>
        {rich(total !== undefined ? "stats.progressLineTotal" : "stats.progressLine", {
          label,
          mastered: <strong>{mastered}</strong>,
          total: total ?? 0,
          learning: learned - mastered,
        })}
      </p>
      {total !== undefined && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={mastered}
          aria-label={t("stats.masteredAria", { label })}
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full bg-brand" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} />
        </div>
      )}
    </div>
  );
}

export function StatsPage() {
  const { t, tp } = useT();
  const content = useContent();
  const [days, setDays] = useState<7 | 30>(7);
  const stats = useLiveQuery(() => loadStats(db, content, days), [content, days]);
  const settings = useLiveQuery(() => getSettings(db), []);

  if (!stats) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  const total = content.words.length;
  const totalReviews = stats.daily.reduce((sum, d) => sum + d.reviews, 0);
  const newCards = stats.daily.reduce((sum, d) => sum + d.newCards, 0);
  const calendarDays = stats.calendar.flat().filter((d) => d.reviews > 0).length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">{t("nav.stats")}</h1>

      <section className={card} aria-labelledby="streak">
        <h2 id="streak" className={heading}>
          {t("stats.streakTitle")}
        </h2>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-4xl font-bold" data-testid="streak">
            {stats.streak} <span className="text-lg font-normal text-muted">{tp("common.days", stats.streak)} 🔥</span>
          </p>
          {stats.streak > 0 && (
            <span className="flex items-center gap-2 text-right">
              <span className="text-sm text-muted">
                <span lang="it" className="block font-semibold text-slate-900 dark:text-slate-100">
                  Continua così!
                </span>
                <span lang={NATIVE_LANGUAGE}>{t("stats.keepGoing")}</span>
              </span>
              <Lupino pose="serie" size={72} />
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          {t("stats.todayOf", { n: stats.todayReviews, total: MIN_REVIEWS_FOR_STREAK })}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <dt className="text-sm text-muted">{t("stats.longest")}</dt>
            <dd className="text-2xl font-bold" data-testid="longest-streak">
              {stats.longestStreak} <span className="text-base font-normal text-muted">{tp("common.days", stats.longestStreak)} 🏆</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("stats.studyDays")}</dt>
            <dd className="text-2xl font-bold" data-testid="active-days">
              {stats.activeDays} <span className="text-base font-normal text-muted">{tp("common.days", stats.activeDays)} 📅</span>
            </dd>
          </div>
        </dl>
        {stats.firstDay && <p className="mt-3 text-sm text-muted">{t("stats.since", { date: fullDate(stats.firstDay) })}</p>}
      </section>

      <section className={card} aria-labelledby="calendar">
        <h2 id="calendar" className={heading}>
          {t("stats.calendar")}
        </h2>
        <div className="mt-4">
          <ActivityCalendar
            weeks={stats.calendar}
            ariaLabel={tp("stats.calendarAria", calendarDays, { weeks: CALENDAR_WEEKS })}
          />
        </div>
      </section>

      <section className={card} aria-labelledby="progress">
        <h2 id="progress" className={heading}>
          {t("home.progress")}
        </h2>
        <ProgressLine label={t("stats.words")} mastered={stats.vocab.mastered} learned={stats.vocab.learned} total={total} />
        <ProgressLine label={t("stats.conjugations")} mastered={stats.conj.mastered} learned={stats.conj.learned} />
      </section>

      <section className={card} aria-labelledby="levels">
        <h2 id="levels" className={heading}>
          {t("about.levels")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("stats.levelsNote")}</p>
        <ul className="mt-3 flex flex-col gap-4">
          {stats.levels.map((l) => (
            <li key={l.level}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span>
                  <strong>{l.level}</strong> · {t(LEVEL_NAME[l.level])}
                  {settings?.level === l.level && <span className="ml-2 text-brand-fg">{t("stats.currentLevel")}</span>}
                </span>
                <span className="text-muted">
                  {l.total === 0 ? t("stats.comingSoon") : t("stats.levelLine", { started: l.started, mastered: l.mastered, total: l.total })}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t("stats.levelAria", { level: l.level })}
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
          {t("stats.byProgress")}
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
                <span className="text-sm text-muted">{t(LEVEL_LABEL[progress])}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="words-categories">
        <h2 id="words-categories" className={heading}>
          {t("stats.byCategory")}
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
                  <span className="block font-semibold capitalize">{t(POS_LABEL[c.pos])}</span>
                  <span className="block text-sm text-muted">
                    {t("stats.categoryLine", { mastered: c.mastered, learning: c.learning })}
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
            {t("stats.activity")}
          </h2>
          <div role="group" aria-label={t("stats.period")} className="flex gap-1">
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
                {t("stats.periodDays", { n })}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <BarChart
            ariaLabel={t("stats.activityAria", { days, total: totalReviews })}
            labelEvery={days === 7 ? 1 : 5}
            bars={stats.daily.map((d) => ({
              label: dayLabel(d.day),
              value: d.reviews,
              title: tp("calendar.day", d.reviews, { day: dayLabel(d.day) }),
            }))}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {t("stats.summary", { reviews: totalReviews, fresh: newCards })}
          {stats.accuracy !== null && <> · {t("stats.accuracy", { n: stats.accuracy })}</>}
        </p>
      </section>

      <section className={card} aria-labelledby="forecast">
        <h2 id="forecast" className={heading}>
          {t("stats.forecast")}
        </h2>
        <div className="mt-4">
          <BarChart
            ariaLabel={t("stats.forecastAria", { list: stats.forecast.map((f) => f.due).join(", ") })}
            bars={stats.forecast.map((f, i) => ({
              label: i === 0 ? t("stats.today") : dayLabel(f.day),
              value: f.due,
              title: i === 0 ? t("stats.todayDue", { n: f.due }) : t("stats.dayDue", { day: dayLabel(f.day), n: f.due }),
            }))}
          />
        </div>
      </section>
    </div>
  );
}
