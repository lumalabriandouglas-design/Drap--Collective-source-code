import {
  fetchFloorProfiles,
  getFloorSession,
  setFloorSession,
} from "@/lib/floor-auth";

export type HouseRole = "client" | "designer" | "admin";

export type HouseIdentity = {
  role: HouseRole;
  email: string | null;
  existingDesigner: boolean;
  brandName: string | null;
};

const GUEST: HouseIdentity = {
  role: "client",
  email: null,
  existingDesigner: false,
  brandName: null,
};

function fromFloor(): HouseIdentity | null {
  const session = getFloorSession();
  if (!session) return null;
  return {
    role: session.role,
    email: session.email,
    existingDesigner: session.role === "designer" || Boolean(session.brandName),
    brandName: session.brandName,
  };
}

export async function checkExistingPassword(opts: { data: { email: string; password: string } }) {
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    try {
      const { checkExistingPasswordRpc } = await import("@/lib/roles-rpc");
      return await checkExistingPasswordRpc({ data: opts.data });
    } catch {
      /* client grant */
    }
  }
  const email = opts.data.email.trim().toLowerCase();
  if (!email || opts.data.password.length < 6) return { ok: false };
  try {
    const res = await fetch("https://fpvbhlbqojxrgnvxpcng.supabase.co/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: opts.data.password }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function getMyRole(): Promise<HouseIdentity> {
  const floor = fromFloor();
  if (floor) return floor;
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    try {
      const { getMyRoleRpc } = await import("@/lib/roles-rpc");
      return await getMyRoleRpc();
    } catch {
      /* guest */
    }
  }
  return GUEST;
}

export async function claimRole(opts: { data: { role: "client" | "designer" } }): Promise<HouseIdentity> {
  const session = getFloorSession();
  if (session) {
    if (session.role === "admin" || session.role === "designer") {
      return fromFloor() ?? GUEST;
    }
    setFloorSession({ ...session, role: opts.data.role });
    return fromFloor() ?? GUEST;
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    const { claimRoleRpc } = await import("@/lib/roles-rpc");
    return await claimRoleRpc({ data: opts.data });
  }
  return { ...GUEST, role: opts.data.role };
}

export async function adminLedger() {
  const session = getFloorSession();
  if (session) {
    if (session.role !== "admin") throw new Error("Not found");
    const profiles = await fetchFloorProfiles();
    return { profiles, localUsers: 0, localOrders: 0 };
  }
  if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
    const { adminLedgerRpc } = await import("@/lib/roles-rpc");
    return await adminLedgerRpc();
  }
  throw new Error("Not found");
}
