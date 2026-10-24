import { expect, test } from "vitest";
import { greetingFor } from "./greeting.ts";

const at = (hour: number, minute = 0) => greetingFor(new Date(2026, 9, 24, hour, minute));

test("salutul după oră, cu limitele intervalelor", () => {
  expect(at(5).it).toBe("Buongiorno!");
  expect(at(11, 59).it).toBe("Buongiorno!");
  expect(at(12).it).toBe("Buon pomeriggio!");
  expect(at(16, 59).it).toBe("Buon pomeriggio!");
  expect(at(17).it).toBe("Buonasera!");
  expect(at(22, 59).it).toBe("Buonasera!");
  expect(at(23).it).toBe("Ciao! Non dormi?");
  expect(at(0).it).toBe("Ciao! Non dormi?");
  expect(at(4, 59).it).toBe("Ciao! Non dormi?");
});

test("fiecare salut are traducere și nu se folosește „Buonanotte” ca salut", () => {
  for (let hour = 0; hour < 24; hour++) {
    const g = at(hour);
    expect(g.ro.length).toBeGreaterThan(0);
    expect(g.it).not.toMatch(/buonanotte/i);
  }
});
