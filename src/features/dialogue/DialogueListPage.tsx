import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { useDialogues } from "../../app/dialogues.ts";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { LEVELS } from "../../domain/content/constants.ts";
import { dialogueCardId } from "../../domain/dialogue/due.ts";
import { useT } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { ReviewStatus } from "../grammar/ReviewStatus.tsx";

/** Toate dialogurile, grupate pe nivel, cu tema și starea repetiției. */
export function DialogueListPage() {
  const { t, rich } = useT();
  const dialogues = useDialogues();
  const topics = useTopics();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("skill").toArray(), []);

  if (!dialogues || !topics || !cards) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  const byId = new Map(cards.map((c) => [c.cardId, c]));

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label={t("learn.title")} />
      <h1 className="text-2xl font-bold">{t("dialogue.listTitle")}</h1>
      {LEVELS.filter((level) => dialogues.some((d) => d.level === level)).map((level) => (
        <section key={level} aria-labelledby={`dialogues-${level}`} className="flex flex-col gap-2">
          <h2 id={`dialogues-${level}`} className="flex items-center gap-2 text-base font-semibold text-slate-700 dark:text-slate-200">
            <CefrBadge level={level} /> {t(`level.${level}`)}
          </h2>
          <ul className="flex flex-col gap-2">
            {dialogues
              .filter((d) => d.level === level)
              .map((d) => {
                const topic = topics.find((x) => x.id === d.topicId);
                return (
                  <li key={d.id}>
                    <Link
                      to={`/learn/topics/${d.topicId}/dialogue/${d.id}`}
                      className="flex min-h-16 flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
                    >
                      <span className="text-lg font-semibold">
                        <span aria-hidden="true">💬 </span>
                        <BilingualLabel text={d.title} />
                      </span>
                      {topic && <span className="text-sm text-muted">{rich("dialogue.topic", { title: <span lang="it">{topic.title.it}</span> })}</span>}
                      <ReviewStatus card={byId.get(dialogueCardId(d.id))} compact testId="dialogue-review" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
