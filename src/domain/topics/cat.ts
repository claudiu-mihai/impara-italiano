import { shuffle, type Random } from "../random.ts";

/** Scena desenată: pisica față de o masă, o masă cu scaun sau o cutie. */
export type CatScene = "table" | "table-chair" | "box";
export type CatPosition = "on" | "under" | "front" | "behind" | "beside" | "between" | "inside" | "outside";

export interface CatItem {
  id: string;
  scene: CatScene;
  position: CatPosition;
  /** Forma principală (afișată ca variantă și ca răspuns corect). */
  answer: string;
  /** Alte scrieri acceptate la răspunsul scris. */
  alternatives: string[];
}

/** Cele 12 poziții din exercițiul „Unde e pisica?”. */
export const CAT_ITEMS: readonly CatItem[] = [
  { id: "table-on", scene: "table", position: "on", answer: "sopra il tavolo", alternatives: ["sul tavolo"] },
  { id: "table-under", scene: "table", position: "under", answer: "sotto il tavolo", alternatives: [] },
  { id: "table-front", scene: "table", position: "front", answer: "davanti al tavolo", alternatives: [] },
  { id: "table-behind", scene: "table", position: "behind", answer: "dietro il tavolo", alternatives: ["dietro al tavolo"] },
  { id: "table-beside", scene: "table", position: "beside", answer: "accanto al tavolo", alternatives: ["vicino al tavolo"] },
  { id: "table-between", scene: "table-chair", position: "between", answer: "tra il tavolo e la sedia", alternatives: ["fra il tavolo e la sedia"] },
  { id: "box-inside", scene: "box", position: "inside", answer: "dentro la scatola", alternatives: ["nella scatola"] },
  { id: "box-on", scene: "box", position: "on", answer: "sopra la scatola", alternatives: ["sulla scatola"] },
  { id: "box-front", scene: "box", position: "front", answer: "davanti alla scatola", alternatives: [] },
  { id: "box-behind", scene: "box", position: "behind", answer: "dietro la scatola", alternatives: ["dietro alla scatola"] },
  { id: "box-beside", scene: "box", position: "beside", answer: "accanto alla scatola", alternatives: ["vicino alla scatola"] },
  { id: "box-outside", scene: "box", position: "outside", answer: "fuori dalla scatola", alternatives: ["fuori della scatola"] },
];

export interface CatQuestion {
  item: CatItem;
  /** `choose` = 4 variante; `write` = se scrie răspunsul. */
  mode: "choose" | "write";
  options: string[];
}

/** O rundă: prima jumătate cu variante, a doua cu răspuns scris. Variantele greșite vin din aceeași scenă ca să fie plauzibile. */
export function buildCatRound(size = 6, random: Random = Math.random): CatQuestion[] {
  const items = shuffle([...CAT_ITEMS], random).slice(0, size);
  return items.map((item, i) => {
    const sameScene = CAT_ITEMS.filter((o) => o.id !== item.id && o.scene.startsWith(item.scene.split("-")[0]!));
    const pool = shuffle(sameScene.length >= 3 ? sameScene : CAT_ITEMS.filter((o) => o.id !== item.id), random);
    const options = shuffle([item.answer, ...pool.slice(0, 3).map((o) => o.answer)], random);
    return { item, mode: i < Math.ceil(size / 2) ? "choose" : "write", options };
  });
}
