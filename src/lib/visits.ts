/** Site visits — live floor first, this preview as a backup. */

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

const LOCAL_KEY = "drape.visits.v1";
const SESSION_KEY = "drape.visit-session";
const EVENT = "drape-visits";
const MIN_GAP_MS = 8_000;

export type VisitStats = {
  total: number;
  today: number;
  live: boolean;
};

type LocalBook = {
  total: number;
  day: string;
  today: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyBook(): LocalBook {
  return { total: 0, day: todayKey(), today: 0 };
}

function readBook(): LocalBook {
  if (typeof window === "undefined") return emptyBook();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return emptyBook();
    const parsed = JSON.parse(raw) as LocalBook;
    if (!parsed || typeof parsed.total !== "number") return emptyBook();
    if (parsed.day !== todayKey()) return { total: parsed.total, day: todayKey(), today: 0 };
    return parsed;
  } catch {
    return emptyBook();
  }
}

function writeBook(book: LocalBook) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(book));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota */
  }
}

function sessionId() {
  if (typeof window === "undefined") return "preview";
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const lastHit = new Map<string, number>();

export function recordVisit(path: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const last = lastHit.get(path) ?? 0;
  if (now - last < MIN_GAP_MS) return;
  lastHit.set(path, now);

  const book = readBook();
  book.total += 1;
  book.today += 1;
  writeBook(book);

  void fetch(`${SUPABASE_URL}/rest/v1/site_visits`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      session_id: sessionId(),
      page_path: path.slice(0, 180),
      visited_at: new Date().toISOString(),
    }),
  }).catch(() => {
    /* preview still holds the count */
  });
}

async function countRows(query: string): Promise<number | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_visits?select=id&${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    });
    const range = response.headers.get("content-range") || "";
    const total = range.split("/")[1];
    if (!total || total === "*") return null;
    const n = Number(total);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function loadVisitStats(): Promise<VisitStats> {
  const local = readBook();
  const startToday = `${todayKey()}T00:00:00.000Z`;
  const [liveTotal, liveToday] = await Promise.all([
    countRows("limit=1"),
    countRows(`visited_at=gte.${encodeURIComponent(startToday)}&limit=1`),
  ]);
  if (liveTotal == null) {
    return { total: local.total, today: local.today, live: false };
  }
  return {
    total: Math.max(liveTotal, local.total),
    today: Math.max(liveToday ?? 0, local.today),
    live: true,
  };
}

export function subscribeVisits(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
