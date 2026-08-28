import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

process.env.VITE_SPA = "true";

function spaIsolatePlugin(): Plugin {
  const stub = join(process.cwd(), "src/lib/rpc-stub.ts");
  const blocked = [
    "catalog-rpc",
    "studio-rpc",
    "roles-rpc",
    "commerce-rpc",
    "floor-auth-rpc",
    "/lib/db",
    "auth/server",
    "auth/middleware",
    "verify.server",
    "isolation.server",
    "popup.server",
    "pglite-dialect",
    "@electric-sql/pglite",
    "@tanstack/react-start",
    "@tanstack/start-server-core",
    "@tanstack/start-client-core",
    "tanstack-start-manifest",
    "#tanstack-start",
  ];
  return {
    name: "drape:spa-isolate",
    enforce: "pre",
    resolveId(id) {
      const bare = id.split("?")[0]?.replace(/\\/g, "/") ?? id;
      if (blocked.some((token) => bare.includes(token))) return stub;
      return null;
    },
  };
}

function spaHtmlInput() {
  const root = process.cwd();
  const indexHtml = join(root, "index.html");
  if (existsSync(indexHtml)) return indexHtml;
  return join(root, "spa.html");
}

export default defineConfig({
  appType: "spa",
  define: {
    "import.meta.env.VITE_SPA": JSON.stringify("true"),
  },
  plugins: [
    spaIsolatePlugin(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "^api$",
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
    rollupOptions: { input: spaHtmlInput() },
  },
});
