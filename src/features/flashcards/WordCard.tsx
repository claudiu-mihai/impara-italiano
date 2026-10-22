import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { italianText, POS_LABEL } from "../../domain/content/display.ts";
import type { Word } from "../../domain/content/schema.ts";
import type { Direction } from "../../domain/srs/types.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";

const SWIPE_THRESHOLD = 100;

interface FaceProps {
  word: Word;
  direction: Direction;
  rate: number;
}

function FrontFace({ word, direction, rate }: FaceProps) {
  const fromItalian = direction === "it-ro";
  const text = fromItalian ? italianText(word) : word.ro;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-sm uppercase tracking-wide text-muted">{POS_LABEL[word.pos]}</span>
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold">{text}</span>
        {fromItalian && <AudioButton text={text} rate={rate} />}
      </div>
    </div>
  );
}

function BackFace({ word, direction, rate }: FaceProps) {
  const fromItalian = direction === "it-ro";
  const question = fromItalian ? italianText(word) : word.ro;
  const answer = fromItalian ? word.ro : italianText(word);

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <span className="text-sm text-muted">{question}</span>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold">{answer}</span>
        {!fromItalian && <AudioButton text={answer} rate={rate} />}
      </div>

      {word.pos === "verb" && (
        <p className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            auxiliar: {word.auxiliary === "both" ? "avere / essere" : word.auxiliary}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">participiu: {word.pastParticiple}</span>
          {word.irregular && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">neregulat</span>
          )}
        </p>
      )}

      {word.pos === "noun" && !word.uncountable && (
        <p className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            plural: {word.pluralArticle} {word.plural}
          </span>
          {word.irregularPlural && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">plural neregulat</span>
          )}
        </p>
      )}

      {word.pos === "adjective" && new Set(Object.values(word.forms)).size > 1 && (
        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">
          {word.forms.ms} · {word.forms.fs} · {word.forms.mp} · {word.forms.fp}
        </p>
      )}

      {word.falseFriend && (
        <p className="rounded-xl bg-amber-100 p-3 text-left text-sm text-amber-950">⚠️ {word.falseFriend}</p>
      )}

      <ul className="flex w-full flex-col gap-3 text-left">
        {word.examples.map((example) => (
          <li key={example.it} className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium">{example.it}</p>
              <p className="text-sm text-muted">{example.ro}</p>
            </div>
            <AudioButton text={example.it} rate={rate} size="sm" />
          </li>
        ))}
      </ul>

      {word.note && <p className="w-full text-left text-sm text-muted">{word.note}</p>}
    </div>
  );
}

interface WordCardProps extends FaceProps {
  flipped: boolean;
  onFlip: () => void;
  /** 1 = Din nou (swipe stânga), 3 = Bine (swipe dreapta). */
  onSwipe: (grade: 1 | 3) => void;
}

export function WordCard({ word, direction, rate, flipped, onFlip, onSwipe }: WordCardProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-200, 200], [-8, 8]);

  // touch-pan-y: fețele se pot derula vertical (exemple lungi), dar gestul orizontal rămâne pentru swipe. Fără el, pe
  // ecran tactil browserul ia gestul pentru elementul derulabil, anulează evenimentele și cardul nu mai poate fi tras.
  const face =
    "absolute inset-0 touch-pan-y overflow-y-auto rounded-3xl bg-white shadow-md dark:bg-slate-900";
  const front = <FrontFace word={word} direction={direction} rate={rate} />;
  const back = <BackFace word={word} direction={direction} rate={rate} />;

  return (
    <div className="relative min-h-[22rem] flex-1" style={{ perspective: 1200 }}>
      <motion.div
        className="absolute inset-0"
        style={{ x, rotateZ: tilt, transformStyle: "preserve-3d", touchAction: "pan-y" }}
        drag={flipped ? "x" : false}
        dragSnapToOrigin
        dragElastic={0.5}
        animate={{ rotateY: flipped && !reduceMotion ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) onSwipe(3);
          else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe(1);
        }}
        onTap={(event) => {
          const target = event.target as HTMLElement | null;
          if (!flipped && !target?.closest("[data-no-flip]")) onFlip();
        }}
      >
        {reduceMotion ? (
          <div className={face} data-testid={flipped ? "card-back" : "card-front"}>
            {flipped ? back : front}
          </div>
        ) : (
          <>
            {/* `inert` scoate fața ascunsă din ordinea de focus și din arborele de accesibilitate. */}
            <div className={`card-face ${face}`} data-testid="card-front" inert={flipped}>
              {front}
            </div>
            <div
              className={`card-face ${face}`}
              data-testid="card-back"
              style={{ transform: "rotateY(180deg)" }}
              inert={!flipped}
            >
              {back}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
