import { useContent } from "../../app/content.tsx";
import { APP_VERSION } from "../../app/version.ts";

export function AboutPage() {
  const { meta } = useContent();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">Despre</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">Aplicație</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Impara l&apos;Italiano · versiune <span data-testid="app-version">{APP_VERSION}</span>
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">Date</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {meta.wordCount} cuvinte · versiune {meta.dataVersion} · generat la {meta.generatedAt}
        </p>
        {meta.rankBasis === "provisional" && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Ordinea cuvintelor este provizorie; va fi recalculată pe baza listelor de frecvență.
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">Surse</h2>
        {meta.sources.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Nicio listă externă de frecvență nu este folosită încă.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {meta.sources.map((s) => (
              <li key={s.name}>
                <a href={s.url} className="text-brand-fg underline" target="_blank" rel="noreferrer">
                  {s.name}
                </a>{" "}
                <span className="text-sm text-muted">
                  ({s.license}) — {s.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">Niveluri</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Nivelurile CEFR (A1–C2) ale cuvintelor sunt <strong>estimate</strong> din frecvența lor în limba vorbită și
          scrisă, cu corecturi manuale; nu provin dintr-o listă oficială. Nivelul timpurilor verbale urmează programele
          uzuale de italiană.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">Algoritm</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Repetiția spațiată folosește FSRS, prin biblioteca ts-fsrs (open-spaced-repetition, licență MIT).
        </p>
      </section>
    </div>
  );
}
