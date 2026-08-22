import {
  designerOf,
  designersOf,
  filterProducts,
  liveFloor,
  lookbookOf,
  recommendOf,
  relatedOf,
  type ProductFilter,
} from "@/lib/catalog-core";

export async function listProducts(opts: { data?: ProductFilter } = {}) {
  const data = opts.data ?? {};
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listProductsRpc } = await import("@/lib/catalog-rpc");
      return await listProductsRpc({ data });
    } catch {
      /* live floor */
    }
  }
  return filterProducts((await liveFloor()).products, data);
}

export async function getProduct(opts: { data: string }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { getProductRpc } = await import("@/lib/catalog-rpc");
      return await getProductRpc({ data: opts.data });
    } catch {
      /* live floor */
    }
  }
  return (await liveFloor()).products.find((p) => p.slug === opts.data) ?? null;
}

export async function listRelated(opts: {
  data: { slug: string; category: string; designerSlug: string };
}) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listRelatedRpc } = await import("@/lib/catalog-rpc");
      return await listRelatedRpc({ data: opts.data });
    } catch {
      /* live floor */
    }
  }
  return relatedOf(await liveFloor(), opts.data);
}

export async function listDesigners() {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listDesignersRpc } = await import("@/lib/catalog-rpc");
      return await listDesignersRpc();
    } catch {
      /* live floor */
    }
  }
  return designersOf(await liveFloor());
}

export async function getDesigner(opts: { data: string }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { getDesignerRpc } = await import("@/lib/catalog-rpc");
      return await getDesignerRpc({ data: opts.data });
    } catch {
      /* live floor */
    }
  }
  return designerOf(await liveFloor(), opts.data);
}

export async function listLookbooks() {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listLookbooksRpc } = await import("@/lib/catalog-rpc");
      return await listLookbooksRpc();
    } catch {
      /* live floor */
    }
  }
  return (await liveFloor()).lookbooks;
}

export async function getLookbook(opts: { data: string }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { getLookbookRpc } = await import("@/lib/catalog-rpc");
      return await getLookbookRpc({ data: opts.data });
    } catch {
      /* live floor */
    }
  }
  return lookbookOf(await liveFloor(), opts.data);
}

export async function recommendProducts(opts: { data: string[] }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { recommendProductsRpc } = await import("@/lib/catalog-rpc");
      return await recommendProductsRpc({ data: opts.data });
    } catch {
      /* live floor */
    }
  }
  return recommendOf(await liveFloor(), opts.data);
}
