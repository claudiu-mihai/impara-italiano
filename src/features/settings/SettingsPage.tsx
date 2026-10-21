import { useLiveQuery } from "dexie-react-hooks";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { LEVELS, type Level } from "../../domain/content/constants.ts";
import { LEVEL_NAME } from "../../domain/content/levels.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings, saveSettings } from "../../data/db/repositories.ts";
import { DEFAULT_SETTINGS, type ConjugationMode, type Settings } from "../../domain/settings.ts";
import type { Direction } from "../../domain/srs/types.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { getVoiceDiagnostics, speak, useItalianVoices, useTtsStatus } from "../../services/tts.ts";
import { isCloudVoice } from "../../services/voices.ts";

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";
const control = "min-h-12 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";
const action = "min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span>
        {label}
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Listă de valori predefinite; valoarea curentă se adaugă dacă nu e printre ele (ex. venită dintr-un backup). */
function withCurrent(presets: number[], current: number): number[] {
  return presets.includes(current) ? presets : [...presets, current].sort((a, b) => a - b);
}

function NumberSelect({
  value,
  presets,
  onChange,
  label,
  format = String,
}: {
  value: number;
  presets: number[];
  onChange: (n: number) => void;
  label: string;
  format?: (n: number) => string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(Number(e.target.value))}
      className={control}
    >
      {withCurrent(presets, value).map((n) => (
        <option key={n} value={n}>
          {format(n)}
        </option>
      ))}
    </select>
  );
}

