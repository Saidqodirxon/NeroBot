import { defineConfig } from "vite";

// Simple Vite config without ESM-only plugin to avoid build-time issues
export default defineConfig({
  build: {
    outDir: "dist",
  },
});
