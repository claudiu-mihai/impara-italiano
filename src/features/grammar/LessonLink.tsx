import { Link } from "react-router-dom";
import { useGrammar } from "../../app/grammar.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { lessonNavFrom, type LessonOrigin } from "./lessonNav.ts";

/** Link mic către lecția de gramatică potrivită („📘 Regula: …”); nu apare până nu se încarcă temele. */
export function LessonLink({ topicId, from }: { topicId: string; from: LessonOrigin }) {
  const { t } = useT();
  const topic = useGrammar()?.find((g) => g.id === topicId);
  if (!topic) return null;
  return (
    <Link
      to={`/learn/grammar/${topic.id}`}
      state={lessonNavFrom(from)}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-50 px-4 text-sm font-semibold text-brand-fg active:bg-sky-100 dark:bg-slate-800 dark:active:bg-slate-700"
    >
      <span aria-hidden="true">📘</span>
      <span>
        {t("grammar.ruleLink")}: <span lang={NATIVE_LANGUAGE}>{topic.title}</span>
      </span>
    </Link>
  );
}
