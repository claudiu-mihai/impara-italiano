import { expect, test } from "vitest";
import { parseOpenGroups, serializeOpenGroups } from "./openGroups.ts";

test("fără nimic salvat, toate categoriile sunt închise", () => {
  expect(parseOpenGroups(null)).toEqual([]);
  expect(parseOpenGroups("")).toEqual([]);
});

test("categoriile salvate se citesc înapoi, în ordinea din listă", () => {
  expect(parseOpenGroups(serializeOpenGroups(["oras", "timp"]))).toEqual(["timp", "oras"]);
});

test("date stricate sau străine se ignoră", () => {
  expect(parseOpenGroups("{nu e json")).toEqual([]);
  expect(parseOpenGroups('{"timp":true}')).toEqual([]);
  expect(parseOpenGroups('["timp","inexistent",3,null,"timp"]')).toEqual(["timp"]);
});
