import { useEffect, useId, useRef, useState } from "react";
import { useItalianFirst } from "../app/italianFirst.ts";
import type { Localized } from "../domain/content/schema.ts";
import { nativeText } from "./BilingualLabel.tsx";
import { RulesBox } from "./RulesBox.tsx";

const chevron = (open: boolean) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

interface FaceProps {
  title: string;
  rules: readonly string[];
  open: boolean;
  onToggle: () => void;
  onFlip: () => void;
  flipLabel: string;
  /** Limba etichetei butonului de întoarcere (e a celeilalte fețe). */
  flipLang: string;
  /** Fața din spate: întoarsă cu 180° și cu altă nuanță. */
  back?: boolean;
  /** Fața nevăzută: scoasă din ordinea de tab și din arborele de accesibilitate. */
  hidden: boolean;
  /** Limba textelor feței (`it` pe fața italiană), pentru cititoarele de ecran. */
  lang?: string;
  flipRef: React.Ref<HTMLButtonElement>;
}

function Face({ title, rules, open, onToggle, onFlip, flipLabel, flipLang, back, hidden, lang, flipRef }: FaceProps) {
  const id = useId();
  const tone = back
    ? "bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-50 [transform:rotateY(180deg)]"
    : "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50";
  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-hidden={hidden || undefined}
      inert={hidden}
      lang={lang}
      className={`card-face rounded-2xl [grid-area:1/1] ${tone}`}
    >
      <h2 id={`${id}-title`} className="text-sm font-semibold uppercase tracking-wide">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-rules`}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-5 text-left uppercase"
        >
          {title}
          {chevron(open)}
        </button>
      </h2>
      {/* Atingerea oriunde în caseta deschisă o întoarce; butonul de jos face același lucru pentru tastatură. */}
      <div id={`${id}-rules`} hidden={!open} onClick={onFlip}>
        <ul className="flex list-disc flex-col gap-2 pb-3 pl-10 pr-5">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <button
          type="button"
          ref={flipRef}
          aria-label={flipLabel}
          lang={flipLang}
          className="mx-5 mb-4 flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold underline"
        >
          <span aria-hidden="true">↻</span>
          {flipLabel}
        </button>
      </div>
    </section>
  );
}

/** Caseta „De reținut” cu două fețe: regulile limbii italiane și, pe spate, cele în limba maternă (cu cele comparate). */
function TwoFacedRules({ italian, native }: { italian: readonly string[]; native: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const [showNative, setShowNative] = useState(false);
  const frontFlip = useRef<HTMLButtonElement>(null);
  const backFlip = useRef<HTMLButtonElement>(null);
  const flipped = useRef(false);

  // După întoarcere, focusul trece pe butonul feței noi (cea veche devine inertă).
  useEffect(() => {
    if (!flipped.current) return;
    (showNative ? backFlip : frontFlip).current?.focus();
  }, [showNative]);

  const flip = () => {
    flipped.current = true;
    setShowNative((v) => !v);
  };
  const toggle = () => setOpen((o) => !o);

  return (
    <div className="[perspective:1200px]">
      <div
        data-testid="rules-box"
        data-face={showNative ? "native" : "italian"}
        className={`grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${
          showNative ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <Face
          title="Da ricordare"
          lang="it"
          rules={italian}
          open={open}
          onToggle={toggle}
          onFlip={flip}
          flipLabel="Arată în română"
          flipLang="ro"
          hidden={showNative}
          flipRef={frontFlip}
        />
        <Face
          back
          title="De reținut"
          rules={native}
          open={open}
          onToggle={toggle}
          onFlip={flip}
          flipLabel="Mostra in italiano"
          flipLang="it"
          hidden={!showNative}
          flipRef={backFlip}
        />
      </div>
    </div>
  );
}

/**
 * „De reținut” pentru o temă: cu „Italiană întâi” pornită, două fețe (italiană / limba maternă) care se întorc
 * toate deodată, cu titlu cu tot; oprită, caseta obișnuită, doar în limba maternă (regulile și cele comparate).
 */
export function TopicRulesBox({ rules, contrast = [] }: { rules: readonly Localized[]; contrast?: readonly string[] }) {
  const italianFirst = useItalianFirst();
  const native = [...rules.map(nativeText), ...contrast];
  if (!italianFirst) return <RulesBox rules={native} />;
  return <TwoFacedRules italian={rules.map((r) => r.it)} native={native} />;
}
