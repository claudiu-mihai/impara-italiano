import type { FeedItem } from "../../domain/feed/types.ts";
import { DidYouKnowCard, KnownWordCard, LinesCard, RuleCard, SentenceCard } from "./cards/PassiveCards.tsx";

/** Alege componenta unui card după tipul lui; tipurile pe care ecranul nu le afișează (încă) rămân goale. */
export function FeedCard({ item, active }: { item: FeedItem; active: boolean }) {
  switch (item.type) {
    case "knownWord":
      return <KnownWordCard item={item} active={active} />;
    case "sentence":
      return <SentenceCard item={item} active={active} />;
    case "rule":
      return <RuleCard item={item} active={active} />;
    case "lines":
      return <LinesCard item={item} active={active} />;
    case "didYouKnow":
      return <DidYouKnowCard item={item} active={active} />;
    default:
      return null;
  }
}
