import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "Impara l'Italiano",
        short_name: "Impara",
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
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,webmanifest}"],
        navigateFallback: "index.html",
        // /api/ este serverul de sincronizare (PocketBase), nu o pagină a aplicației
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // în dezvoltare și la `vite preview`, /api/ merge la PocketBase (în producție îl trimite nginx)
  server: { proxy: { "/api": process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090" } },
  preview: { proxy: { "/api": process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090" } },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
