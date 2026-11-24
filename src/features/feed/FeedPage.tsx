import { useLiveQuery } from "dexie-react-hooks";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useContent } from "../../app/content.tsx";
import { loadFeedProgress, loadFeedSources } from "../../data/feedQueries.ts";
import { db } from "../../data/db/instance.ts";
import { getReviewsDoneDay, markFeedSeen, setReviewsDoneDay } from "../../data/feed/feedSeen.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { buildFeedBatch, type FeedSources } from "../../domain/feed/buildFeedBatch.ts";
import { followUpGrid, planFollowUp } from "../../domain/feed/followUp.ts";
import { comboLift, isComboMilestone, isMilestone, nextCombo } from "../../domain/feed/rewards.ts";
import type { FeedItem, FeedItemType } from "../../domain/feed/types.ts";
import type { SessionItem } from "../../domain/session/buildDailySession.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback, vibrate } from "../../services/sound.ts";
import { stopSpeaking, unlockAudio } from "../../services/tts.ts";
import { FeedCard } from "./FeedCard.tsx";
import { FeedEnvContext, type FeedEnv } from "./feedEnv.ts";
import { FeedReaction, type Reaction } from "./FeedReaction.tsx";
import { useFeedRating } from "./useFeedRating.ts";
import { FeedHeader } from "./FeedHeader.tsx";
import { StartCard } from "./StartCard.tsx";
import { useActiveCard } from "./useActiveCard.ts";

/** Tipurile pe care ecranul știe să le afișeze (toate). */
export const FEED_TYPES: ReadonlySet<FeedItemType> = new Set<FeedItemType>([
  "knownWord",
  "sentence",
  "rule",
  "lines",
  "didYouKnow",
  "pack",
  "review",
  "newWord",
  "grid",
  "trueFalse",
  "gap",
  "packQuiz",
  "milestone",
  "reviewsDone",
  "endOfMaterial",
]);
/** Cardurile care nu sunt conținut: nu se numără la bilanț. */
const SPECIAL_TYPES: ReadonlySet<FeedItemType> = new Set<FeedItemType>(["milestone", "reviewsDone", "endOfMaterial"]);

