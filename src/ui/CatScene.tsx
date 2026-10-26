import type { ReactNode } from "react";
import { useT } from "../i18n/index.ts";
import type { CatItem } from "../domain/topics/cat.ts";
import { lupinoSrc, type LupinoPose } from "./mascot/Lupino.tsx";
import masaAccanto from "./mascot/lupino-masa-accanto.jpg";
import masaDavanti from "./mascot/lupino-masa-davanti.jpg";
import masaDietro from "./mascot/lupino-masa-dietro.jpg";
import masaSopra from "./mascot/lupino-masa-sopra.jpg";
import masaSotto from "./mascot/lupino-masa-sotto.jpg";
import scatolaAccanto from "./mascot/lupino-scatola-accanto.jpg";
import scatolaDavanti from "./mascot/lupino-scatola-davanti.jpg";
import scatolaDentro from "./mascot/lupino-scatola-dentro.jpg";
import scatolaDietro from "./mascot/lupino-scatola-dietro.jpg";
import scatolaFuori from "./mascot/lupino-scatola-fuori.jpg";
import scatolaSopra from "./mascot/lupino-scatola-sopra.jpg";

/** Ilustrațiile din design/dov-e-lupino/ (redimensionate la 1000 px); poziția „tra il tavolo e la sedia” e desenată în SVG. */
const SCENE_IMAGES: Record<string, string> = {
  "table-on": masaSopra,
  "table-under": masaSotto,
  "table-front": masaDavanti,
  "table-behind": masaDietro,
  "table-beside": masaAccanto,
  "box-inside": scatolaDentro,
  "box-on": scatolaSopra,
  "box-front": scatolaDavanti,
  "box-behind": scatolaDietro,
  "box-beside": scatolaAccanto,
  "box-outside": scatolaFuori,
};

interface CatSceneProps {
  item: CatItem;
  size?: number;
}

const INK = "#2b2420";
const outline = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const };

/** Cât din pătratul desenului ocupă Lupino în fiecare ipostază (x0, y0, x1, y1), ca să-l așezăm pe picioare. */
const BBOX: Partial<Record<LupinoPose, [number, number, number, number]>> = {
  ciao: [0.125, 0.018, 0.882, 0.978],
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

/**
 * Scena din „Unde e Lupino?”: ilustrații pentru toate pozițiile, mai puțin „tra il tavolo e la sedia”, desenată în SVG
 * (masă, scaun și Lupino între ele).
 */
export function CatScene({ item, size = 300 }: CatSceneProps) {
  const { t } = useT();
  const scenes: Record<string, ReactNode> = {
    "table-between": (
      <>
        <Table x={14} />
        <Chair x={232} />
        <LupinoAt pose="ciao" cx={186} feet={170} height={70} />
      </>
    ),
  };

  const photo = SCENE_IMAGES[item.id];
  if (photo) {
    return (
      <img
        src={photo}
        width={size}
        height={Math.round((size * 671) / 1000)}
        alt={t("cat.scene")}
        draggable={false}
        decoding="async"
        className="max-w-full rounded-2xl"
      />
    );
  }

  return (
    <svg viewBox="0 0 300 210" width={size} role="img" aria-label={t("cat.scene")} className="max-w-full rounded-2xl">
      <rect width="300" height="170" fill="#f3efe7" />
      <rect y="170" width="300" height="40" fill="#e2cfae" />
      <line x1="0" y1="170" x2="300" y2="170" stroke="#c8ad84" strokeWidth="2" />
      {scenes[item.id]}
    </svg>
  );
}
