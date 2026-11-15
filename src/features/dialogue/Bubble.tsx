import type { ReactNode } from "react";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import type { Localized } from "../../domain/content/schema.ts";
import type { Speaker } from "../../services/tts.ts";
import { useT } from "../../i18n/index.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";

interface BubbleProps {
  /** Numele personajului, în limba interfeței. */
  name: Localized;
  /** Replica (italiană și traducere). */
  it: string;
  ro: string;
  /** Replica cursantului: balon în dreapta. */
  mine: boolean;
  speaker: Speaker;
  rate: number;
  /** În locul textului (ex. „Arată textul” sau cerința jocului de rol); `undefined` = textul se vede. */
  hidden?: ReactNode;
}

/** O replică a dialogului, ca un balon de chat: celălalt în stânga, cursantul în dreapta, cu 🔊 pentru reluare. */
export function Bubble({ name, it, ro, mine, speaker, rate, hidden }: BubbleProps) {
  const { language } = useT();
  return (
    <li
      data-testid="dialogue-line"
      className={`flex max-w-[85%] flex-col gap-1 rounded-2xl p-3 shadow-sm ${
        mine
          ? "self-end rounded-br-sm border-2 border-brand bg-white dark:bg-slate-900"
          : "self-start rounded-bl-sm bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-fg">{language === "it" ? name.it : name.ro}</span>
        {hidden === undefined && <AudioButton text={it} rate={rate} size="md" speaker={speaker} />}
      </div>
      {hidden ?? (
        <>
          <p lang="it" className="text-lg font-medium">
            {it}
          </p>
          <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
            {ro}
          </p>
        </>
      )}
    </li>
  );
}
