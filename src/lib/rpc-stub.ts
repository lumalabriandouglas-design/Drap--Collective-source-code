/** Vercel SPA stand-in — server RPCs and Start never load in the browser bundle. */
export const startInstance = null;
export const hasPluginAdapters = false;
export const pluginSerializationAdapters: unknown[] = [];
export const createServerFn = () => {
  throw new Error("Drapé Collective: server functions are not on this preview.");
};
export const getSql = createServerFn;
export const auth = {
  handler: async () => new Response(null, { status: 404 }),
};
export default {};
