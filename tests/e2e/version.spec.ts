import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("ecranul Despre arată versiunea aplicației din package.json (SemVer)", async ({ page }) => {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);

  await page.goto("/about");
  await expect(page.getByTestId("app-version")).toHaveText(version);
});
