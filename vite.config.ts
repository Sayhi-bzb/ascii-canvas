import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths by default to avoid blank pages on subpath deploys.
  base: process.env.VITE_BASE_PATH || "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }
          if (id.includes("@radix-ui")) {
            return "ui-radix";
          }
          if (
            id.includes("@use-gesture/react") ||
            id.includes("ahooks") ||
            id.includes("yjs")
          ) {
            return "gesture-utils";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
});
