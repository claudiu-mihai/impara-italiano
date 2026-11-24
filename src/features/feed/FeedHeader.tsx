import { Link } from "react-router-dom";
import { useT } from "../../i18n/index.ts";
import { useReturnToOrigin } from "../../ui/useReturnToOrigin.ts";

interface FeedHeaderProps {
  muted: boolean;
  onToggleMute: () => void;
  /** Repetițiile făcute în vizită și cele scadente la intrare; `undefined` cât timp se calculează. */
  reviews: { done: number; total: number } | undefined;
}

/** Antetul fix al fluxului: ieșire, progresul repetițiilor de azi și sunetul vizitei. */
export function FeedHeader({ muted, onToggleMute, reviews }: FeedHeaderProps) {
  const { t } = useT();
  const onExit = useReturnToOrigin(true);
  const reviewsDone = reviews && reviews.done >= reviews.total;
  return (
    <header className="flex shrink-0 items-center gap-2 px-3 pt-3">
      <Link to="/" onClick={onExit} aria-label={t("feed.close")} className="flex size-12 items-center justify-center text-2xl compact:size-10">
        ✕
      </Link>
      <p className="flex-1 text-center text-sm font-semibold text-muted">
        {reviews && (reviewsDone ? t("feed.reviewsDone") : t("feed.reviewsProgress", { done: reviews.done, total: reviews.total }))}
      </p>
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
