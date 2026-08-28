import { useEffect, useState } from "react";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

const KEY = "drape.floor-session";
const EVENT = "drape-floor-session";
const SIGN_IN_TIMEOUT_MS = 15_000;

export type FloorRole = "client" | "designer" | "admin";

export type FloorSession = {
  accessToken: string;
  userId: string;
  profileId: string;
  email: string;
  role: FloorRole;
  brandName: string | null;
  displayName: string;
  avatarUrl: string | null;
};

type AuthTokenResponse = {
  access_token?: string;
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: { full_name?: string; name?: string };
  };
  data?: { session?: { access_token?: string; user?: AuthTokenResponse["user"] }; user?: AuthTokenResponse["user"] };
  error?: string;
  error_description?: string;
  error_code?: string;
  msg?: string;
  message?: string;
};

type FloorProfile = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  role: string | null;
  brand_name: string | null;
  username: string | null;
  profile_photo_url?: string | null;
  is_suspended?: boolean | null;
};

function anonHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function userHeaders(accessToken: string): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function mapRole(role: string | null | undefined, brandName: string | null): FloorRole {
  const r = (role ?? "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "designer" || brandName) return "designer";
  return "client";
}

function liveJoinRole(door: "client" | "designer"): "customer" | "designer" {
  return door === "designer" ? "designer" : "customer";
}

function decodeJwt(token: string): { sub?: string; email?: string } {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json) as { sub?: string; email?: string };
  } catch {
    return {};
  }
}

export function getFloorSession(): FloorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FloorSession;
    if (!parsed?.userId || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setFloorSession(session: FloorSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearFloorSession() {
  setFloorSession(null);
}

/**
 * Live-floor session. On the Grok SSR house, localStorage is read after mount
 * so the first client paint matches the server (no hydration overlay).
 */
export function useFloorAuth() {
  const eager = import.meta.env.VITE_SPA === "true";
  const [session, setSession] = useState<FloorSession | null>(() => (eager ? getFloorSession() : null));
  const [ready, setReady] = useState(eager);

  useEffect(() => {
    setSession(getFloorSession());
    setReady(true);
    const read = () => setSession(getFloorSession());
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { session, ready };
}

export function useFloorSession() {
  return useFloorAuth().session;
}

async function readJson(res: Response): Promise<AuthTokenResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as AuthTokenResponse;
  } catch {
    return { msg: res.ok ? "Unexpected reply from the house" : `Could not sign in (${res.status})` };
  }
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGN_IN_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw new Error("The house took too long to reply. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function profileFor(userId: string, email: string, accessToken: string): Promise<FloorProfile | null> {
  const select = "id,user_id,email,role,brand_name,username,profile_photo_url,is_suspended";
  const tryFetch = async (headers: HeadersInit, column: string, value: string) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
    url.searchParams.set("select", select);
    url.searchParams.set(column, `eq.${value}`);
    url.searchParams.set("limit", "1");
    const res = await timedFetch(url.toString(), { headers });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as FloorProfile[] | FloorProfile;
    const list = Array.isArray(rows) ? rows : rows?.id ? [rows] : [];
    return list[0] ?? null;
  };

  return (
    (await tryFetch(userHeaders(accessToken), "user_id", userId)) ||
    (await tryFetch(userHeaders(accessToken), "email", email)) ||
    (await tryFetch(userHeaders(accessToken), "id", userId)) ||
    (await tryFetch(anonHeaders(), "user_id", userId)) ||
    (await tryFetch(anonHeaders(), "email", email)) ||
    (await tryFetch(anonHeaders(), "id", userId))
  );
}

async function userFromToken(accessToken: string): Promise<{ id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } }> {
  const jwt = decodeJwt(accessToken);
  try {
    const res = await timedFetch(`${SUPABASE_URL}/auth/v1/user`, { headers: userHeaders(accessToken) });
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as {
        id?: string;
        email?: string;
        user_metadata?: { full_name?: string; name?: string };
      } | null;
      if (json?.id) return json;
    }
  } catch {
    /* jwt fallback */
  }
  return { id: jwt.sub, email: jwt.email };
}

