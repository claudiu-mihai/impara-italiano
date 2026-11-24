import { Lupino, type LupinoPose } from "../../ui/mascot/Lupino.tsx";

export interface Reaction {
  /** Se schimbă la fiecare reacție, ca animația să pornească din nou. */
  id: number;
  pose: Extract<LupinoPose, "bravo" | "pensa" | "serie">;
  /** Confetti (la reperele de combo și la „Repetiții gata”). */
  party: boolean;
}

/** Lupino reacționează scurt peste card: bucurie la repere, îngrijorare la o greșeală. Decorativ, nu prinde atingeri. */
export function FeedReaction({ reaction }: { reaction: Reaction | undefined }) {
  if (!reaction) return null;
  return (
    <div key={reaction.id} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
      {reaction.party && <span className="text-6xl motion-safe:animate-bounce motion-reduce:hidden">🎉🎊🎉</span>}
      <Lupino pose={reaction.pose} size={160} className="lupino-react" />
    </div>
  );
}
