import { useEffect, useRef, useState } from "react";
import type { WordVideo } from "../domain/content/videos.ts";
import { useT } from "../i18n/index.ts";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; url: string } | { kind: "error" };

const box = "flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 text-white";

/**
 * Clipul unui cuvânt. Se descarcă doar la apăsare și întreg (nu pe bucăți): așa îl păstrează service worker-ul în
 * cache și merge și fără internet după prima vizionare.
 */
export function VideoPlayer({ video, label }: { video: WordVideo; label: string }) {
  const { t } = useT();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const alive = useRef(true);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => () => {
    if (status.kind === "ready") URL.revokeObjectURL(status.url);
  }, [status]);
  useEffect(() => {
    if (status.kind === "ready") ref.current?.play().catch(() => {});
  }, [status]);

  const load = async () => {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch(video.src);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      if (alive.current) setStatus({ kind: "ready", url: URL.createObjectURL(blob) });
    } catch {
      if (alive.current) setStatus({ kind: "error" });
    }
  };

  if (status.kind === "ready") {
    return (
      <video ref={ref} src={status.url} poster={video.poster} controls playsInline aria-label={label} className="aspect-video w-full rounded-xl bg-black">
        {video.tracks.map((track, i) => (
          <track key={track.lang} kind="subtitles" srcLang={track.lang} label={t(`video.track.${track.lang}`)} src={track.src} default={i === 0} />
        ))}
      </video>
    );
  }

  if (status.kind === "error") {
    return (
      <div className={`${box} p-4 text-center`} role="alert">
        <p className="text-sm">{t("video.error")}</p>
        <button type="button" onClick={() => void load()} className="min-h-12 rounded-lg bg-white/15 px-4 font-semibold">
          {t("video.retry")}
        </button>
      </div>
    );
  }

  const loading = status.kind === "loading";
  return (
    <button
      type="button"
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? t("video.loading") : `${t("video.play")}: ${label}`}
      onClick={() => void load()}
      className={`${box} relative`}
    >
      {video.poster && <img src={video.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
      <span aria-hidden className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl shadow-lg">
        {loading ? "…" : "▶"}
      </span>
      <span className="relative font-semibold drop-shadow">{loading ? t("video.loading") : t("video.play")}</span>
    </button>
  );
}
