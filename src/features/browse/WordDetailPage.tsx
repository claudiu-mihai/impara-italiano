import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { useConjugations } from "../../app/conjugations.ts";
import { useTopics } from "../../app/topics.ts";
import { topicWordIds } from "../../domain/topics/topics.ts";
import { useWordDetails } from "../../app/wordDetails.ts";
import { db } from "../../data/db/instance.ts";
import { forgetWord, getSettings, markWordKnown } from "../../data/db/repositories.ts";
import { italianText, POS_LABEL, TENSE_LABEL } from "../../domain/content/display.ts";
import { TENSES } from "../../domain/content/constants.ts";
import { masteryOf } from "../../domain/srs/mastery.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { ConjugationTable } from "../../ui/ConjugationTable.tsx";
import { LevelBadge } from "./LevelBadge.tsx";

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

export function WordDetailPage() {
  const { id = "" } = useParams();
  const conjugations = useConjugations();
  const details = useWordDetails();
  const topics = useTopics();
  const word = details?.get(id);
  const cards = useLiveQuery(() => db.cards.where("wordId").equals(id).toArray(), [id]);
  const settings = useLiveQuery(() => getSettings(db), []);

  if (!details) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  if (!word) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Cuvântul nu există în dicționar.</p>
        <Link to="/browse" className="text-brand-fg underline">
          Înapoi la dicționar
        </Link>
      </div>
    );
  }

  const inTopics = (topics ?? []).filter((topic) => topicWordIds(topic).includes(word.id));
  const vocabCards = (cards ?? []).filter((c) => c.kind === "vocab");
  const level = masteryOf(vocabCards);
  const text = italianText(word);
  const forms = conjugations?.[word.id];
  const tenses = TENSES.filter((t) => forms?.[t]);

  const known = async () => {
    const settings = await getSettings(db);
    await markWordKnown(db, word.id, new Date(), settings.retention);
  };
  const forget = async () => {
    if (window.confirm(`Ștergi progresul pentru „${text}”?`)) await forgetWord(db, word.id);
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <Link to="/browse" className="flex min-h-12 items-center text-brand-fg underline">
        ← Dicționar
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-muted">{POS_LABEL[word.pos]}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">{text}</h1>
          <AudioButton text={text} />
        </div>
        <p className="text-xl text-slate-600 dark:text-slate-300">{word.ro}</p>
        <div className="flex items-center gap-2">
          <CefrBadge level={word.level} />
          <LevelBadge level={level} />
        </div>
      </header>

      {inTopics.length > 0 && (
        <p className="text-sm">
          {inTopics.map((topic) => (
            <Link key={topic.id} to={`/learn/topics/${topic.id}`} className="mr-4 inline-flex min-h-12 items-center text-brand-fg underline">
              Vezi tema „{topic.title}”
            </Link>
          ))}
        </p>
      )}

      {word.falseFriend && (
        <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">⚠️ {word.falseFriend}</p>
      )}

      {word.pos === "verb" && (
        <section className={card} aria-labelledby="verb-info">
          <h2 id="verb-info" className={heading}>
            Verb
          </h2>
          <p className="mt-2">
            Auxiliar: <strong>{word.auxiliary === "both" ? "avere / essere" : word.auxiliary}</strong> · participiu:{" "}
            <strong>{word.pastParticiple}</strong>
            {word.irregular && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">neregulat</span>}
          </p>
        </section>
      )}

      {word.pos === "noun" && (
        <section className={card} aria-labelledby="noun-info">
          <h2 id="noun-info" className={heading}>
            Substantiv
          </h2>
          <p className="mt-2">
            Gen: <strong>{word.gender === "m" ? "masculin" : "feminin"}</strong>
            {word.uncountable ? (
              <> · fără plural uzual</>
            ) : (
              <>
                {" "}
                · plural: <strong>{word.pluralArticle} {word.plural}</strong>
                {word.irregularPlural && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">neregulat</span>
                )}
              </>
            )}
          </p>
        </section>
      )}

      {word.pos === "adjective" && (
        <section className={card} aria-labelledby="adj-info">
          <h2 id="adj-info" className={heading}>
            Adjectiv
          </h2>
          <p className="mt-2">
            masculin: <strong>{word.forms.ms}</strong>, <strong>{word.forms.mp}</strong> · feminin:{" "}
            <strong>{word.forms.fs}</strong>, <strong>{word.forms.fp}</strong>
          </p>
        </section>
      )}

      {word.note && <p className="text-slate-600 dark:text-slate-300">{word.note}</p>}

      <section className={card} aria-labelledby="examples">
        <h2 id="examples" className={heading}>
          Exemple
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {word.examples.map((example) => (
            <li key={example.it} className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-medium">{example.it}</p>
                <p className="text-sm text-muted">{example.ro}</p>
              </div>
              <AudioButton text={example.it} size="sm" />
            </li>
          ))}
        </ul>
      </section>

      {tenses.length > 0 && (
        <section className={card} aria-labelledby="conj">
          <h2 id="conj" className={heading}>
            Conjugare
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {tenses.map((tense) => (
              <details key={tense} open={tense === "presente"} className="rounded-lg bg-slate-50 px-3 dark:bg-slate-800">
                <summary className="min-h-12 cursor-pointer py-3 font-medium">{TENSE_LABEL[tense]}</summary>
                <ConjugationTable id={`${word.id}:${tense}`} tense={tense} forms={forms![tense]!} rate={settings?.ttsRate} />
              </details>
            ))}
          </div>
        </section>
      )}

      <section className={card} aria-labelledby="progress">
        <h2 id="progress" className={heading}>
          Progres
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {vocabCards.length === 0 ? (
            <button
              type="button"
              onClick={() => void known()}
              className="min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg"
            >
              Știu deja acest cuvânt
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void forget()}
              className="min-h-12 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-700 dark:text-red-400"
            >
              Șterge progresul acestui cuvânt
            </button>
          )}
          <p className="text-sm text-muted">
            {vocabCards.length === 0
              ? "Cuvântul va reveni la repetiție peste câteva zile, ca să verificăm că îl știi."
              : "Cuvântul este în programul de repetiții."}
          </p>
        </div>
      </section>
    </div>
  );
}
