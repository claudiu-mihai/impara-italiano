import { useId, type ReactNode } from "react";
import type { CatItem } from "../domain/topics/cat.ts";
import { lupinoSrc, type LupinoPose } from "./mascot/Lupino.tsx";

interface CatSceneProps {
  item: CatItem;
  size?: number;
}

const INK = "#2b2420";
const outline = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const };

/** Cât din pătratul desenului ocupă Lupino în fiecare ipostază (x0, y0, x1, y1), ca să-l așezăm pe picioare. */
const BBOX: Partial<Record<LupinoPose, [number, number, number, number]>> = {
  ciao: [0.125, 0.018, 0.882, 0.978],
  relax: [0.203, 0.028, 0.795, 0.975],
  bravo: [0.102, 0.02, 0.89, 0.98],
};

/** Lupino centrat orizontal pe `cx`, cu picioarele la `feet` și înălțimea vizibilă `height`. */
function LupinoAt({ pose, cx, feet, height }: { pose: LupinoPose; cx: number; feet: number; height: number }) {
  const [x0, y0, x1, y1] = BBOX[pose]!;
  const size = height / (y1 - y0);
  return <image href={lupinoSrc(pose)} x={cx - (size * (x0 + x1)) / 2} y={feet - size * y1} width={size} height={size} />;
}

const Table = ({ x }: { x: number }) => (
  <g {...outline}>
    <rect x={x + 10} y="106" width="10" height="64" fill="#a8693a" />
    <rect x={x + 100} y="106" width="10" height="64" fill="#a8693a" />
    <rect x={x} y="94" width="120" height="13" rx="3" fill="#c98b4f" />
  </g>
);

const Chair = ({ x }: { x: number }) => (
  <g {...outline} fill="#3f74c4">
    <rect x={x + 30} y="76" width="8" height="94" />
    <rect x={x + 2} y="128" width="7" height="42" />
    <rect x={x} y="120" width="40" height="9" rx="2" />
    <rect x={x + 26} y="76" width="16" height="9" rx="2" />
  </g>
);

/** Spatele cutiei: la cutia deschisă, clapele și interiorul (desenate înaintea lui Lupino). */
const BoxBack = ({ open }: { open: boolean }) =>
  open ? (
    <>
      <g {...outline} fill="#c48a45">
        <path d="M105 118 L84 96 L122 96 L140 118 Z" />
        <path d="M195 118 L216 96 L178 96 L160 118 Z" />
      </g>
      <rect x="105" y="110" width="90" height="10" fill="#7a4b22" {...outline} />
    </>
  ) : null;

/** Fața cutiei: acoperă ce e în spatele sau înăuntrul ei; cutia închisă are capac și bandă adezivă. */
const BoxFront = ({ open }: { open: boolean }) => (
  <>
    <rect x="105" y="118" width="90" height="52" fill="#d6a15c" {...outline} />
    {!open && (
      <>
        <rect x="143" y="118" width="14" height="52" fill="#ecc98d" stroke={INK} strokeWidth="2" />
        <rect x="101" y="112" width="98" height="12" rx="2" fill="#c48a45" {...outline} />
      </>
    )}
  </>
);

/**
 * Scena din „Unde e Lupino?”: Lupino față de o masă, o masă cu scaun sau o cutie. Elementele se desenează în ordine,
 * ca mobila să-l acopere pe Lupino când e în spate sau înăuntru. „Dietro il tavolo” îl arată doar deasupra blatului
 * (altfel s-ar vedea întreg printre picioarele mesei, ca „sotto”). „Accanto” are cutia închisă, „fuori” deschisă și goală.
 */
export function CatScene({ item, size = 300 }: CatSceneProps) {
  // useId dă id-uri cu „:”, pe care le sanitizăm ca să intre sigur în url(#…)
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const scenes: Record<string, ReactNode> = {
    "table-on": (
      <>
        <Table x={90} />
        <LupinoAt pose="ciao" cx={150} feet={95} height={74} />
      </>
    ),
    "table-under": (
      <>
        <Table x={90} />
        <LupinoAt pose="relax" cx={150} feet={170} height={56} />
      </>
    ),
    "table-front": (
      <>
        <Table x={90} />
        <LupinoAt pose="ciao" cx={150} feet={206} height={104} />
      </>
    ),
    "table-behind": (
      <>
        <clipPath id={clipId}>
          <rect width="300" height="96" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <LupinoAt pose="ciao" cx={150} feet={140} height={96} />
        </g>
        <Table x={90} />
      </>
    ),
    "table-beside": (
      <>
        <Table x={70} />
        <LupinoAt pose="ciao" cx={248} feet={170} height={82} />
      </>
    ),
    "table-between": (
      <>
        <Table x={14} />
        <Chair x={232} />
        <LupinoAt pose="ciao" cx={186} feet={170} height={70} />
      </>
    ),
    "box-inside": (
      <>
        <BoxBack open />
        <LupinoAt pose="ciao" cx={150} feet={156} height={80} />
        <BoxFront open />
      </>
    ),
    "box-on": (
      <>
        <BoxFront open={false} />
        <LupinoAt pose="ciao" cx={150} feet={113} height={76} />
      </>
    ),
    "box-front": (
      <>
        <BoxFront open={false} />
        <LupinoAt pose="ciao" cx={150} feet={206} height={104} />
      </>
    ),
    "box-behind": (
      <>
        <LupinoAt pose="ciao" cx={150} feet={160} height={92} />
        <BoxFront open={false} />
      </>
    ),
    "box-beside": (
      <>
        <BoxFront open={false} />
        <LupinoAt pose="relax" cx={248} feet={170} height={82} />
      </>
    ),
    "box-outside": (
      <>
        <BoxBack open />
        <BoxFront open />
        <LupinoAt pose="bravo" cx={248} feet={170} height={84} />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 300 210" width={size} role="img" aria-label="Scenă cu Lupino" className="max-w-full rounded-2xl">
      <rect width="300" height="170" fill="#f3efe7" />
      <rect y="170" width="300" height="40" fill="#e2cfae" />
      <line x1="0" y1="170" x2="300" y2="170" stroke="#c8ad84" strokeWidth="2" />
      {scenes[item.id]}
    </svg>
  );
}
