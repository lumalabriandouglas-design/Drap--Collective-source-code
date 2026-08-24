const KEY = "drape.listing-draft.v1";

export type ListingDraft = {
  name: string;
  description: string;
  category: string;
  price: string;
  leadTime: string;
  imageUrls: string[];
  sizes: string[];
  savedAt: number;
};

export function readListingDraft(): ListingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListingDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      name: String(parsed.name ?? ""),
      description: String(parsed.description ?? ""),
      category: String(parsed.category ?? "Ready-to-Wear"),
      price: String(parsed.price ?? "150000"),
      leadTime: String(parsed.leadTime ?? ""),
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(Boolean) : [],
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes.map(String) : ["S", "M", "L"],
      savedAt: Number(parsed.savedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeListingDraft(draft: Omit<ListingDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  const payload: ListingDraft = { ...draft, savedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...payload, imageUrls: [] }));
    } catch {
      /* quota */
    }
  }
}

export function clearListingDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function draftIsEmpty(draft: ListingDraft) {
  return !draft.name.trim() && !draft.description.trim() && draft.imageUrls.length === 0;
}
