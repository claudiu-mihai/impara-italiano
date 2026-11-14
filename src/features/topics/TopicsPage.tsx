import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { TOPIC_GROUPS, type TopicGroup } from "../../domain/content/constants.ts";
import { TOPIC_GROUP_LABEL } from "../../domain/content/display.ts";
import { topicProgress } from "../../domain/topics/topics.ts";
import { useT } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { NativeHelpNotice } from "../../ui/NativeHelpNotice.tsx";
import { loadOpenGroups, saveOpenGroups } from "./openGroups.ts";

export function TopicsPage() {
  const { t, tp } = useT();
  const topics = useTopics();
  // categoriile sunt închise la început; ce deschizi rămâne deschis și la următoarea vizită
  const [open, setOpen] = useState<TopicGroup[]>(loadOpenGroups);
  const setGroupOpen = (group: TopicGroup, isOpen: boolean) => {
    if (open.includes(group) === isOpen) return;
    const next = TOPIC_GROUPS.filter((g) => (g === group ? isOpen : open.includes(g)));
    setOpen(next);
    saveOpenGroups(next);
  };
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);

  if (!topics || !cards) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label={t("nav.learn")} />
      <h1 className="text-2xl font-bold">{t("learn.topics")}</h1>
      <NativeHelpNotice />
      <p className="text-muted">{t("topics.intro")}</p>

      {TOPIC_GROUPS.map((group) => {
        const inGroup = topics.filter((t) => t.group === group);
        if (inGroup.length === 0) return null;
        return (
          <details
            key={group}
            open={open.includes(group)}
            onToggle={(e) => setGroupOpen(group, e.currentTarget.open)}
            className="group flex flex-col gap-2"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl py-2 [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 shrink-0 text-brand-fg transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <h2 id={`group-${group}`} className="flex-1 text-base font-semibold text-slate-700 dark:text-slate-200">
                <BilingualLabel text={TOPIC_GROUP_LABEL[group]} />
              </h2>
              <span className="text-sm text-muted">{tp("topics.count", inGroup.length)}</span>
            </summary>
            {inGroup.map((topic) => {
              const progress = topicProgress(topic, cards);
              return (
                <Link
                  key={topic.id}
                  to={`/learn/topics/${topic.id}`}
                  className="flex min-h-16 flex-col justify-center gap-1 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 text-lg font-semibold">
                      <BilingualLabel text={topic.title} />
                    </span>
                    <CefrBadge level={topic.level} />
                  </span>
                  <span className="text-sm text-muted">
                    {t("topics.progress", { started: progress.started, total: progress.total, mastered: progress.mastered })}
                  </span>
                </Link>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}
