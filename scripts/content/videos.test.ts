import { expect, test } from "vitest";
import { indexVideos, MAX_VIDEO_BYTES } from "./videos.ts";

const WORDS = new Set(["v-parlare", "n-casa", "x-perché"]);
const file = (name: string, size = 1000) => ({ name, size });

test("clip cu subtitrări (italiana întâi) și imagine de previzualizare", () => {
  const { videos, errors } = indexVideos(
    [file("v-parlare.ro.vtt"), file("v-parlare.mp4"), file("v-parlare.it.vtt"), file("v-parlare.jpg"), file("n-casa.webm")],
    WORDS,
  );
  expect(errors).toEqual([]);
  expect(videos).toEqual({
    "v-parlare": {
      src: "/video/v-parlare.mp4",
      type: "video/mp4",
      poster: "/video/v-parlare.jpg",
      tracks: [
        { lang: "it", src: "/video/v-parlare.it.vtt" },
        { lang: "ro", src: "/video/v-parlare.ro.vtt" },
      ],
    },
    "n-casa": { src: "/video/n-casa.webm", type: "video/webm", tracks: [] },
  });
});

test("numele cu diacritice descompuse (macOS) se potrivesc cu id-ul și se codifică în adresă", () => {
  const { videos, errors } = indexVideos([file("x-perché.mp4".normalize("NFD"))], WORDS);
  expect(errors).toEqual([]);
  expect(videos["x-perché"]?.src).toBe("/video/x-perch%C3%A9.mp4");
});

test("amprenta conținutului intră în adresă, ca un fișier înlocuit să nu rămână în cache", () => {
  const { videos } = indexVideos([{ name: "n-casa.mp4", size: 10, hash: "abc123" }, { name: "n-casa.it.vtt", size: 1, hash: "def456" }], WORDS);
  expect(videos["n-casa"]).toMatchObject({ src: "/video/n-casa.mp4?v=abc123", tracks: [{ lang: "it", src: "/video/n-casa.it.vtt?v=def456" }] });
});

test("erori: cuvânt inexistent, clip dublu, prea mare, subtitrare sau imagine fără clip, fișier necunoscut", () => {
  const { videos, errors } = indexVideos(
    [
      file("v-mangiare.mp4"),
      file("v-parlare.mp4"),
      file("v-parlare.webm"),
      file("n-casa.mp4", MAX_VIDEO_BYTES + 1),
      file("n-casa.it.vtt"),
      file("v-parlare.de.vtt"),
      file("x-perché.png"),
      file("note.txt"),
      file(".DS_Store"),
    ],
    WORDS,
  );
  expect(Object.keys(videos)).toEqual(["v-parlare"]);
  expect(errors).toHaveLength(7);
  expect(errors).toEqual(expect.arrayContaining([
    expect.stringContaining("nu există cuvântul „v-mangiare”"),
    expect.stringContaining("are deja un clip"),
    expect.stringContaining("peste limita"),
    expect.stringContaining("n-casa.it.vtt: subtitrare fără clipul"),
    expect.stringContaining("v-parlare.de.vtt: limba subtitrării"),
    expect.stringContaining("note.txt: fișier necunoscut"),
    expect.stringContaining("x-perché.png: imagine fără clipul"),
  ]));
});
