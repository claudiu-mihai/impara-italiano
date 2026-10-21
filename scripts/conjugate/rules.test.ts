import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";
import { passatoProssimo, presenteRegular, regularParticiple, type VerbEntry } from "./rules.ts";

const verb = (over: Partial<VerbEntry>): VerbEntry => ({
  id: "v-x",
  it: "parlare",
  group: "are",
  auxiliary: "avere",
  pastParticiple: "parlato",
  irregular: false,
  reflexive: false,
  ...over,
});

test("presente -are: regulat și cu modificări ortografice", () => {
  assert.deepEqual(presenteRegular("parlare", "are"), ["parlo", "parli", "parla", "parliamo", "parlate", "parlano"]);
  assert.deepEqual(presenteRegular("giocare", "are"), ["gioco", "giochi", "gioca", "giochiamo", "giocate", "giocano"]);
  assert.deepEqual(presenteRegular("mangiare", "are"), ["mangio", "mangi", "mangia", "mangiamo", "mangiate", "mangiano"]);
  assert.deepEqual(presenteRegular("cominciare", "are"), ["comincio", "cominci", "comincia", "cominciamo", "cominciate", "cominciano"]);
  assert.deepEqual(presenteRegular("lasciare", "are"), ["lascio", "lasci", "lascia", "lasciamo", "lasciate", "lasciano"]);
});

test("presente -ere, -ire și -ire cu -isc-", () => {
  assert.deepEqual(presenteRegular("credere", "ere"), ["credo", "credi", "crede", "crediamo", "credete", "credono"]);
  assert.deepEqual(presenteRegular("dormire", "ire"), ["dormo", "dormi", "dorme", "dormiamo", "dormite", "dormono"]);
  assert.deepEqual(presenteRegular("aprire", "ire"), ["apro", "apri", "apre", "apriamo", "aprite", "aprono"]);
  assert.deepEqual(presenteRegular("capire", "isc"), ["capisco", "capisci", "capisce", "capiamo", "capite", "capiscono"]);
  assert.deepEqual(presenteRegular("finire", "isc"), ["finisco", "finisci", "finisce", "finiamo", "finite", "finiscono"]);
});

test("participiu regulat", () => {
  assert.equal(regularParticiple("parlare", "are"), "parlato");
  assert.equal(regularParticiple("credere", "ere"), "creduto");
  assert.equal(regularParticiple("dormire", "ire"), "dormito");
  assert.equal(regularParticiple("finire", "isc"), "finito");
});

test("passato prossimo cu avere", () => {
  const forms = passatoProssimo(verb({}));
  assert.deepEqual(forms[0], ["ho parlato"]);
  assert.deepEqual(forms[3], ["abbiamo parlato"]);
  assert.deepEqual(forms[5], ["hanno parlato"]);
});

test("passato prossimo cu essere: acord la gen și număr", () => {
  const forms = passatoProssimo(verb({ it: "andare", auxiliary: "essere", pastParticiple: "andato" }));
  assert.deepEqual(forms[0], ["sono andato", "sono andata"]);
  assert.deepEqual(forms[2], ["è andato", "è andata"]);
  assert.deepEqual(forms[3], ["siamo andati", "siamo andate"]);
  assert.deepEqual(forms[5], ["sono andati", "sono andate"]);
});

test("passato prossimo cu auxiliar both: avere primul, apoi essere", () => {
  const forms = passatoProssimo(verb({ it: "potere", auxiliary: "both", pastParticiple: "potuto" }));
  assert.deepEqual(forms[0], ["ho potuto", "sono potuto", "sono potuta"]);
  assert.deepEqual(forms[3], ["abbiamo potuto", "siamo potuti", "siamo potute"]);
});

test("essere: sono stato / sono stata", () => {
  const forms = passatoProssimo(verb({ it: "essere", auxiliary: "essere", pastParticiple: "stato" }));
  assert.deepEqual(forms[0], ["sono stato", "sono stata"]);
});

test("formele neregulate din irregular.json au 6 persoane", () => {
  const file = resolve(import.meta.dirname, "../../content/verbs/irregular.json");
  const { presente } = JSON.parse(readFileSync(file, "utf8"));
  for (const [id, forms] of Object.entries<string[]>(presente)) {
    assert.equal(forms.length, 6, id);
  }
});
