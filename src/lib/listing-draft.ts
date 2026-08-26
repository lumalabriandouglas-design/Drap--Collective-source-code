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
    return parsed;
  } catch {
    return null;
  }
}

export function saveListingDraft(draft: Omit<ListingDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* quota */
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

export function draftIsUseful(draft: ListingDraft | null) {
  if (!draft) return false;
  return Boolean(
    draft.name.trim() ||
      draft.description.trim() ||
      draft.imageUrls.length,
  );
}
