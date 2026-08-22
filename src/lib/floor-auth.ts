import { useEffect, useState } from "react";

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

const KEY = "drape.floor-session";
const EVENT = "drape-floor-session";

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
  user?: { id?: string; email?: string; user_metadata?: { full_name?: string } };
  error_description?: string;
  msg?: string;
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

function headers(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function mapRole(role: string | null | undefined, brandName: string | null): FloorRole {
  if (role === "admin") return "admin";
  if (role === "designer" || brandName) return "designer";
  return "client";
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

export function useFloorSession() {
  const [session, setSession] = useState<FloorSession | null>(() => getFloorSession());

  useEffect(() => {
    const read = () => setSession(getFloorSession());
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return session;
}

async function profileFor(userId: string, email: string): Promise<FloorProfile | null> {
  const byUser = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  byUser.searchParams.set(
    "select",
    "id,user_id,email,role,brand_name,username,profile_photo_url,is_suspended",
  );
  byUser.searchParams.set("user_id", `eq.${userId}`);
  byUser.searchParams.set("limit", "1");
  const first = await fetch(byUser, { headers: headers() });
  if (first.ok) {
    const rows = (await first.json()) as FloorProfile[];
    if (rows[0]) return rows[0];
  }
  const byEmail = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  byEmail.searchParams.set(
    "select",
    "id,user_id,email,role,brand_name,username,profile_photo_url,is_suspended",
  );
  byEmail.searchParams.set("email", `eq.${email}`);
  byEmail.searchParams.set("limit", "1");
  const second = await fetch(byEmail, { headers: headers() });
  if (!second.ok) return null;
  const rows = (await second.json()) as FloorProfile[];
  return rows[0] ?? null;
}

export async function floorSignIn(email: string, password: string): Promise<FloorSession> {
  const trimmed = email.trim().toLowerCase();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email: trimmed, password }),
  });
  const json = (await res.json().catch(() => ({}))) as AuthTokenResponse;
  if (!res.ok || !json.access_token || !json.user?.id) {
    throw new Error(json.error_description || json.msg || "Could not sign in");
  }
  const userId = json.user.id;
  const userEmail = (json.user.email || trimmed).toLowerCase();
  const profile = await profileFor(userId, userEmail);
  if (profile?.is_suspended) {
    throw new Error("This account is no longer active. Write to the house if that is a mistake.");
  }
  const brandName = profile?.brand_name?.trim() || null;
  const role = mapRole(profile?.role, brandName);
  const displayName =
    brandName ||
    profile?.username?.trim() ||
    json.user.user_metadata?.full_name ||
    userEmail.split("@")[0];
  const session: FloorSession = {
    accessToken: json.access_token,
    userId,
    profileId: profile?.id || userId,
    email: userEmail,
    role,
    brandName,
    displayName,
    avatarUrl: profile?.profile_photo_url ?? null,
  };
  setFloorSession(session);
  return session;
}

export async function fetchFloorProfiles() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set("select", "email,role,brand_name,username,status,location,created_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "200");
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return [];
  return (await res.json()) as {
    email: string | null;
    role: string | null;
    brand_name: string | null;
    username: string | null;
    status?: string | null;
    location?: string | null;
    created_at?: string | null;
  }[];
}
