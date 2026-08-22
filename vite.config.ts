import { join } from "node:path";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

process.env.VITE_SPA = "true";

export default defineConfig({
  appType: "spa",
  define: {
    "import.meta.env.VITE_SPA": JSON.stringify("true"),
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": join(process.cwd(), "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
