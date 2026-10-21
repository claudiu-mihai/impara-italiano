import { speak, useTtsStatus } from "../services/tts.ts";

/** Viteza butonului 🐢: aceeași frază, rostită mai rar. */
export const SLOW_RATE = 0.6;

interface AudioButtonProps {
  text: string;
  rate?: number;
  size?: "md" | "sm";
  /** Varianta 🐢: rostește mai rar (SLOW_RATE), indiferent de viteza din Setări. */
  slow?: boolean;
}

/** Buton de redare a pronunției. Se ascunde fără voce italiană și se dezactivează fără internet. */
export function AudioButton({ text, rate, size = "md", slow = false }: AudioButtonProps) {
  const status = useTtsStatus();
  if (status === "unsupported" || status === "no-voice") return null;

  const offline = status === "offline";
  const label = offline ? "Audio necesită internet" : `${slow ? "Ascultă rar" : "Ascultă pronunția"}: ${text}`;
  return (
    <button
      type="button"
      data-no-flip
      disabled={offline}
      aria-label={label}
      title={label}
      onClick={() => speak(text, slow ? SLOW_RATE : rate)}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl disabled:opacity-40 dark:bg-slate-800 ${
        size === "md" ? "size-12" : "size-10"
      }`}
    >
      {slow ? "🐢" : "🔊"}
    </button>
  );
}
