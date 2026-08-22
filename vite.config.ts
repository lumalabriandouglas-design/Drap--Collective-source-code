import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

function copyNitroStaticToDist(): Plugin {
  return {
    name: "drape:nitro-static-to-dist",
    apply: "build",
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const src = join(process.cwd(), ".vercel/output/static");
        const dest = join(process.cwd(), "dist");
        if (!existsSync(src)) return;
        mkdirSync(dest, { recursive: true });
        cpSync(src, dest, { recursive: true });
      },
    },
  };
}

function renameSpaHtmlPlugin(): Plugin {
  return {
    name: "drape:spa-html-as-index",
    apply: "build",
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const spa = join(process.cwd(), "dist/spa.html");
        const index = join(process.cwd(), "dist/index.html");
        if (!existsSync(spa)) return;
        if (existsSync(index)) unlinkSync(index);
        renameSync(spa, index);
      },
    },
  };
}

const vercelSpa = process.env.VERCEL === "1";

function spaHtmlInput() {
  const root = process.cwd();
  const indexHtml = join(root, "index.html");
  if (existsSync(indexHtml)) return indexHtml;
  return join(root, "spa.html");
}

export default defineConfig(async ({ command, isPreview }) => {
  if (vercelSpa) {
    process.env.VITE_SPA = "true";
    const src = join(process.cwd(), "src");
    return {
      appType: "spa",
      server: {
        host: "0.0.0.0",
        port: 8080,
        strictPort: true,
      },
      preview: {
        host: "127.0.0.1",
        port: 8081,
        strictPort: true,
      },
      resolve: {
        tsconfigPaths: true,
        alias: { "@": src },
      },
      build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
          input: spaHtmlInput(),
        },
      },
      plugins: [
        tailwindcss(),
        tanstackRouter({
          target: "react",
          autoCodeSplitting: true,
        }),
        viteReact(),
        renameSpaHtmlPlugin(),
      ],
    };
  }

  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  const { nitro } = await import("nitro/vite");

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 8081,
      strictPort: true,
    },
    resolve: { tsconfigPaths: true },
    plugins: [
      pgliteBootstrapPlugin(),
      authPopupPlugin(),
      appEnvPlugin(),
      grokPwaPlugin(),
      tailwindcss(),
      tanstackStart(),
      ...(command === "build" || isPreview
        ? [
            nitro({
              preset: "vercel",
              serverDir: "./server",
            }),
          ]
        : []),
      copyNitroStaticToDist(),
      viteReact(),
    ],
  };
});
