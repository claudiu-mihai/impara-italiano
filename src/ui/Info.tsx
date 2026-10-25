import { useId, useState, type ReactNode } from "react";
import { useT } from "../i18n/index.ts";

/** Starea unui buton (i) și a casetei lui: ids pentru `aria-controls` / `aria-describedby` și comutatorul. */
export function useInfo() {
  const id = useId();
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen((o) => !o), labelId: `${id}-label`, boxId: `${id}-info` };
}

interface InfoButtonProps {
  open: boolean;
  onToggle: () => void;
  /** Id-ul casetei de informații (`aria-controls`). */
  boxId: string;
  /** Id-ul textului la care se referă informația (descrierea butonului). */
  labelId: string;
}

/**
 * Butonul (i). Se numește doar „Informații”, iar elementul la care se referă este descrierea lui: numele câmpului nu
 * apare și în numele butonului, ca să nu fie confundat cu câmpul însuși.
 */
export function InfoButton({ open, onToggle, boxId, labelId }: InfoButtonProps) {
  const { t } = useT();
  return (
    <button
      type="button"
      aria-label={t("info.label")}
      aria-describedby={labelId}
      aria-expanded={open}
      aria-controls={boxId}
      onClick={onToggle}
      className="-my-2 flex size-12 shrink-0 items-center justify-center text-muted"
    >
      <span
        aria-hidden="true"
        className={`flex size-5 items-center justify-center rounded-full border text-xs font-bold ${
          open ? "border-brand bg-brand text-white" : "border-current"
        }`}
      >
        i
      </span>
    </button>
  );
}

/** Caseta cu explicația, afișată sub rândul sau titlul cu butonul (i). */
export function InfoBox({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="note" className="mt-1 rounded-xl bg-sky-50 p-3 text-sm text-sky-950 dark:bg-slate-800 dark:text-sky-100">
      {children}
    </p>
  );
}

/** Titlul unei secțiuni cu butonul (i) alături și caseta de informații dedesubt. */
export function InfoHeading({ id, title, className, children }: { id: string; title: string; className: string; children: ReactNode }) {
  const info = useInfo();
  return (
    <>
      <div className="flex items-center">
        <h2 id={id} className={className}>
          {title}
        </h2>
        <InfoButton open={info.open} onToggle={info.toggle} boxId={info.boxId} labelId={id} />
      </div>
      {info.open && <InfoBox id={info.boxId}>{children}</InfoBox>}
    </>
  );
}
