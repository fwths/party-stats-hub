import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    rollupConfig: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes(`"use client"`)) {
          return;
        }
        warn(warning);
      },
    },
  },
  vite: {
    plugins: [visualizer({ open: false, filename: "bundle-stats.html" })],
    ssr: {
      external: ["better-sqlite3"],
    },
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === "MODULE_LEVEL_DIRECTIVE" &&
            warning.message.includes(`"use client"`)
          ) {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
  },
});
