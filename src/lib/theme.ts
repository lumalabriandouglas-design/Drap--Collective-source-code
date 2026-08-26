const KEY = "drape.theme";
const EVENT = "drape-theme";

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
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "charcoal" ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "charcoal" ? "#161110" : "#F6F1EA");
}

export function setTheme(theme: HouseTheme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(KEY, theme);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* private browsing */
  }
}

export function toggleTheme() {
  setTheme(readTheme() === "charcoal" ? "ivory" : "charcoal");
}

export function bootTheme() {
  applyTheme(readTheme());
}
