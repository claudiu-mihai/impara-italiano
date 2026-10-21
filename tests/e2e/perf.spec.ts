import { expect, test, type Page } from "@playwright/test";

/** Profiluri de rețea: latența este RTT-ul în ms, viteza în octeți/secundă. */
const NETWORKS = {
  // „4G” tipic din planul proiectului: ~9 Mbps, RTT ~170 ms
  "4G": { latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.6 * 1024 * 1024) / 8 },
  // „Slow 4G” din Lighthouse: 1,6 Mbps, RTT 150 ms
  "Slow 4G": { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
} as const;

async function throttle(page: Page, network: keyof typeof NETWORKS, cpu = 4) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...NETWORKS[network] });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
}

async function measureLcp(page: Page): Promise<number> {
  await expect(page.getByRole("heading", { name: "Impara l'Italiano" })).toBeVisible();
  await page.waitForTimeout(1500); // LCP se poate actualiza încă puțin după randare
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]!.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
}

test.describe("LCP pe telefon de gamă medie (procesor 4× mai lent)", () => {
  test("prima încărcare, fără cache, pe 4G", async ({ page }) => {
    await throttle(page, "4G");
    await page.goto("/");
    const lcp = await measureLcp(page);
    console.log(`LCP prima încărcare (4G): ${Math.round(lcp)} ms`);
    expect(lcp).toBeLessThan(1500);
  });

  test("încărcare repetată, cu service worker, pe 4G", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    await throttle(page, "4G");
    await page.reload();
    const lcp = await measureLcp(page);
    console.log(`LCP încărcare repetată (4G): ${Math.round(lcp)} ms`);
    expect(lcp).toBeLessThan(1500);
  });

  test("prima încărcare pe Slow 4G (Lighthouse)", async ({ page }) => {
    await throttle(page, "Slow 4G");
    await page.goto("/");
    const lcp = await measureLcp(page);
    console.log(`LCP prima încărcare (Slow 4G, Lighthouse): ${Math.round(lcp)} ms`);
    expect(lcp).toBeLessThan(1500);
  });
});
