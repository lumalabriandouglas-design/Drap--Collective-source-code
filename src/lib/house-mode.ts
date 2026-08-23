/**
 * Static dist house (Vercel preview). Compile-time constant — Vite replaces
 * `import.meta.env.VITE_SPA`. Never treat the Grok SSR house as static.
 */
export const staticFloor = import.meta.env.VITE_SPA === "true";
