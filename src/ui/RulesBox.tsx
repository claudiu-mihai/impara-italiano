import { useId, useState } from "react";

/**
 * Caseta „De reținut” a unei teme: regulile stau ascunse până atingi titlul, ca fișa să înceapă cu cuvintele.
 * Titlul este un buton într-un <h2> (șablonul „disclosure”), deci rămâne titlu de secțiune pentru cititoarele de ecran.
 */
export function RulesBox({
  rules,
  title = "De reținut",
  lang,
}: {
  rules: readonly string[];
  title?: string;
  /** Limba titlului și a regulilor, dacă nu e cea a paginii (ex. `it`). */
  lang?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} lang={lang} className="rounded-2xl bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
      <h2 id={`${id}-title`} className="text-sm font-semibold uppercase tracking-wide">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-rules`}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-5 text-left uppercase"
        >
          {title}
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
        </button>
      </h2>
      <ul id={`${id}-rules`} hidden={!open} className="flex list-disc flex-col gap-2 pb-5 pl-10 pr-5">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
