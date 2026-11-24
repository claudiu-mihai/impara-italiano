import { Link, useLocation } from "react-router-dom";
import { useT } from "../../i18n/index.ts";
import { useReturnToOrigin } from "../../ui/useReturnToOrigin.ts";

interface FeedHeaderProps {
  muted: boolean;
  onToggleMute: () => void;
  /** Repetițiile făcute în vizită și cele scadente la intrare; `undefined` cât timp se calculează. */
  reviews: { done: number; total: number } | undefined;
  /** Răspunsuri corecte la rând; apare de la 2. */
  combo: number;
}

/** Antetul fix al fluxului: ieșire, progresul repetițiilor de azi și sunetul vizitei. */
export function FeedHeader({ muted, onToggleMute, reviews, combo }: FeedHeaderProps) {
  const { t } = useT();
  // pornit direct în Flux („Pornește în Flux”): ✕ duce pe Acasă și o pune în locul Fluxului în istoric
  const startedInFeed = (useLocation().state as { startedInFeed?: boolean } | null)?.startedInFeed === true;
  const onExit = useReturnToOrigin(!startedInFeed);
  const reviewsDone = reviews && reviews.done >= reviews.total;
  return (
    <header className="flex shrink-0 items-center gap-2 px-3 pt-3">
      <Link to="/" replace={startedInFeed} onClick={onExit} aria-label={t("feed.close")} className="flex size-12 items-center justify-center text-2xl compact:size-10">
        ✕
      </Link>
      <p className="flex-1 text-center text-sm font-semibold text-muted">
        {reviews && (reviewsDone ? t("feed.reviewsDone") : t("feed.reviewsProgress", { done: reviews.done, total: reviews.total }))}
      </p>
      {combo >= 2 && <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{t("feed.combo", { n: combo })}</span>}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={t(muted ? "feed.unmute" : "feed.mute")}
        className="flex size-12 items-center justify-center text-2xl compact:size-10"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </header>
  );
}
