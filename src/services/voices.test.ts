import { expect, test } from "vitest";
import { hasLocalItalianVoice, isCloudVoice, isSystemVoice, pickVoice, type VoiceInfo } from "./voices.ts";

const voice = (name: string, lang: string, localService = true): VoiceInfo => ({
  name,
  lang,
  localService,
  voiceURI: `uri:${name}`,
});

const alice = voice("Alice", "it-IT");
const luca = voice("Luca (Enhanced)", "it_IT");
const google = voice("Google italiano", "it-IT", false);
const samantha = voice("Samantha", "en-US");

test("ignoră vocile care nu sunt italiene", () => {
  expect(pickVoice([samantha], { online: true })).toBeUndefined();
});

test("preferă vocea locală din sistem în fața celei de rețea, chiar online", () => {
  expect(pickVoice([google, alice], { online: true })).toBe(alice);
});

test("între vocile locale o preferă pe cea de calitate superioară (Enhanced/Premium)", () => {
  expect(pickVoice([alice, luca], { online: true })).toBe(luca);
  expect(pickVoice([alice, voice("Federica (Premium)", "it-IT")], { online: false })?.name).toBe("Federica (Premium)");
});

test("fără internet folosește doar voci locale", () => {
  expect(pickVoice([google], { online: false })).toBeUndefined();
  expect(pickVoice([google, alice], { online: false })).toBe(alice);
});

test("fără voce locală, online, se folosește vocea de rețea", () => {
  expect(pickVoice([samantha, google], { online: true })).toBe(google);
});

test("vocea aleasă de utilizator are prioritate, dacă mai e disponibilă", () => {
  expect(pickVoice([alice, luca], { online: true, preferredURI: alice.voiceURI })).toBe(alice);
  expect(pickVoice([alice, luca], { online: true, preferredURI: "uri:disparuta" })).toBe(luca);
  // o voce de rețea aleasă nu se folosește fără internet
  expect(pickVoice([google, alice], { online: false, preferredURI: google.voiceURI })).toBe(alice);
});

test("recunoaște dacă există o voce italiană locală", () => {
  expect(hasLocalItalianVoice([samantha, google])).toBe(false);
  expect(hasLocalItalianVoice([samantha, alice])).toBe(true);
});

// Edge declară vocile Microsoft din cloud ca „locale”; trebuie recunoscute după nume.
const msOnline = voice("Microsoft Elsa Online (Natural) - Italian (Italy)", "it-IT", true);

test("Edge: vocea Microsoft Online (Natural) declarată „locală” nu este tratată ca voce de sistem", () => {
  expect(isCloudVoice(msOnline)).toBe(true);
  expect(isSystemVoice(msOnline)).toBe(false);
  expect(hasLocalItalianVoice([msOnline])).toBe(false);
});

test("Edge pe Mac: vocea macOS este aleasă chiar dacă vocea Microsoft apare prima în listă", () => {
  expect(pickVoice([msOnline, alice], { online: true })).toBe(alice);
  expect(pickVoice([msOnline, alice, luca], { online: true })).toBe(luca);
});

test("Edge: fără internet nu se folosește vocea Microsoft Online, chiar declarată locală", () => {
  expect(pickVoice([msOnline], { online: false })).toBeUndefined();
  expect(pickVoice([msOnline, alice], { online: false })).toBe(alice);
});

test("vocile Microsoft desktop (Windows) rămân voci de sistem", () => {
  const desktop = voice("Microsoft Elsa - Italian (Italy)", "it-IT", true);
  expect(isSystemVoice(desktop)).toBe(true);
  expect(pickVoice([msOnline, desktop], { online: true })).toBe(desktop);
});
