
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "icon-192.png",
        "icon-512.png",
      ],

      manifest: {
        id: "/",
        name: "CAM.exe",
        short_name: "CAM.exe",

        description:
          "Your personal time machine. Capture memories, explore nostalgic filters and create cinematic videos.",

        theme_color: "#F3EEE5",
        background_color: "#F3EEE5",

        display: "standalone",
        orientation: "any",

        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2}",
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
