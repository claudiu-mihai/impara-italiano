import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings, saveSettings } from "../../data/db/repositories.ts";
import { loadStats, loadStudyOverview } from "../../data/queries.ts";
import { LEVEL_NAME, nextLevel } from "../../domain/content/levels.ts";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { masteryByWord } from "../../domain/srs/mastery.ts";
import { dueSkillTopics } from "../../domain/topics/topics.ts";

const BACKUP_REMINDER_DAYS = 14;

export function HomePage() {
  const content = useContent();
  const overview = useLiveQuery(() => loadStudyOverview(db, content), [content]);
  const cards = useLiveQuery(() => db.cards.toArray(), []);
  const stats = useLiveQuery(() => loadStats(db, content, 7), [content]);
  const lastExport = useLiveQuery(async () => (await db.meta.get("lastExportAt"))?.value as string | undefined, []);
  // `undefined` până se citește; reamintirea se arată doar când se știe sigur că nu există cont
  const signedIn = useLiveQuery(async () => (await db.meta.get("syncUserId")) !== undefined, []);

  const topics = useTopics();
  const dueSkills = topics && cards ? dueSkillTopics(topics, cards, new Date()) : [];

  const total = content.words.length;
  const levels = cards ? [...masteryByWord(cards).values()] : [];
  const mastered = levels.filter((l) => l === "mastered").length;
  const learning = levels.length;
  const todo = overview?.queue.length ?? 0;

  // Sugestie (nu schimbare automată): când ai început toate cuvintele nivelului curent, propune următorul nivel.
  const level = overview?.settings.level;
  const next = level ? nextLevel(level) : undefined;
  const current = stats?.levels.find((l) => l.level === level);
  const upcoming = stats?.levels.find((l) => l.level === next);
  const canAdvance =
    !!current && !!next && !!upcoming && current.total > 0 && current.started === current.total && upcoming.total > 0;
  const advance = async () => {
    if (next) await saveSettings(db, { ...(await getSettings(db)), level: next });
  };

  // Amintește de backup dacă există progres, nu s-a făcut niciun backup recent și progresul nu se sincronizează
  // cu un cont (cu cont, progresul este și pe server, deci un backup nu mai este necesar).
  const daysSinceExport = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86_400_000 : Infinity;
  const needsBackup = signedIn === false && (cards?.length ?? 0) > 0 && daysSinceExport > BACKUP_REMINDER_DAYS;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <header>
        <h1 className="text-3xl font-bold">Impara l'Italiano</h1>
        <p className="mt-1 text-muted">Învață italiana, puțin în fiecare zi.</p>
        {level && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <CefrBadge level={level} /> Nivel curent: {LEVEL_NAME[level]}
          </p>
        )}
        {stats && stats.streak > 0 && (
          <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            🔥 {stats.streak} {stats.streak === 1 ? "zi" : "zile"} la rând
          </p>
        )}
      </header>

      {canAdvance && next && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900" aria-label="Următorul nivel">
          <p>
            Ai început toate cele {current!.total} cuvinte din <strong>{level}</strong>. Vrei să treci la{" "}
            <strong>{next}</strong> ({LEVEL_NAME[next]})?
          </p>
          <button
            type="button"
            onClick={() => void advance()}
            className="mt-3 min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg"
          >
            Treci la {next}
          </button>
        </section>
      )}

      {needsBackup && (
        <Link
          to="/settings"
          className="rounded-2xl bg-amber-100 p-4 text-sm text-amber-950"
        >
          Progresul tău este doar pe acest dispozitiv. <strong>Fă un backup</strong> din Setări.
        </Link>
      )}

      <section aria-labelledby="today" className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 id="today" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Astăzi
        </h2>
        {overview ? (
          <>
            <p className="mt-3 text-lg">
              <strong>{overview.dueCount}</strong> {overview.dueCount === 1 ? "repetiție" : "repetiții"} ·{" "}
              <strong>{overview.newCount}</strong> {overview.newCount === 1 ? "cuvânt nou" : "cuvinte noi"}
            </p>
            {todo > 0 ? (
              <Link
                to="/learn/vocab"
                className="mt-5 flex min-h-14 items-center justify-center rounded-xl bg-brand text-lg font-semibold text-white active:bg-brand-dark"
              >
                Începe sesiunea
              </Link>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-100 p-4 text-center dark:bg-slate-800">
                Ai terminat pentru azi. 🎉
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-muted">Se încarcă…</p>
        )}
      </section>

      {dueSkills.length > 0 && (
        <section aria-labelledby="skills" className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 id="skills" className="text-sm font-semibold uppercase tracking-wide text-muted">
            Abilități de repetat
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {dueSkills.map((topic) => (
              <li key={topic.id}>
                <Link
                  to={`/learn/topics/${topic.id}/${topic.skill === "clock" ? "clock" : "numbers"}`}
                  className="flex min-h-12 items-center rounded-xl bg-slate-100 px-4 font-semibold dark:bg-slate-800"
                >
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="progress" className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 id="progress" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Progres
        </h2>
        <p className="mt-3">
          Stăpânite: <strong>{mastered}</strong> din {total} · în învățare: <strong>{learning - mastered}</strong>
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={mastered}
          aria-label="Cuvinte stăpânite"
          className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full bg-brand" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} />
        </div>
      </section>
    </div>
  );
}
