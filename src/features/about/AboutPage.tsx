import { useContent } from "../../app/content.tsx";
import { APP_VERSION } from "../../app/version.ts";
import { useT } from "../../i18n/index.ts";

export function AboutPage() {
  const { meta } = useContent();
  const { t, rich } = useT();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">{t("about.title")}</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">{t("about.app")}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {rich("about.version", { version: <span data-testid="app-version">{APP_VERSION}</span> })}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">{t("about.data")}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {t("about.dataLine", { count: meta.wordCount, version: meta.dataVersion, date: meta.generatedAt })}
        </p>
        {meta.rankBasis === "provisional" && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            {t("about.provisional")}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">{t("about.sources")}</h2>
        {meta.sources.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {t("about.noSources")}
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
        <h2 className="font-semibold">{t("about.levels")}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {rich("about.levelsText", { estimated: <strong>{t("about.estimated")}</strong> })}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-semibold">{t("about.algorithm")}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {t("about.algorithmText")}
        </p>
      </section>
    </div>
  );
}