/** Când cardul activ ajunge la atâtea carduri de capăt, se cere un lot nou. */
const LOAD_MORE_WITHIN = 5;
/** Câte carduri recente se dau mai departe regulilor de ordine. */
const RECENT_CARDS = 20;
/** Cât rămâne pe ecran reacția lui Lupino. */
const REACTION_MS = 1300;

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
  const [reviewsDone, setReviewsDone] = useState(0);
  const [newWords, setNewWords] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [reaction, setReaction] = useState<Reaction>();
  const comboRef = useRef(0);
  const reactionId = useRef(0);
  const { rate, gradeFollowUp } = useFeedRating(settings?.retention ?? 0.9);
  const scroller = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<FeedItem[]>([]);
  const shownKeys = useRef(new Set<string>());
  const visit = useRef({ visitStart: Date.now(), shownAt: new Map<string, number>(), quizzed: new Set<string>() });
  const busy = useRef(false);
  const alive = useRef(true);
  const active = useActiveCard(scroller, items.length + 1);
  const activeRef = useRef(0);
  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);
  // repetițiile scadente la intrare și cele notate (pentru „Repetiții gata”), cardurile de conținut văzute (pentru bilanț)
  const reviewTotalRef = useRef<number>(undefined);
  const reviewsDoneRef = useRef(0);
  const celebrated = useRef(false);
  const seenCount = useRef(0);
  // lotul s-a încheiat cu „final de material”: următorul se cere abia când cardul acela ajunge activ
  const endPending = useRef(false);

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
    if (!sources || busy.current || endPending.current) return;
    busy.current = true;
    try {
      const now = new Date();
      const progress = await loadFeedProgress(db, content, now);
      if (!alive.current) return;
      if (reviewTotalRef.current === undefined) {
        reviewTotalRef.current = progress.dueCount;
        setReviewTotal(progress.dueCount);
      }
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
      // după „final de material” cheile se pot repeta: în listă primesc un sufix, ca să rămână unice
      const listed = new Set(itemsRef.current.map((i) => i.key));
      const added = batch.map((item, i) => {
        shownKeys.current.add(item.key);
        return listed.has(item.key) ? { ...item, key: `${item.key}~${itemsRef.current.length + i}` } : item;
      });
      endPending.current = batch.at(-1)?.type === "endOfMaterial";
      itemsRef.current = [...itemsRef.current, ...added];
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

  /** Pune un card special imediat după cardul activ; cardul activ rămâne pe loc. */
  const insertAfterActive = useCallback((item: FeedItem) => {
    const at = activeRef.current;
    itemsRef.current = [...itemsRef.current.slice(0, at), item, ...itemsRef.current.slice(at)];
    setItems(itemsRef.current);
  }, []);

  // „Repetiții gata”, o dată pe zi: după ultima repetiție scadentă de la intrare
  const celebrateReviewsDone = useCallback(async () => {
    if (celebrated.current) return;
    celebrated.current = true;
    const day = studyDayOf(new Date());
    if ((await getReviewsDoneDay(db)) === day || !alive.current) return;
    await setReviewsDoneDay(db, day);
    insertAfterActive({ type: "reviewsDone", key: `reviewsDone:${day}` });
    setReaction({ id: ++reactionId.current, pose: "serie", party: true });
  }, [insertAfterActive]);

  const afterRating = useCallback(
    (key: string, session: SessionItem, isNew: boolean) => {
      if (!isNew) {
        reviewsDoneRef.current++;
        setReviewsDone(reviewsDoneRef.current);
        const total = reviewTotalRef.current;
        if (total && reviewsDoneRef.current >= total) void celebrateReviewsDone();
        return;
      }
      setNewWords((n) => n + 1);
      // după un cuvânt nou notat vine o grilă despre el, la 4–8 carduri
      const word = content.byId(session.wordId);
      const at = itemsRef.current.findIndex((i) => i.key === key);
      const follow = word && followUpGrid(word, session.variant, content.words);
      if (!follow || at < 0 || shownKeys.current.has(follow.key)) return;
      shownKeys.current.add(follow.key);
      itemsRef.current = planFollowUp(itemsRef.current, at, follow);
      setItems(itemsRef.current);
    },
    [content, celebrateReviewsDone],
  );

  const soundEnabled = settings?.soundEnabled ?? true;
  const reportAnswer = useCallback(
    (correct: boolean) => {
      const next = nextCombo(comboRef.current, correct);
      comboRef.current = next;
      setCombo(next);
      setBestCombo((best) => Math.max(best, next));
      playFeedback(correct, soundEnabled, comboLift(next));
      vibrate(correct, soundEnabled);
      const milestone = correct && isComboMilestone(next);
      if (milestone || !correct) setReaction({ id: ++reactionId.current, pose: correct ? "bravo" : "pensa", party: milestone });
    },
    [soundEnabled],
  );
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(undefined), REACTION_MS);
    return () => clearTimeout(timer);
  }, [reaction]);

  const markQuizzed = useCallback((packId: string) => {
    visit.current.quizzed.add(packId);
    void markFeedSeen(db, packId, "quizzed", new Date());
  }, []);

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
      const interactive = !!target && ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(target.tagName);
      const card = scroller.current?.querySelector<HTMLElement>('[data-feed-card][data-active="true"]');
      // Spațiu/Enter dezvăluie răspunsul cardului activ, dacă are unul ascuns; 1–4 aleg nota sau varianta
      if ((event.key === " " || event.key === "Enter") && !interactive) {
        const reveal = card?.querySelector<HTMLElement>("[data-reveal]");
        if (reveal) {
          event.preventDefault();
          reveal.click();
          return;
        }
      }
      if (/^[1-9]$/.test(event.key) && !interactive) {
        const choices = card?.querySelectorAll<HTMLElement>("[data-choice]:not([disabled]), [data-rating] button:not([disabled])");
        const choice = choices?.[Number(event.key) - 1];
        if (choice) {
          event.preventDefault();
          choice.click();
        }
        return;
      }
      if (event.key === " " && interactive) return;
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

  // un item din pachet devine „văzut” când ajunge activ: nu mai revine 3 zile, iar testul lui poate apărea după 10 carduri
  useEffect(() => {
    const item = itemsRef.current[active - 1];
    if (item?.type !== "pack" || visit.current.shownAt.has(item.packId)) return;
    visit.current.shownAt.set(item.packId, active - 1);
    void markFeedSeen(db, item.packId, "shown", new Date());
  }, [active]);

  // bilanțul: când al 25-lea, al 50-lea… card de conținut ajunge activ, după el vine cardul de bilanț
  useEffect(() => {
    const seen = itemsRef.current.slice(0, active).filter((i) => !SPECIAL_TYPES.has(i.type)).length;
    if (seen <= seenCount.current) return;
    const from = seenCount.current;
    seenCount.current = seen;
    // la o derulare rapidă se pot sări carduri: contează reperul cel mai mare trecut acum
    for (let n = seen; n > from; n--) {
      if (isMilestone(n)) {
        insertAfterActive({ type: "milestone", key: `milestone:${n}`, count: n });
        break;
      }
    }
  }, [active, insertAfterActive]);

  // „final de material” ajuns activ: vizita o ia de la capăt cu ce s-a văzut (regulile de ordine păstrează cardurile recente)
  useEffect(() => {
    if (itemsRef.current[active - 1]?.type !== "endOfMaterial" || !endPending.current) return;
    endPending.current = false;
    shownKeys.current.clear();
    void extend();
  }, [active, extend]);

  // sunetul cardului părăsit se oprește înaintea efectelor noului card activ (efectele de layout rulează primele)
  useLayoutEffect(() => {
    stopSpeaking();
  }, [active, muted]);
  useEffect(() => stopSpeaking, []);

  if (!settings) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  const env: FeedEnv | undefined = sources && {
    settings,
    sources,
    sentenceById,
    autoplay: started && settings.autoPlayAudio && !muted,
    rate,
    afterRating,
    gradeFollowUp,
    reportAnswer,
    markQuizzed,
    visitStats: { reviews: reviewsDone, newWords, bestCombo },
  };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FeedHeader muted={muted} onToggleMute={() => setMuted((m) => !m)} reviews={reviewTotal === undefined ? undefined : { done: reviewsDone, total: reviewTotal }} combo={combo} />
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
      <FeedReaction reaction={reaction} />
    </div>
  );
}
