import { expect, test } from "vitest";
import {
  buildSentenceRound,
  isCorrectArrangement,
  scrambleOrder,
  sentenceText,
  type SentenceItem,
} from "./sentenceRound.ts";
import { acceptedOrders, tokenizeSentence } from "./tokenize.ts";

function sentence(it: string, variants: string[] = [], wordIds = ["v-x"]): SentenceItem {
  const { tokens, punctuation } = tokenizeSentence(it);
  return { id: it, wordIds, it, ro: "…", tokens, punctuation, acceptedOrders: acceptedOrders(it, variants).orders };
}

test("tokenizare: punctuația finală este separată, primul cuvânt devine literă mică", () => {
  expect(tokenizeSentence("Domani vado al mare.")).toEqual({ tokens: ["domani", "vado", "al", "mare"], punctuation: "." });
  expect(tokenizeSentence("Dov'è la stazione?")).toEqual({ tokens: ["dov'è", "la", "stazione"], punctuation: "?" });
  expect(tokenizeSentence("Prendo un caffè, e tu?").tokens).toEqual(["prendo", "un", "caffè,", "e", "tu"]);
  expect(tokenizeSentence("Cominciamo!")).toEqual({ tokens: ["cominciamo"], punctuation: "!" });
});

test("numele proprii din interiorul propoziției își păstrează majuscula", () => {
  expect(tokenizeSentence("Conosci Marco?").tokens).toEqual(["conosci", "Marco"]);
});

test("variantele devin ordini de indici peste blocurile de bază", () => {
  const { orders, errors } = acceptedOrders("Domani vado al mare.", ["Vado al mare domani."]);
  expect(errors).toEqual([]);
  expect(orders).toEqual([[0, 1, 2, 3], [1, 2, 3, 0]]);
});

test("variantele invalide sunt raportate", () => {
  expect(acceptedOrders("Domani vado al mare.", ["Vado al mare."]).errors[0]).toMatch(/aceleași cuvinte/);
  expect(acceptedOrders("Domani vado al mare.", ["Vado al mare domani?"]).errors[0]).toMatch(/punctuație/);
  expect(acceptedOrders("Domani vado al mare.", ["Vado al lago domani."]).errors[0]).toMatch(/aceleași cuvinte/);
  expect(acceptedOrders("Domani vado al mare.", ["Domani vado al mare."]).orders).toHaveLength(1);
});

test("verificarea acceptă ordinea originală și variantele, nu alte ordini", () => {
  const s = sentence("Domani vado al mare.", ["Vado al mare domani."]);
  expect(isCorrectArrangement(s, [0, 1, 2, 3])).toBe(true);
  expect(isCorrectArrangement(s, [1, 2, 3, 0])).toBe(true);
  expect(isCorrectArrangement(s, [1, 0, 2, 3])).toBe(false);
  expect(isCorrectArrangement(s, [0, 1, 2])).toBe(false);
});

test("cuvintele repetate se compară după text, nu după poziție", () => {
  const s = sentence("La casa della nonna.");
  expect(isCorrectArrangement(s, [0, 1, 2, 3])).toBe(true);
  const twice = sentence("Io parlo e io scrivo.");
  // cele două „io” sunt interschimbabile
  expect(isCorrectArrangement(twice, [3, 1, 2, 0, 4])).toBe(true);
});

test("amestecarea nu produce o ordine deja corectă", () => {
  const s = sentence("Domani vado al mare.", ["Vado al mare domani."]);
  for (let i = 0; i < 100; i++) {
    const order = scrambleOrder(s);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(isCorrectArrangement(s, order)).toBe(false);
  }
});

test("textul afișat are prima literă mare și punctuația fixă", () => {
  expect(sentenceText(sentence("Domani vado al mare."))).toBe("Domani vado al mare.");
  const s = sentence("Domani vado al mare.", ["Vado al mare domani."]);
  expect(sentenceText(s, s.acceptedOrders[1])).toBe("Vado al mare domani.");
});

test("runda conține doar propoziții cu cuvinte deja învățate, amestecate și limitate la `size`", () => {
  const sentences = [
    sentence("Uno due tre.", [], ["v-a"]),
    sentence("Quattro cinque sei.", [], ["v-b"]),
    sentence("Sette otto nove.", [], ["v-c"]),
    sentence("Dieci undici dodici.", [], ["v-a", "v-c"]),
  ];
  const round = buildSentenceRound({ sentences, knownWordIds: new Set(["v-a", "v-c"]), size: 2 });
  expect(round).toHaveLength(2);
  expect(round.every((s) => s.wordIds.some((id) => id === "v-a" || id === "v-c"))).toBe(true);
  expect(buildSentenceRound({ sentences, knownWordIds: new Set() })).toEqual([]);
  expect(buildSentenceRound({ sentences, knownWordIds: new Set(["v-a", "v-b", "v-c"]) })).toHaveLength(4);
});
