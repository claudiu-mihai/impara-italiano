import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// versiunea aplicației (SemVer) vine din package.json, unde o urcă release-please
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        // numele aplicației instalate pe telefon
        name: "Lupino",
        short_name: "Lupino",
        description: "Învață italiana cu repetiție spațiată, direct pe telefon.",
        lang: "ro",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f8fafc",
        theme_color: "#009246",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,json,webmanifest}"],
        // clipurile (și imaginile lor) nu se descarcă la instalare: sunt mari și se văd rar
        globIgnores: ["video/**"],
        navigateFallback: "index.html",
        // /api/ este serverul de sincronizare (PocketBase), nu o pagină a aplicației
        navigateFallbackDenylist: [/^\/api\//],
        // înregistrările (audio pregenerat) nu intră la instalare: se salvează la prima ascultare și merg apoi offline;
        // Safari cere bucăți din fișier (Range), de aici rangeRequests
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/audio/"),
            handler: "CacheFirst",
            options: {
              cacheName: "audio",
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 2000 },
            },
          },
          // un clip văzut o dată rămâne în cache și merge fără internet (VideoPlayer îl cere întreg, nu pe bucăți)
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/video/"),
            handler: "CacheFirst",
            options: {
              cacheName: "video",
              expiration: { maxEntries: 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // module foarte mici, folosite și la pornire, și de ecranele încărcate la cerere: stau în același fișier, pentru
          // că fiecare fișier în plus e încă o cerere la prima încărcare (testul de viteză din perf.spec.ts)
          groups: [
            {
              name: "startup-small",
              test: /src\/domain\/(session\/(buildDailySession|guidedOrder)|content\/(display|levels)|srs\/(mastery|fsrsConstants)|grading\/normalize|random|sync\/serialize)\.ts$/,
            },
          ],
        },
      },
    },
  },
  // în dezvoltare și la `vite preview`, /api/ merge la PocketBase (în producție îl trimite nginx)
  server: { proxy: { "/api": process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090" } },
  preview: { proxy: { "/api": process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090" } },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
