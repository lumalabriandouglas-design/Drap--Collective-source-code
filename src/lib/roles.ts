import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type HouseRole = "client" | "designer" | "admin";

export type HouseIdentity = {
  role: HouseRole;
  email: string | null;
  existingDesigner: boolean;
  brandName: string | null;
};

const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";

type FloorProfile = {
  email: string | null;
  role: string | null;
  brand_name: string | null;
  username: string | null;
  is_suspended?: boolean | null;
  status?: string | null;
  location?: string | null;
  created_at?: string | null;
};

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function supabaseProfilesByEmail(email: string): Promise<FloorProfile | null> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set("select", "email,role,brand_name,username,is_suspended");
  url.searchParams.set("email", `eq.${email}`);
  url.searchParams.set("limit", "1");
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as FloorProfile[];
  return rows[0] ?? null;
}

export async function supabasePasswordWorks(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function emailForUser(userId: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql.query<{ email: string | null }>(`select email from "user" where id = $1 limit 1`, [
    userId,
  ]);
  return rows[0]?.email?.toLowerCase() ?? null;
}

async function upsertRole(userId: string, email: string | null, role: HouseRole) {
  const sql = await getSql();
  await sql.query(
    `insert into user_roles (user_id, email, role, updated_at)
     values ($1, $2, $3, now())
     on conflict (user_id) do update set email = excluded.email, role = excluded.role, updated_at = now()`,
    [userId, email, role],
  );
}

async function resolveIdentity(userId: string): Promise<HouseIdentity> {
  const email = await emailForUser(userId);
  const sql = await getSql();
  const local = await sql.query<{ role: HouseRole }>(
    `select role from user_roles where user_id = $1 limit 1`,
    [userId],
  );
  const admins = adminEmails();
  const floor = email ? await supabaseProfilesByEmail(email) : null;

  if (floor?.is_suspended) {
    throw new Error("This account is no longer active. Write to the house if that is a mistake.");
  }

  let role: HouseRole = local[0]?.role ?? "client";
  if (email && admins.includes(email)) role = "admin";
  else if (floor?.role === "admin") role = "admin";
  else if (floor?.role === "designer") role = "designer";
  else if (floor?.role === "customer") role = "client";

  await upsertRole(userId, email, role);
  return {
    role,
    email,
    existingDesigner: Boolean(floor?.role === "designer" || floor?.brand_name),
    brandName: floor?.brand_name ?? null,
  };
}

export const checkExistingPassword = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email || data.password.length < 6) return { ok: false };
    return { ok: await supabasePasswordWorks(email, data.password) };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => resolveIdentity(context.userId));

export const claimRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { role: "client" | "designer" }) => input)
  .handler(async ({ context, data }) => {
    const email = await emailForUser(context.userId);
    if (email && adminEmails().includes(email)) {
      await upsertRole(context.userId, email, "admin");
      return { role: "admin" as const, email, existingDesigner: false, brandName: null };
    }
    const floor = email ? await supabaseProfilesByEmail(email) : null;
    const role: HouseRole =
      floor?.role === "designer" || floor?.brand_name ? "designer" : data.role;
    await upsertRole(context.userId, email, role);
    return {
      role,
      email,
      existingDesigner: Boolean(floor?.role === "designer" || floor?.brand_name),
      brandName: floor?.brand_name ?? null,
    };
  });

export const adminLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const identity = await resolveIdentity(context.userId);
    if (identity.role !== "admin") throw new Error("Not found");

    const url = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
    url.searchParams.set("select", "email,role,brand_name,username,status,location,created_at");
    url.searchParams.set("order", "created_at.desc");
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const profiles = res.ok ? ((await res.json()) as FloorProfile[]) : [];
    const sql = await getSql();
    const localUsers = await sql.query<{ c: string }>(`select count(*)::text as c from "user"`);
    const localOrders = await sql.query<{ c: string }>(`select count(*)::text as c from orders`);
    return {
      profiles,
      localUsers: Number(localUsers[0]?.c ?? 0),
      localOrders: Number(localOrders[0]?.c ?? 0),
    };
  });