function VoiceDiagnosticsPanel() {
  // Se re-randează când se schimbă lista de voci (voiceschanged) sau starea rețelei.
  useItalianVoices();
  useTtsStatus();
  const info = getVoiceDiagnostics();
  const report = JSON.stringify(info, null, 2);

  return (
    <div className="space-y-2 text-slate-600 dark:text-slate-300">
      <p>
        Stare: <strong>{info.status}</strong> · online: {info.online ? "da" : "nu"} · {info.total} voci expuse de browser
      </p>
      <p>
        Vocea folosită acum:{" "}
        <strong>{info.chosen ? `${info.chosen.name} (${info.chosen.lang})` : "niciuna"}</strong>
      </p>
      <ul className="max-h-48 overflow-y-auto rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">
        {info.voices.map((v) => (
          <li key={v.voiceURI} className={v.voiceURI === info.chosen?.voiceURI ? "font-bold" : undefined}>
            {v.name} · {v.lang} · {v.cloud ? "cloud" : "sistem"}
            {v.cloud && v.localService ? " (declarată locală)" : ""}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(report)}
        className="min-h-10 rounded-lg bg-slate-100 px-3 dark:bg-slate-800"
      >
        Copiază raportul
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { meta, words } = useContent();
  const settings = useLiveQuery(() => getSettings(db), []);
  const lastExport = useLiveQuery(async () => (await db.meta.get("lastExportAt"))?.value as string | undefined, []);
  const voices = useItalianVoices();
  const tts = useTtsStatus();
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const [busy, setBusy] = useState(false);

  if (!settings) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void saveSettings(db, { ...settings, [key]: value });

  const doExport = async () => {
    setBusy(true);
    try {
      const { backupToJson, exportBackup } = await import("../../data/backup/backup.ts");
      const now = new Date();
      const json = backupToJson(await exportBackup(db, meta.dataVersion, now));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `impara-backup-${studyDayOf(now)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ text: "Backup descărcat. Păstrează fișierul într-un loc sigur." });
    } catch {
      setStatus({ text: "Nu am putut crea backup-ul.", error: true });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { BackupError, importBackup, parseBackup } = await import("../../data/backup/backup.ts");
      try {
        const backup = parseBackup(await file.text());
        const ok = window.confirm(
          `Importul înlocuiește tot progresul actual cu cel din fișier ` +
            `(${backup.cards.length} carduri, ${backup.reviewLog.length} repetiții, ` +
            `exportat la ${studyDayOf(backup.exportedAt)}). Continui?`,
        );
        if (!ok) return;
        await importBackup(db, backup);
        setStatus({ text: "Progres importat." });
      } catch (error) {
        setStatus({ text: error instanceof BackupError ? error.message : "Nu am putut citi fișierul.", error: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (!window.confirm("Ștergi tot progresul (carduri și istoric)? Acțiunea nu poate fi anulată.")) return;
    const { resetProgress } = await import("../../data/backup/backup.ts");
    await resetProgress(db);
    setStatus({ text: "Progresul a fost șters." });
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">Setări</h1>

      <section className={card} aria-labelledby="study">
        <h2 id="study" className={heading}>
          Studiu
        </h2>
        <Field
          label="Nivelul curent"
          hint="Cuvinte și timpuri noi apar doar până la acest nivel (CEFR, estimat). Repetițiile continuă."
        >
          <select
            aria-label="Nivelul curent"
            value={settings.level}
            onChange={(e) => update("level", e.target.value as Level)}
            className={`${control} max-w-48`}
          >
            {LEVELS.map((level) => {
              const count = words.filter((w) => w.level === level).length;
              return (
                <option key={level} value={level}>
                  {level} · {LEVEL_NAME[level]} ({count === 0 ? "în pregătire" : `${count} cuvinte`})
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Direcția cardurilor" hint="Fiecare direcție are propriul progres.">
          <select
            aria-label="Direcția cardurilor"
            value={settings.direction}
            onChange={(e) => update("direction", e.target.value as Direction)}
            className={control}
          >
            <option value="it-ro">Italiană → Română</option>
            <option value="ro-it">Română → Italiană</option>
          </select>
        </Field>
        <Field label="Varianta de conjugare" hint="Scrie: 3 persoane pe rând. Flip: te evaluezi singur. Tabel: toate persoanele deodată.">
          <select
            aria-label="Varianta de conjugare"
            value={settings.conjugationMode}
            onChange={(e) => update("conjugationMode", e.target.value as ConjugationMode)}
            className={control}
          >
            <option value="write">Scrie răspunsul</option>
            <option value="flip">Flip (autoevaluare)</option>
            <option value="table">Tabel (toate persoanele)</option>
          </select>
        </Field>
        <Field label="Cuvinte noi pe zi">
          <NumberSelect label="Cuvinte noi pe zi" value={settings.newPerDay} presets={[0, 5, 10, 15, 20, 30, 50]} onChange={(n) => update("newPerDay", n)} />
        </Field>
        <Field label="Timpuri noi la conjugare pe zi">
          <NumberSelect label="Timpuri noi la conjugare pe zi" value={settings.newConjPerDay} presets={[0, 1, 2, 3, 5, 10]} onChange={(n) => update("newConjPerDay", n)} />
        </Field>
        <Field label="Limită de repetiții pe zi">
          <NumberSelect label="Limită de repetiții pe zi" value={settings.maxReviewsPerDay} presets={[25, 50, 100, 200, 500]} onChange={(n) => update("maxReviewsPerDay", n)} />
        </Field>
        <Field label="Retenție țintă" hint="Mai mare = mai multe repetiții.">
          <NumberSelect
            label="Retenție țintă"
            value={Math.round(settings.retention * 100)}
            presets={[80, 85, 90, 92, 95]}
            format={(n) => `${n}%`}
            onChange={(n) => update("retention", n / 100)}
          />
        </Field>
      </section>

      <section className={card} aria-labelledby="look">
        <h2 id="look" className={heading}>
          Aspect
        </h2>
        <Field label="Tema">
          <select
            aria-label="Tema"
            value={settings.theme}
            onChange={(e) => update("theme", e.target.value as Settings["theme"])}
            className={control}
          >
            <option value="auto">Automată (ca sistemul)</option>
            <option value="light">Luminoasă</option>
            <option value="dark">Întunecată</option>
          </select>
        </Field>
      </section>

      <section className={card} aria-labelledby="sound">
        <h2 id="sound" className={heading}>
          Sunet
        </h2>
        <Field label="Viteza pronunției">
          <NumberSelect
            label="Viteza pronunției"
            value={Math.round(settings.ttsRate * 10)}
            presets={[6, 7, 8, 9, 10, 11]}
            format={(n) => `${(n / 10).toFixed(1)}×`}
            onChange={(n) => update("ttsRate", n / 10)}
          />
        </Field>
        <Field
          label="Vocea italiană"
          hint={
            voices.length === 0
              ? "Nu am găsit voci italiene pe acest dispozitiv."
              : "Vocile din sistem funcționează și fără internet. Pe Mac poți instala voci mai bune din Setări de sistem → Accesibilitate → Conținut vorbit."
          }
        >
          <select
            aria-label="Vocea italiană"
            value={settings.ttsVoiceURI ?? ""}
            onChange={(e) => update("ttsVoiceURI", e.target.value || null)}
            disabled={voices.length === 0}
            className={`${control} max-w-48`}
          >
            <option value="">Automat</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
                {isCloudVoice(v) ? " (online)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          disabled={tts !== "ready"}
          onClick={() => speak("Ciao, come stai? Sono contento di conoscerti.", settings.ttsRate)}
          className="mb-2 min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold disabled:opacity-40 dark:bg-slate-800"
        >
          🔊 Ascultă vocea
        </button>
        <details className="mb-2 text-sm">
          <summary className="min-h-12 cursor-pointer py-3 text-muted">Diagnostic voci</summary>
          <VoiceDiagnosticsPanel />
        </details>
        <Field label="Sunet la răspunsuri" hint="Quiz și conjugare.">
          <input
            type="checkbox"
            aria-label="Sunet la răspunsuri"
            checked={settings.soundEnabled}
            onChange={(e) => update("soundEnabled", e.target.checked)}
            className="size-6 accent-brand"
          />
        </Field>
        <button type="button" onClick={() => void saveSettings(db, DEFAULT_SETTINGS)} className="mt-2 text-sm text-muted underline">
          Revino la setările implicite
        </button>
      </section>

      <section className={card} aria-labelledby="data">
        <h2 id="data" className={heading}>
          Date
        </h2>
        <p className="mt-2 text-sm text-muted">
          Progresul rămâne doar pe acest dispozitiv. Fă periodic un backup ca să nu-l pierzi.
          {lastExport && <> Ultimul backup: {studyDayOf(new Date(lastExport))}.</>}
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={() => void doExport()} className={action}>
            Exportă progresul
          </button>
          <label className={`${action} flex cursor-pointer items-center justify-center`}>
            Importă progresul
            <input type="file" accept="application/json,.json" onChange={(e) => void doImport(e)} className="sr-only" />
          </label>
          <button type="button" onClick={() => void doReset()} className="min-h-12 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-700 dark:text-red-400">
            Șterge tot progresul
          </button>
        </div>
        {status && (
          <p role="status" className={`mt-3 text-sm ${status.error ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
            {status.text}
          </p>
        )}
      </section>

      <Link to="/about" className="min-h-12 text-center text-brand-fg underline">
        Despre aplicație și surse
      </Link>
    </div>
  );
}
