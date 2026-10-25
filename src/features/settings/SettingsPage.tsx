import { useLiveQuery } from "dexie-react-hooks";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { LEVELS, type Level } from "../../domain/content/constants.ts";
import { LEVEL_NAME } from "../../domain/content/levels.ts";
import { setUiLanguage, useT } from "../../i18n/index.ts";
import { db } from "../../data/db/instance.ts";
import { changeLevel, getSettings, NATIVE_HELP_STOPPED, saveSettings } from "../../data/db/repositories.ts";
import { AccountSection } from "./AccountSection.tsx";
import { downloadBackup } from "./backupDownload.ts";
import { DEFAULT_SETTINGS, type ConjugationMode, type Settings, type StudyDirection } from "../../domain/settings.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { getVoiceDiagnostics, speak, useItalianVoices, useTtsStatus } from "../../services/tts.ts";
import { isCloudVoice } from "../../services/voices.ts";

import { InfoBox, InfoButton, InfoHeading, useInfo } from "../../ui/Info.tsx";
import { NativeHelpNotice } from "../../ui/NativeHelpNotice.tsx";

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";
const control = "min-h-12 rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";
const action = "min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg";

/** Un rând din Setări: eticheta, controlul și, dacă există explicație, un buton (i) care deschide sub rând o casetă. */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const info = useInfo();
  return (
    <div className="py-1">
      {/* selectorul își păstrează lățimea (max. 55%), iar eticheta se strânge în locul rămas; mai ales în italiană */}
      <div className="flex items-center justify-between gap-4 [&>select]:max-w-[55%] [&>select]:shrink-0">
        <span className="flex min-w-0 flex-1 items-center">
          <span id={info.labelId}>{label}</span>
          {hint && <InfoButton open={info.open} onToggle={info.toggle} boxId={info.boxId} labelId={info.labelId} />}
        </span>
        {children}
      </div>
      {hint && info.open && <InfoBox id={info.boxId}>{hint}</InfoBox>}
    </div>
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
  const { t } = useT();
  // Se re-randează când se schimbă lista de voci (voiceschanged) sau starea rețelei.
  useItalianVoices();
  useTtsStatus();
  const info = getVoiceDiagnostics();
  const report = JSON.stringify(info, null, 2);

  return (
    <div className="space-y-2 text-slate-600 dark:text-slate-300">
      <p>
        {t("settings.diagStatus", { status: info.status, online: t(info.online ? "settings.yes" : "settings.no"), total: info.total })}
      </p>
      <p>
        {t("settings.diagVoice", { voice: info.chosen ? `${info.chosen.name} (${info.chosen.lang})` : t("settings.none") })}
      </p>
      <ul className="max-h-48 overflow-y-auto rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">
        {info.voices.map((v) => (
          <li key={v.voiceURI} className={v.voiceURI === info.chosen?.voiceURI ? "font-bold" : undefined}>
            {v.name} · {v.lang} · {t(v.cloud ? "settings.voiceCloud" : "settings.voiceSystem")}
            {v.cloud && v.localService ? t("settings.declaredLocal") : ""}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(report)}
        className="min-h-10 rounded-lg bg-slate-100 px-3 dark:bg-slate-800"
      >
        {t("settings.copyReport")}
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { t, tp } = useT();
  const { meta, words } = useContent();
  const settings = useLiveQuery(() => getSettings(db), []);
  const lastExport = useLiveQuery(async () => (await db.meta.get("lastExportAt"))?.value as string | undefined, []);
  const signedIn = useLiveQuery(async () => (await db.meta.get("syncUserId")) !== undefined, []) ?? false;
  const voices = useItalianVoices();
  const tts = useTtsStatus();
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const [busy, setBusy] = useState(false);

  if (!settings) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void saveSettings(db, { ...settings, [key]: value });

  const doExport = async () => {
    setBusy(true);
    try {
      await downloadBackup(meta.dataVersion);
      setStatus({ text: t("settings.exported") });
    } catch {
      setStatus({ text: t("settings.exportFailed"), error: true });
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
          t("settings.confirmImport", {
            cloud: signedIn ? t("settings.inCloud") : "",
            cards: backup.cards.length,
            reviews: backup.reviewLog.length,
            date: studyDayOf(backup.exportedAt),
          }),
        );
        if (!ok) return;
        await importBackup(db, backup);
        setStatus({ text: t("settings.imported") });
      } catch (error) {
        setStatus({ text: error instanceof BackupError ? error.message : t("settings.readFailed"), error: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    const scope = signedIn ? t("settings.resetScope") : "";
    if (!window.confirm(t("settings.confirmReset", { scope }))) return;
    const { resetProgress } = await import("../../data/backup/backup.ts");
    await resetProgress(db);
    setStatus({ text: t("settings.resetDone") });
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>

      <section className={card} aria-labelledby="study">
        <h2 id="study" className={heading}>
          {t("settings.study")}
        </h2>
        <Field
          label={t("settings.level")}
          hint={t("settings.levelHint")}
        >
          <select
            aria-label={t("settings.level")}
            value={settings.level}
            onChange={(e) => void changeLevel(db, e.target.value as Level)}
            className={`${control} max-w-48`}
          >
            {LEVELS.map((level) => {
              const count = words.filter((w) => w.level === level).length;
              return (
                <option key={level} value={level}>
                  {level} · {t(LEVEL_NAME[level])} ({count === 0 ? t("stats.comingSoon") : tp("settings.wordCount", count)})
                </option>
              );
            })}
          </select>
        </Field>
        <NativeHelpNotice inSettings />
        <Field
          label={t("settings.uiLanguage")}
          hint={t("settings.uiLanguageHint")}
        >
          <select
            aria-label={t("settings.uiLanguage")}
            value={settings.uiLanguage}
            onChange={(e) => {
              const language = e.target.value as Settings["uiLanguage"];
              void setUiLanguage(language);
              update("uiLanguage", language);
            }}
            className={control}
          >
            <option value="ro">Română</option>
            <option value="it">Italiano</option>
          </select>
        </Field>
        <Field
          label={t("settings.nativeHelp")}
          hint={t("settings.nativeHelpHint")}
        >
          <span className="flex size-12 items-center justify-center">
            <input
              type="checkbox"
              aria-label={t("settings.nativeHelp")}
              checked={settings.nativeHelp}
              onChange={(e) => {
                update("nativeHelp", e.target.checked);
                if (e.target.checked) void db.meta.delete(NATIVE_HELP_STOPPED);
              }}
              className="size-6 accent-brand"
            />
          </span>
        </Field>
        <Field
          label={t("settings.direction")}
          hint={t("settings.directionHint")}
        >
          <select
            aria-label={t("settings.direction")}
            value={settings.direction}
            onChange={(e) => update("direction", e.target.value as StudyDirection)}
            className={control}
          >
            <option value="it-ro">{t("dir.itRo")}</option>
            <option value="ro-it">{t("dir.roIt")}</option>
            <option value="both">{t("settings.both")}</option>
          </select>
        </Field>
        {settings.direction === "both" && (
          <Field label={t("settings.reverse")} hint={t("settings.reverseHint")}>
            <NumberSelect
              label={t("settings.reverse")}
              value={settings.newReversePerDay}
              presets={[0, 5, 10, 15, 20, 30]}
              onChange={(n) => update("newReversePerDay", n)}
            />
          </Field>
        )}
        <Field label={t("conj.mode")} hint={t("settings.modeHint")}>
          <select
            aria-label={t("conj.mode")}
            value={settings.conjugationMode}
            onChange={(e) => update("conjugationMode", e.target.value as ConjugationMode)}
            className={control}
          >
            <option value="write">{t("settings.modeWrite")}</option>
            <option value="flip">{t("settings.modeFlip")}</option>
            <option value="table">{t("settings.modeTable")}</option>
          </select>
        </Field>
        <Field label={t("settings.newPerDay")}>
          <NumberSelect label={t("settings.newPerDay")} value={settings.newPerDay} presets={[0, 5, 10, 15, 20, 30, 50]} onChange={(n) => update("newPerDay", n)} />
        </Field>
        <Field label={t("settings.nounShare")} hint={t("settings.nounShareHint")}>
          <select
            aria-label={t("settings.nounShare")}
            value={settings.nounShare}
            onChange={(e) => update("nounShare", Number(e.target.value))}
            className={control}
          >
            <option value={0}>{t("settings.byFrequency")}</option>
            <option value={33}>{t("settings.oneOfThree")}</option>
            <option value={50}>{t("settings.oneOfTwo")}</option>
            <option value={67}>{t("settings.twoOfThree")}</option>
          </select>
        </Field>
        <Field label={t("settings.newConj")}>
          <NumberSelect label={t("settings.newConj")} value={settings.newConjPerDay} presets={[0, 1, 2, 3, 5, 10]} onChange={(n) => update("newConjPerDay", n)} />
        </Field>
        <Field label={t("settings.maxReviews")}>
          <NumberSelect label={t("settings.maxReviews")} value={settings.maxReviewsPerDay} presets={[25, 50, 100, 200, 500]} onChange={(n) => update("maxReviewsPerDay", n)} />
        </Field>
        <Field label={t("settings.retention")} hint={t("settings.retentionHint")}>
          <NumberSelect
            label={t("settings.retention")}
            value={Math.round(settings.retention * 100)}
            presets={[80, 85, 90, 92, 95]}
            format={(n) => `${n}%`}
            onChange={(n) => update("retention", n / 100)}
          />
        </Field>
      </section>

      <section className={card} aria-labelledby="look">
        <h2 id="look" className={heading}>
          {t("settings.look")}
        </h2>
        <Field label={t("settings.theme")}>
          <select
            aria-label={t("settings.theme")}
            value={settings.theme}
            onChange={(e) => update("theme", e.target.value as Settings["theme"])}
            className={control}
          >
            <option value="auto">{t("settings.themeAuto")}</option>
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
          </select>
        </Field>
      </section>

      <section className={card} aria-labelledby="sound">
        <h2 id="sound" className={heading}>
          {t("settings.sound")}
        </h2>
        <Field label={t("settings.speed")}>
          <NumberSelect
            label={t("settings.speed")}
            value={Math.round(settings.ttsRate * 10)}
            presets={[6, 7, 8, 9, 10, 11]}
            format={(n) => `${(n / 10).toFixed(1)}×`}
            onChange={(n) => update("ttsRate", n / 10)}
          />
        </Field>
        <Field
          label={t("settings.voice")}
          hint={voices.length === 0 ? t("settings.noVoices") : t("settings.voicesHint")}
        >
          <select
            aria-label={t("settings.voice")}
            value={settings.ttsVoiceURI ?? ""}
            onChange={(e) => update("ttsVoiceURI", e.target.value || null)}
            disabled={voices.length === 0}
            className={`${control} max-w-48`}
          >
            <option value="">{t("settings.automatic")}</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
                {isCloudVoice(v) ? ` (${t("settings.online")})` : ""}
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
          {t("settings.listenVoice")}
        </button>
        <details className="mb-2 text-sm">
          <summary className="min-h-12 cursor-pointer py-3 text-muted">{t("settings.diagnostics")}</summary>
          <VoiceDiagnosticsPanel />
        </details>
        <Field label={t("settings.soundEffects")} hint={t("settings.soundEffectsHint")}>
          <span className="flex size-12 items-center justify-center">
            <input
              type="checkbox"
              aria-label={t("settings.soundEffects")}
              checked={settings.soundEnabled}
              onChange={(e) => update("soundEnabled", e.target.checked)}
              className="size-6 accent-brand"
            />
          </span>
        </Field>
        <button type="button" onClick={() => void saveSettings(db, DEFAULT_SETTINGS)} className="mt-2 text-sm text-muted underline">
          {t("settings.resetDefaults")}
        </button>
      </section>

      <AccountSection />

      <section className={card} aria-labelledby="data">
        <InfoHeading id="data" title={t("about.data")} className={heading}>
          {signedIn ? t("settings.dataSignedIn") : t("settings.dataLocal")}
        </InfoHeading>
        {lastExport && <p className="mt-2 text-sm text-muted">{t("settings.lastBackup", { date: studyDayOf(new Date(lastExport)) })}</p>}
        <div className="mt-3 flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={() => void doExport()} className={action}>
            {t("settings.export")}
          </button>
          <label className={`${action} flex cursor-pointer items-center justify-center`}>
            {t("settings.import")}
            <input type="file" accept="application/json,.json" onChange={(e) => void doImport(e)} className="sr-only" />
          </label>
          <button type="button" onClick={() => void doReset()} className="min-h-12 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-700 dark:text-red-400">
            {t("settings.resetAll")}
          </button>
        </div>
        {status && (
          <p role="status" className={`mt-3 text-sm ${status.error ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
            {status.text}
          </p>
        )}
      </section>

      <Link to="/about" className="min-h-12 text-center text-brand-fg underline">
        {t("settings.about")}
      </Link>
    </div>
  );
}
