import type { CatItem } from "../domain/topics/cat.ts";

interface CatSceneProps {
  item: CatItem;
  /** Textul alternativ nu dezvăluie răspunsul; descrie doar ce e desenat. */
  size?: number;
}

const Table = ({ x = 90 }: { x?: number }) => (
  <g fill="#92400e" stroke="#451a03" strokeWidth="1.5">
    <rect x={x} y="100" width="120" height="10" rx="2" />
    <rect x={x + 8} y="110" width="8" height="60" />
    <rect x={x + 104} y="110" width="8" height="60" />
  </g>
);

const Chair = ({ x }: { x: number }) => (
  <g fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.5">
    <rect x={x} y="120" width="36" height="8" rx="2" />
    <rect x={x} y="128" width="6" height="42" />
    <rect x={x + 30} y="128" width="6" height="42" />
    <rect x={x + 30} y="80" width="6" height="42" />
  </g>
);

const Box = () => (
  <g>
    <rect x="115" y="130" width="70" height="40" fill="#d97706" stroke="#78350f" strokeWidth="2" />
    <rect x="115" y="130" width="70" height="8" fill="#b45309" stroke="#78350f" strokeWidth="2" />
  </g>
);

const Cat = ({ x, y, size = 40 }: { x: number; y: number; size?: number }) => (
  <text x={x} y={y} fontSize={size} textAnchor="middle" aria-hidden="true">
    🐱
  </text>
);

/** Scena din „Unde e pisica?”: pisica față de o masă, o masă cu scaun sau o cutie. */
export function CatScene({ item, size = 300 }: CatSceneProps) {
  const { scene, position } = item;

  let content;
  if (scene === "box") {
    // dentro / dietro: pisica se desenează înaintea cutiei, ca să fie acoperită parțial
    const beforeBox: Record<string, [number, number, number]> = {
      inside: [150, 155, 40],
      behind: [172, 165, 42],
    };
    const afterBox: Record<string, [number, number, number]> = {
      on: [150, 130, 40],
      front: [150, 196, 52],
      beside: [235, 168, 42],
      outside: [235, 168, 42],
    };
    const before = beforeBox[position];
    const after = afterBox[position];
    content = (
      <>
        {before && <Cat x={before[0]} y={before[1]} size={before[2]} />}
        <Box />
        {after && <Cat x={after[0]} y={after[1]} size={after[2]} />}
      </>
    );
  } else if (scene === "table-chair") {
    content = (
      <>
        <Table x={30} />
        <Chair x={220} />
        <Cat x={185} y={168} size={40} />
      </>
    );
  } else {
    const before = position === "behind" ? [150, 150, 36] : undefined;
    const after: Record<string, [number, number, number]> = {
      on: [150, 99, 40],
      under: [150, 168, 36],
      front: [150, 198, 52],
      beside: [245, 168, 42],
    };
    const a = after[position];
    content = (
      <>
        {before && <Cat x={before[0]} y={before[1]} size={before[2]} />}
        <Table />
        {a && <Cat x={a[0]} y={a[1]} size={a[2]} />}
      </>
    );
  }

  return (
    <svg viewBox="0 0 300 210" width={size} role="img" aria-label="Scenă cu o pisică" className="max-w-full rounded-2xl bg-sky-50">
      <rect x="0" y="170" width="300" height="40" fill="#bbf7d0" />
      <line x1="0" y1="170" x2="300" y2="170" stroke="#4ade80" strokeWidth="2" />
      {content}
    </svg>
  );
}
