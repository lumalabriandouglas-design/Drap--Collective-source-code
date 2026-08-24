const KEY = "drape.theme.v1";

export type HouseTheme = "ivory" | "charcoal";

export function readTheme(): HouseTheme {
  if (typeof window === "undefined") return "ivory";
  try {
    return window.localStorage.getItem(KEY) === "charcoal" ? "charcoal" : "ivory";
  } catch {
    return "ivory";
  }
}

export function applyTheme(theme: HouseTheme) {
  if (typeof document === "undefined") return;
  if (theme === "charcoal") document.documentElement.dataset.theme = "charcoal";
  else delete document.documentElement.dataset.theme;
}

export function writeTheme(theme: HouseTheme) {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}
