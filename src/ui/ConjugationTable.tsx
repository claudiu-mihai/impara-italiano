import { useEffect, useRef } from "react";

import type { Tense } from "../domain/content/constants.ts";
import { personsOf } from "../domain/content/display.ts";
import { spokenConjugation } from "../domain/content/spokenConjugation.ts";
import { speak, speakSequence, stopSpeaking, useSpeaking, useTtsStatus } from "../services/tts.ts";

interface ConjugationTableProps {
  /** Identifică tabelul (ex. „v-andare:presente”), ca „Ascultă tot” să știe dacă redarea activă este a lui. */
  id: string;
  tense: Tense;
  /** Formele acceptate, pe persoane, ca în datele de conjugare. */
  forms: readonly (readonly string[])[];
  rate?: number;
}

/**
 * Tabelul unui timp: tap pe un rând redă forma cu pronumele, „Ascultă tot” citește toate persoanele în ordine.
 * Fără voce italiană rândurile rămân text simplu; fără internet (și fără voce locală) butoanele sunt inactive.
 */
export function ConjugationTable({ id, tense, forms, rate }: ConjugationTableProps) {
  const status = useTtsStatus();
  const speaking = useSpeaking();
  const audio = status !== "unsupported" && status !== "no-voice";
  const offline = status === "offline";
  const persons = personsOf(tense);
  const spoken = forms.map((alternatives, i) => spokenConjugation(tense, i, alternatives));
  const active = speaking?.id === id ? speaking.index : null;

  // la părăsirea paginii, seria pornită din acest tabel nu continuă în fundal
  const playing = useRef(false);
  playing.current = active !== null;
  useEffect(
    () => () => {
      if (playing.current) stopSpeaking();
    },
    [id],
  );

  return (
    <div className="mb-3">
      {audio && (
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="text-sm text-muted">Apasă pe un rând ca să-l asculți.</p>
          <button
            type="button"
            disabled={offline}
            title={offline ? "Audio necesită internet" : undefined}
            onClick={() => (active === null ? speakSequence(id, spoken, rate) : stopSpeaking())}
            className="min-h-12 shrink-0 rounded-xl bg-slate-200 px-4 font-semibold disabled:opacity-40 dark:bg-slate-700"
          >
            {active === null ? "▶ Ascultă tot" : "■ Oprește"}
          </button>
        </div>
      )}
      <table className="w-full text-left">
        <tbody>
          {forms.map((alternatives, i) => {
            const current = active === i;
            const text = alternatives.join(" / ");
            return (
              <tr
                key={i}
                aria-current={current ? "true" : undefined}
                className={`border-t border-slate-200 dark:border-slate-700 ${current ? "bg-green-100 dark:bg-green-950" : ""}`}
              >
                <th scope="row" className="w-24 py-1.5 pr-2 font-normal text-muted">
                  {persons[i]?.it}
                </th>
                <td>
                  {audio ? (
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => speak(spoken[i] ?? "", rate)}
                      className="flex min-h-12 w-full items-center justify-between gap-2 text-left disabled:opacity-60"
                    >
                      <span>{text}</span>
                      <span aria-hidden="true" className="text-sm opacity-60">
                        🔊
                      </span>
                    </button>
                  ) : (
                    <span className="block py-1.5">{text}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
