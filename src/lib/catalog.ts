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
import { listPreviewPieces } from "@/lib/preview-rail";

export async function listProducts(opts: { data?: ProductFilter } = {}) {
  const data = opts.data ?? {};
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listProductsRpc } = await import("@/lib/catalog-rpc");
      const rows = await listProductsRpc({ data });
      if (rows.length) {
        const extra = listPreviewPieces().filter((p) => !rows.some((row) => row.slug === p.slug));
        return filterProducts([...extra, ...rows], data);
      }
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
      const found = await getProductRpc({ data: opts.data });
      if (found) return found;
    } catch {
      /* live floor */
    }
  }
  return (
    (await liveFloor()).products.find((p) => p.slug === opts.data) ??
    listPreviewPieces().find((p) => p.slug === opts.data) ??
    null
  );
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
  const fromFloor = designersOf(await liveFloor());
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { listDesignersRpc } = await import("@/lib/catalog-rpc");
      const rows = await listDesignersRpc();
      if (rows.length) {
        const extra = fromFloor.filter((d) => !rows.some((row) => row.slug === d.slug));
        return [...extra, ...rows];
      }
    } catch {
      /* live floor */
    }
  }
  return fromFloor;
}

export async function getDesigner(opts: { data: string }) {
  if (import.meta.env.DEV || import.meta.env.SSR) {
    try {
      const { getDesignerRpc } = await import("@/lib/catalog-rpc");
      const found = await getDesignerRpc({ data: opts.data });
      if (found) return found;
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
      const found = await getLookbookRpc({ data: opts.data });
      if (found) return found;
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
