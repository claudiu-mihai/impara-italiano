import { Link } from "react-router-dom";
import type { FeedItem } from "../../../domain/feed/types.ts";
import { useT } from "../../../i18n/index.ts";
import { Lupino } from "../../../ui/mascot/Lupino.tsx";
import { useFeedEnv } from "../feedEnv.ts";
import { CardFrame } from "./CardFrame.tsx";

const linkButton = "min-h-12 rounded-xl border-2 border-brand px-4 py-2 font-semibold text-brand-fg";

/** Bilanțul vizitei la 25, 50, 100… carduri: ce s-a făcut până acum. */
export function MilestoneCard({ item }: { item: Extract<FeedItem, { type: "milestone" }> }) {
  const { t, tp } = useT();
  const { visitStats } = useFeedEnv();
  return (
    <CardFrame>
      <Lupino pose="bravo" size={160} />
      <h2 className="text-3xl font-bold">{tp("feed.milestone.title", item.count)}</h2>
      <ul className="flex flex-col gap-1 text-lg">
        <li>{t("feed.milestone.reviews", { n: visitStats.reviews })}</li>
        <li>{t("feed.milestone.newWords", { n: visitStats.newWords })}</li>
        {/* combo-ul contează de la 2, ca în antet */}
        {visitStats.bestCombo >= 2 && <li>{t("feed.milestone.bestCombo", { n: visitStats.bestCombo })}</li>}
      </ul>
    </CardFrame>
  );
}

/** După ultima repetiție scadentă de azi (o dată pe zi). */
export function ReviewsDoneCard() {
  const { t } = useT();
  return (
    <CardFrame>
      <span aria-hidden="true" className="text-5xl motion-safe:animate-bounce motion-reduce:hidden">
        🎉🎊🎉
      </span>
      <Lupino pose="serie" size={160} />
      <h2 className="text-3xl font-bold">{t("feed.reviewsDoneTitle")}</h2>
      <p className="text-muted">{t("feed.reviewsDoneText")}</p>
    </CardFrame>
  );
}

/** Nu mai e nimic nou de arătat azi; fluxul o ia de la capăt cu ce s-a văzut deja, iar cardul propune o lecție. */
export function EndOfMaterialCard() {
  const { t } = useT();
  return (
    <CardFrame>
      <Lupino pose="pensa" size={160} />
      <h2 className="text-3xl font-bold">{t("feed.endTitle")}</h2>
      <p className="max-w-sm text-muted">{t("feed.endText")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/learn/topics" className={linkButton}>
          {t("feed.endTopics")}
        </Link>
        <Link to="/learn/grammar" className={linkButton}>
          {t("feed.endGrammar")}
        </Link>
      </div>
    </CardFrame>
  );
}
