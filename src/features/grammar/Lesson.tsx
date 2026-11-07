import type { LessonBlock } from "../../domain/content/schema.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { plainText } from "../../domain/grammar/markup.ts";
import { useT } from "../../i18n/index.ts";
import { speak } from "../../services/tts.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { InlineText } from "./InlineText.tsx";

/** Lecția unei teme de gramatică: paragrafe, tabele, exemple cu audio și capcane. Textul e în limba maternă. */
export function Lesson({ blocks }: { blocks: readonly LessonBlock[] }) {
  return (
    <article lang={NATIVE_LANGUAGE} className="flex flex-col gap-4 text-lg leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </article>
  );
}

function Block({ block }: { block: LessonBlock }) {
  const { t } = useT();
  switch (block.type) {
    case "text":
      return (
        <p>
          <InlineText text={block.ro} />
        </p>
      );
    case "trap":
      return (
        <aside className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-red-950 dark:bg-red-950 dark:text-red-50">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide">⚠️ Capcană pentru români</p>
          <p>
            <InlineText text={block.ro} />
          </p>
        </aside>
      );
    case "examples":
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((example) => (
            <li key={example.it} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <AudioButton text={example.it} size="sm" />
              <span className="flex-1">
                <span lang="it" className="block font-semibold">
                  {example.it}
                </span>
                <span className="block text-muted">{example.ro}</span>
                {example.note && (
                  <span className="block text-sm text-muted">
                    <InlineText text={example.note} />
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      );
    case "table": {
      const italian = (col: number) => (block.itColumns ? block.itColumns.includes(col) : col > 0);
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-2xl bg-white text-left text-base shadow-sm dark:bg-slate-900">
            {block.caption && <caption className="pb-2 text-left text-sm font-semibold text-muted">{block.caption}</caption>}
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                {block.head.map((cell, col) => (
                  <th key={col} scope="col" className="px-3 py-2 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-slate-100 dark:border-slate-800">
                  {row.map((cell, col) =>
                    italian(col) && cell ? (
                      <td key={col} lang="it" className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => speak(plainText(cell))}
                          aria-label={t("audio.listen", { text: plainText(cell) })}
                          className="min-h-11 w-full rounded-lg px-2 text-left font-medium active:bg-slate-100 dark:active:bg-slate-800"
                        >
                          {cell}
                        </button>
                      </td>
                    ) : (
                      <td key={col} className="px-3 py-2">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}
