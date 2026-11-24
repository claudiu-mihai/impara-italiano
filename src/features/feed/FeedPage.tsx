import { useLiveQuery } from "dexie-react-hooks";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useContent } from "../../app/content.tsx";
import { loadFeedProgress, loadFeedSources } from "../../data/feedQueries.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { buildFeedBatch, type FeedSources } from "../../domain/feed/buildFeedBatch.ts";
import type { FeedItem, FeedItemType } from "../../domain/feed/types.ts";
import { useT } from "../../i18n/index.ts";
import { stopSpeaking, unlockAudio } from "../../services/tts.ts";
import { FeedCard } from "./FeedCard.tsx";
import { FeedEnvContext } from "./feedEnv.ts";
import { FeedHeader } from "./FeedHeader.tsx";
import { StartCard } from "./StartCard.tsx";
import { useActiveCard } from "./useActiveCard.ts";

/** Tipurile pe care ecranul știe să le afișeze; etapele următoare ale fluxului le completează. */
export const FEED_TYPES: ReadonlySet<FeedItemType> = new Set<FeedItemType>(["knownWord", "sentence", "rule", "lines", "didYouKnow"]);

/** Când cardul activ ajunge la atâtea carduri de capăt, se cere un lot nou. */
const LOAD_MORE_WITHIN = 5;
/** Câte carduri recente se dau mai departe regulilor de ordine. */
const RECENT_CARDS = 20;

/** Un card pe tot ecranul; cardul activ e cel vizibil în mare parte (vezi `useActiveCard`). */
function CardShell({ type, cardKey, label, active, children }: { type: string; cardKey: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      data-feed-card
      data-feed-type={type}
      data-feed-key={cardKey}
      data-active={active ? "true" : undefined}
      className="h-full snap-start snap-always"
    >
      {children}
    </section>
  );
}

/** Fluxul: carduri scurte pe tot ecranul, derulate vertical, fără sfârșit. */
export function FeedPage() {
  const { t } = useT();
  const content = useContent();
  const settings = useLiveQuery(() => getSettings(db), []);
  const reduceMotion = useReducedMotion();

  const [sources, setSources] = useState<FeedSources>();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reviewTotal, setReviewTotal] = useState<number>();
  const scroller = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<FeedItem[]>([]);
  const shownKeys = useRef(new Set<string>());
  const visit = useRef({ visitStart: Date.now(), shownAt: new Map<string, number>(), quizzed: new Set<string>() });
  const busy = useRef(false);
  const alive = useRef(true);
  const active = useActiveCard(scroller, items.length + 1);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    void loadFeedSources(content).then((loaded) => alive.current && setSources(loaded));
  }, [content]);

  const extend = useCallback(async () => {
    if (!sources || busy.current) return;
    busy.current = true;
    try {
      const now = new Date();
      const progress = await loadFeedProgress(db, content, now);
      if (!alive.current) return;
      setReviewTotal((total) => total ?? progress.dueCount);
      const batch = buildFeedBatch(sources, {
        now,
        level: progress.settings.level,
        queue: progress.queue,
        cards: progress.cards,
        seen: progress.seen,
        visit: { ...visit.current, count: itemsRef.current.length },
        recent: itemsRef.current.slice(-RECENT_CARDS),
        shownKeys: shownKeys.current,
        types: FEED_TYPES,
      });
      for (const item of batch) shownKeys.current.add(item.key);
      itemsRef.current = [...itemsRef.current, ...batch];
      setItems(itemsRef.current);
    } finally {
      busy.current = false;
    }
  }, [sources, content]);

  // primul lot, apoi unul nou când cardul activ se apropie de capăt
  useEffect(() => {
    if (sources && items.length === 0) void extend();
  }, [sources, items.length, extend]);
  useEffect(() => {
    if (items.length > 0 && active - 1 >= items.length - LOAD_MORE_WITHIN) void extend();
  }, [active, items.length, extend]);

  const sentenceById = useMemo(() => new Map((sources?.sentences ?? []).map((s) => [s.id, s])), [sources]);

  const go = useCallback(
    (delta: number) => {
      const root = scroller.current;
      const target = root?.children[Math.max(0, Math.min(active + delta, (root?.children.length ?? 1) - 1))];
      target?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    },
    [active, reduceMotion],
  );

  // după atingerea de start, fluxul trece la primul card când acesta e gata
  useEffect(() => {
    if (started && active === 0 && items.length > 0) go(1);
  }, [started, active, items.length, go]);

  // ↑/↓, PageUp/PageDown și Spațiu derulează cardurile
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === " " && target && ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // sunetul cardului părăsit se oprește înaintea efectelor noului card activ (efectele de layout rulează primele)
  useLayoutEffect(() => {
    stopSpeaking();
  }, [active, muted]);
  useEffect(() => stopSpeaking, []);

  if (!settings) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  const env = sources && { settings, sources, sentenceById, autoplay: started && settings.autoPlayAudio && !muted };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FeedHeader muted={muted} onToggleMute={() => setMuted((m) => !m)} reviews={reviewTotal === undefined ? undefined : { done: 0, total: reviewTotal }} />
      <div ref={scroller} role="region" aria-label={t("feed.title")} tabIndex={0} className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
        <CardShell type="start" cardKey="start" label={t("feed.card", { n: 1 })} active={active === 0}>
          <StartCard
            onStart={() => {
              unlockAudio();
              setStarted(true);
            }}
          />
        </CardShell>
        {env && (
          <FeedEnvContext.Provider value={env}>
            {items.map((item, i) => (
              <CardShell key={item.key} type={item.type} cardKey={item.key} label={t("feed.card", { n: i + 2 })} active={active === i + 1}>
                <FeedCard item={item} active={active === i + 1} />
              </CardShell>
            ))}
          </FeedEnvContext.Provider>
        )}
      </div>
    </div>
  );
}
