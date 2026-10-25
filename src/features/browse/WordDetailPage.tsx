import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { useConjugations } from "../../app/conjugations.ts";
import { useTopics } from "../../app/topics.ts";
import { topicWordIds } from "../../domain/topics/topics.ts";
import { useWordDetails } from "../../app/wordDetails.ts";
import { db } from "../../data/db/instance.ts";
import { forgetWord, getSettings, markWordKnown } from "../../data/db/repositories.ts";
import { italianText, POS_LABEL, TENSE_LABEL } from "../../domain/content/display.ts";
import { NATIVE_LANGUAGE, TENSES } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { masteryOf } from "../../domain/srs/mastery.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { BackLink } from "../../ui/BackLink.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { ConjugationTable } from "../../ui/ConjugationTable.tsx";
import { LevelBadge } from "./LevelBadge.tsx";

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

export function WordDetailPage() {
  const { t, rich } = useT();
  const { id = "" } = useParams();
  const conjugations = useConjugations();
  const details = useWordDetails();
  const topics = useTopics();
  const word = details?.get(id);
  const cards = useLiveQuery(() => db.cards.where("wordId").equals(id).toArray(), [id]);
  const settings = useLiveQuery(() => getSettings(db), []);

  if (!details) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  if (!word) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("word.notFound")}</p>
        <Link to="/browse" className="text-brand-fg underline">
          {t("word.backToDictionary")}
        </Link>
      </div>
    );
  }

  const inTopics = (topics ?? []).filter((topic) => topicWordIds(topic).includes(word.id));
  const vocabCards = (cards ?? []).filter((c) => c.kind === "vocab");
  const level = masteryOf(vocabCards);
  const text = italianText(word);
  const forms = conjugations?.[word.id];
  const tenses = TENSES.filter((tense) => forms?.[tense]);

  const known = async () => {
    const settings = await getSettings(db);
    await markWordKnown(db, word.id, new Date(), settings.retention);
  };
  const forget = async () => {
    if (window.confirm(t("word.confirmForget", { text }))) await forgetWord(db, word.id);
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/browse" label={t("nav.browse")} />

      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-muted">{t(POS_LABEL[word.pos])}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">{text}</h1>
          <AudioButton text={text} />
        </div>
        <p lang={NATIVE_LANGUAGE} className="text-xl text-slate-600 dark:text-slate-300">
          {word.ro}
        </p>
        <div className="flex items-center gap-2">
          <CefrBadge level={word.level} />
          <LevelBadge level={level} />
        </div>
      </header>

      {inTopics.length > 0 && (
        <p className="text-sm">
          {inTopics.map((topic) => (
            <Link key={topic.id} to={`/learn/topics/${topic.id}`} className="mr-4 inline-flex min-h-12 flex-col justify-center text-brand-fg">
              <span className="underline">{t("word.seeTopic")}</span>
              <span className="font-semibold">
                <BilingualLabel text={topic.title} />
              </span>
            </Link>
          ))}
        </p>
      )}

      {word.falseFriend && (
        <p lang={NATIVE_LANGUAGE} className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">
          ⚠️ {word.falseFriend}
        </p>
      )}

      {word.pos === "verb" && (
        <section className={card} aria-labelledby="verb-info">
          <h2 id="verb-info" className={heading}>
            {t("word.verb")}
          </h2>
          <p className="mt-2">
            {rich("word.verbLine", {
              aux: <strong>{word.auxiliary === "both" ? "avere / essere" : word.auxiliary}</strong>,
              participle: <strong>{word.pastParticiple}</strong>,
            })}
            {word.irregular && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{t("word.irregular")}</span>
            )}
          </p>
        </section>
      )}

      {word.pos === "noun" && (
        <section className={card} aria-labelledby="noun-info">
          <h2 id="noun-info" className={heading}>
            {t("word.noun")}
          </h2>
          <p className="mt-2">
            {rich("word.genderLine", { gender: <strong>{t(word.gender === "m" ? "word.gender.m" : "word.gender.f")}</strong> })}
            {word.uncountable ? (
              <> · {t("word.noPlural")}</>
            ) : (
              <>
                {" "}
                · {rich("word.plural", { plural: <strong>{word.pluralArticle} {word.plural}</strong> })}
                {word.irregularPlural && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{t("word.irregular")}</span>
                )}
              </>
            )}
          </p>
        </section>
      )}

      {word.pos === "adjective" && (
        <section className={card} aria-labelledby="adj-info">
          <h2 id="adj-info" className={heading}>
            {t("word.adjective")}
          </h2>
          <p className="mt-2">
            {rich("word.adjectiveLine", {
              ms: <strong>{word.forms.ms}</strong>,
              mp: <strong>{word.forms.mp}</strong>,
              fs: <strong>{word.forms.fs}</strong>,
              fp: <strong>{word.forms.fp}</strong>,
            })}
          </p>
        </section>
      )}

      {word.note && (
        <p lang={NATIVE_LANGUAGE} className="text-slate-600 dark:text-slate-300">
          {word.note}
        </p>
      )}

      <section className={card} aria-labelledby="examples">
        <h2 id="examples" className={heading}>
          {t("word.examples")}
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {word.examples.map((example) => (
            <li key={example.it} className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-medium">{example.it}</p>
                <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
                  {example.ro}
                </p>
              </div>
              <AudioButton text={example.it} size="sm" />
            </li>
          ))}
        </ul>
      </section>

      {tenses.length > 0 && (
        <section className={card} aria-labelledby="conj">
          <h2 id="conj" className={heading}>
            {t("learn.conjugation")}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {tenses.map((tense) => (
              <details key={tense} open={tense === "presente"} className="rounded-lg bg-slate-50 px-3 dark:bg-slate-800">
                <summary className="min-h-12 cursor-pointer py-3 font-medium">{t(TENSE_LABEL[tense])}</summary>
                <ConjugationTable id={`${word.id}:${tense}`} tense={tense} forms={forms![tense]!} rate={settings?.ttsRate} />
              </details>
            ))}
          </div>
        </section>
      )}

      <section className={card} aria-labelledby="progress">
        <h2 id="progress" className={heading}>
          {t("word.progress")}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {vocabCards.length === 0 ? (
            <button
              type="button"
              onClick={() => void known()}
              className="min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg"
            >
              {t("word.markKnown")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void forget()}
              className="min-h-12 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-700 dark:text-red-400"
            >
              {t("word.forget")}
            </button>
          )}
          <p className="text-sm text-muted">
            {vocabCards.length === 0
              ? t("word.knownHint")
              : t("word.inProgram")}
          </p>
        </div>
      </section>
    </div>
  );
}