async function sessionFromToken(
  accessToken: string,
  emailHint: string,
  extras?: { displayName?: string; forceRole?: "client" | "designer" },
): Promise<FloorSession> {
  const user = await userFromToken(accessToken);
  const jwt = decodeJwt(accessToken);
  const userId = String(user.id || jwt.sub || "");
  const userEmail = String(user.email || emailHint).toLowerCase();
  if (!userId) throw new Error("Could not open the door.");
  const profile = await profileFor(userId, userEmail, accessToken);
  if (profile?.is_suspended) {
    throw new Error("This account is no longer active. Write to the house if that is a mistake.");
  }
  const brandName = profile?.brand_name?.trim() || null;
  let role = mapRole(profile?.role, brandName);
  if (extras?.forceRole && role !== "admin") role = extras.forceRole;
  const displayName =
    extras?.displayName?.trim() ||
    brandName ||
    profile?.username?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0];
  return {
    accessToken,
    userId,
    profileId: profile?.id || userId,
    email: userEmail,
    role,
    brandName,
    displayName: String(displayName || userEmail.split("@")[0]),
    avatarUrl: profile?.profile_photo_url ?? null,
  };
}

export async function authenticateFloor(email: string, password: string): Promise<FloorSession> {
  const trimmed = email.trim().toLowerCase();
  const res = await timedFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ email: trimmed, password }),
  });
  const json = await readJson(res);
  const accessToken = json.access_token || json.accessToken || json.data?.session?.access_token;
  if (!res.ok || !accessToken) {
    throw new Error(
      json.error_description || json.msg || json.message || json.error || "Could not sign in",
    );
  }
  return sessionFromToken(accessToken, trimmed);
}

export async function floorSignIn(email: string, password: string): Promise<FloorSession> {
  const session = await authenticateFloor(email, password);
  setFloorSession(session);
  return session;
}

export async function floorSignUp(input: {
  email: string;
  password: string;
  name: string;
  door: "client" | "designer";
}): Promise<FloorSession> {
  const door = input.door === "designer" ? "designer" : "client";
  const trimmed = input.email.trim().toLowerCase();
  const username = (input.name.trim() || trimmed.split("@")[0]).slice(0, 48);
  if (input.password.length < 8) {
    throw new Error("Use at least 8 characters for the password.");
  }
  const res = await timedFetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({
      email: trimmed,
      password: input.password,
      data: {
        role: liveJoinRole(door),
        username,
        preferred_currency: "UGX",
      },
    }),
  });
  const json = await readJson(res);
  const combined = `${json.error_code || ""} ${json.msg || ""} ${json.message || ""} ${json.error || ""}`.toLowerCase();
  if (combined.includes("already")) {
    throw new Error("This email is already in the house. Sign in instead.");
  }
  if (!res.ok) {
    throw new Error(json.msg || json.message || json.error_description || json.error || "Could not join the house");
  }
  const accessToken = json.access_token || json.accessToken || json.data?.session?.access_token;
  if (!accessToken) {
    throw new Error("Check your email to open the door, then sign in.");
  }
  const session = await sessionFromToken(accessToken, trimmed, {
    displayName: username,
    forceRole: door,
  });
  const joined: FloorSession = {
    ...session,
    role: door,
    brandName: door === "designer" ? session.brandName || username : session.brandName,
    displayName: door === "designer" ? session.brandName || username : session.displayName,
  };
  try {
    await timedFetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${joined.userId}`, {
      method: "PATCH",
      headers: { ...userHeaders(accessToken), Prefer: "return=minimal" },
      body: JSON.stringify({
        username,
        email: trimmed,
        role: liveJoinRole(door),
        preferred_currency: "UGX",
      }),
    });
  } catch {
    /* trigger already wrote the row */
  }
  setFloorSession(joined);
  return joined;
}

export async function fetchFloorProfiles() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set("select", "email,role,brand_name,username,status,location,created_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "200");
  const res = await fetch(url, { headers: anonHeaders() });
  if (!res.ok) return [];
  const rows = (await res.json().catch(() => [])) as {
    email: string | null;
    role: string | null;
    brand_name: string | null;
    username: string | null;
    status?: string | null;
    location?: string | null;
    created_at?: string | null;
  }[];
  return Array.isArray(rows) ? rows : [];
}
