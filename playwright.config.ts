import { defineConfig, devices } from "@playwright/test";

// Testele E2E rulează pe build-ul de producție (service worker-ul se înregistrează doar acolo).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: [
    // serverul de sincronizare (PocketBase), curat la fiecare rulare; /api/ al aplicației ajunge aici prin proxy-ul Vite
    {
      command: "node scripts/pocketbase/dev.ts",
      url: "http://127.0.0.1:8090/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
