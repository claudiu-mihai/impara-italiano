import { Link } from "react-router-dom";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { RulesBox } from "../../ui/RulesBox.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

const GAMES = [
  { path: "cards", icon: "🃏", title: "Cartonașe", text: "Întoarce cartonașul și vezi răspunsul" },
  { path: "match", icon: "🔗", title: "Potrivire", text: "Potrivește expresia italiană cu traducerea" },
  { path: "type", icon: "⌨️", title: "Introducere text", text: "Scrie cuvântul care lipsește" },
] as const;

export function GameMenuPage() {
  const { topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Tema nu există.</p>
        <Link to="/learn/games" className="text-brand-fg underline">
          Înapoi la jocuri
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn/games" label="Jocuri" />

      <header className="flex items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold">{topic.title}</h1>
        <CefrBadge level={topic.level} />
      </header>

      <RulesBox rules={topic.rules} />

      <section aria-labelledby="games" className="flex flex-col gap-3">
        <h2 id="games" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Alege jocul
        </h2>
        {GAMES.map((game) => (
          <Link
            key={game.path}
            to={`/learn/games/${topic.id}/${game.path}`}
            className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            <span aria-hidden="true" className="text-3xl">
              {game.icon}
            </span>
            <span className="flex-1">
              <span className="block text-lg font-semibold">{game.title}</span>
              <span className="block text-sm text-muted">{game.text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
