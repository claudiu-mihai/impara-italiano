import { useT } from "../i18n/index.ts";
import { speak, useTtsStatus, type Speaker } from "../services/tts.ts";

/** Viteza butonului 🐢: aceeași frază, rostită mai rar. */
export const SLOW_RATE = 0.6;

interface AudioButtonProps {
  text: string;
  rate?: number;
  size?: "lg" | "md" | "sm";
  /** Varianta 🐢: rostește mai rar (SLOW_RATE), indiferent de viteza din Setări. */
  slow?: boolean;
  /** Personajul unui dialog (altă voce sau altă înălțime pentru al doilea). */
  speaker?: Speaker;
}

/** Buton de redare a pronunției. Se ascunde fără voce italiană și se dezactivează fără internet. */
export function AudioButton({ text, rate, size = "md", slow = false, speaker }: AudioButtonProps) {
  const { t } = useT();
  const status = useTtsStatus();
  if (status === "unsupported" || status === "no-voice") return null;

  const offline = status === "offline";
  const label = offline ? t("audio.needsInternet") : t(slow ? "audio.listenSlow" : "audio.listen", { text });
  return (
    <button
      type="button"
      data-no-flip
      disabled={offline}
      aria-label={label}
      title={label}
      onClick={() => speak(text, slow ? SLOW_RATE : rate, speaker === undefined ? undefined : { speaker })}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl disabled:opacity-40 dark:bg-slate-800 ${
        size === "lg" ? "size-24 text-5xl" : size === "md" ? "size-12" : "size-10"
      }`}
    >
      {slow ? "🐢" : "🔊"}
    </button>
  );
}
