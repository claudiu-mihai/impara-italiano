import { Link } from "react-router-dom";
import { useGrammar } from "../../app/grammar.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";

export function GamesPage() {
  const topics = useGrammar();
  if (!topics) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label="Învață" />
      <h1 className="text-2xl font-bold">Jocuri</h1>
      <p className="text-muted">
        Jocuri de gramatică, în ordinea în care e bine să o înveți. Alege o temă, apoi alege jocul.
      </p>

      <ol className="flex flex-col gap-2" aria-label="Temele de gramatică">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              to={`/learn/games/${topic.id}`}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white"
              >
                {topic.order}
              </span>
              <span className="flex-1 text-lg font-semibold">{topic.title}</span>
              <CefrBadge level={topic.level} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
