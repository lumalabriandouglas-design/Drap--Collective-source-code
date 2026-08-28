import { liveFloor } from "@/lib/catalog-core";
import { getFloorSession, type FloorSession } from "@/lib/floor-auth";
import type { OrderSummary } from "@/lib/types";

export const COMMISSION_MARK = "DRAPE_COMMISSION::";

export function parseCommission(text: string): OrderSummary | null {
  const raw = text.trim();
  const idx = raw.indexOf(COMMISSION_MARK);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(idx + COMMISSION_MARK.length)) as OrderSummary;
    if (!parsed?.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const KEY = "drape.desk.v1";
const EVENT = "drape-desk";
const SUPABASE_URL = "https://fpvbhlbqojxrgnvxpcng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdmJobGJxb2p4cmdudnhwY25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk4ODYsImV4cCI6MjA5NjI2NTg4Nn0.MHQq6Sq3xLyLxE3ZqcNW9_5k4knMKB4fp7vH7Ja-Ees";
const HOUSE_ID = "house";

export type DeskThread = {
  id: string;
  participantIds: string[];
  collectorId: string;
  collectorName: string;
  atelierId: string;
  atelierName: string;
  atelierSlug?: string;
  pieceSlug?: string;
  pieceName?: string;
  pieceImage?: string;
  updatedAt: string;
  lastPreview: string;
  liveId?: string | null;
  readAt: Record<string, string>;
};

export type DeskMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  kind: "note" | "house";
};

type DeskStore = {
  threads: DeskThread[];
  messages: Record<string, DeskMessage[]>;
};

export type OpenNoteInput = {
  atelierId: string;
  atelierName: string;
  atelierSlug?: string;
  pieceSlug?: string;
  pieceName?: string;
  pieceImage?: string;
  message: string;
};

type LiveConversation = {
  id: string;
  participant_ids: string[];
  updated_at?: string;
  created_at?: string;
};

type LiveMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type LiveProfile = {
  id: string;
  user_id?: string | null;
  brand_name?: string | null;
  username?: string | null;
  email?: string | null;
};

function emptyStore(): DeskStore {
  return { threads: [], messages: {} };
}

function readStore(): DeskStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as DeskStore;
    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      messages: parsed.messages && typeof parsed.messages === "object" ? parsed.messages : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DeskStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota */
  }
}

export function subscribeDesk(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function threadKey(a: string, b: string) {
  return `desk:${[a, b].sort().join(":")}`;
}

function canTalkLive(session: FloorSession | null): session is FloorSession {
  return Boolean(session?.accessToken && session.accessToken.split(".").length === 3);
}

function liveHeaders(token: string): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function sessionAliases(session: FloorSession) {
  return [...new Set([session.userId, session.profileId].filter(Boolean))];
}

export function deskDisplayText(content: string) {
  const order = parseCommission(content);
  if (!order) return content;
  const names = order.items.map((item) => item.name).filter(Boolean);
  const pieces = names.length ? names.join(", ") : "a piece";
  const where = [order.shippingCity, order.shippingCountry].filter(Boolean).join(", ");
  return where ? `Commission placed · ${pieces} · ${where}` : `Commission placed · ${pieces}`;
}

function previewOf(text: string) {
  const clean = deskDisplayText(text).replace(/\s+/g, " ").trim();
  return clean.length > 90 ? `${clean.slice(0, 87)}…` : clean;
}

export function listDeskThreads(userId: string, isAdmin = false, aliases: string[] = []): DeskThread[] {
  const store = readStore();
  const known = new Set([userId, ...aliases.filter(Boolean)]);
  const mine = isAdmin
    ? store.threads
    : store.threads.filter(
        (thread) =>
          thread.participantIds.some((id) => known.has(id)) ||
          known.has(thread.atelierId) ||
          known.has(thread.collectorId),
      );
  return [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDeskThread(id: string): DeskThread | null {
  const store = readStore();
  return store.threads.find((thread) => thread.id === id || thread.liveId === id) ?? null;
}

export function listDeskMessages(threadId: string): DeskMessage[] {
  const store = readStore();
  const thread = store.threads.find((item) => item.id === threadId || item.liveId === threadId);
  const id = thread?.id ?? threadId;
  return store.messages[id] ?? store.messages[threadId] ?? [];
}

export function deskUnread(thread: DeskThread, userId: string) {
  const last = thread.readAt[userId];
  if (!last) return thread.lastPreview.length > 0;
  return thread.updatedAt > last;
}

export function markDeskRead(threadId: string, userId: string) {
  const store = readStore();
  const thread = store.threads.find((item) => item.id === threadId || item.liveId === threadId);
  if (!thread) return;
  thread.readAt = { ...thread.readAt, [userId]: new Date().toISOString() };
  writeStore(store);
}

function houseWelcome(atelierName?: string): string {
  const house = atelierName ? `The ${atelierName} atelier has your note.` : "The house has your note.";
  return `${house} They reply here — this conversation stays in Drapé.`;
}

async function peerIdsForAtelier(atelierId: string, atelierSlug?: string) {
  const ids = new Set<string>();
  if (atelierId) ids.add(atelierId);
  try {
    const floor = await liveFloor();
    const match = floor.designers.find(
      (designer) =>
        designer.userId === atelierId ||
        designer.authId === atelierId ||
        designer.slug === atelierId ||
        designer.slug === atelierSlug ||
        designer.name === atelierId,
    );
    if (match?.userId) ids.add(match.userId);
    if (match?.authId) ids.add(match.authId);
  } catch {
    /* floor optional */
  }
  return [...ids];
}

export async function openDeskNote(input: OpenNoteInput): Promise<DeskThread> {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to write to the atelier.");
  const message = input.message.trim();
  const commission = parseCommission(message);
  if (!commission && message.length < 8) throw new Error("Write a little more so the atelier can reply.");

  const peers = await peerIdsForAtelier(input.atelierId, input.atelierSlug);
  const peerId = peers[0] || input.atelierSlug || "atelier";
  const id = threadKey(session.userId, peerId);
  const now = new Date().toISOString();
  const store = readStore();
  let thread = store.threads.find(
    (item) =>
      item.id === id ||
      item.participantIds.includes(peerId) ||
      peers.some((peer) => item.participantIds.includes(peer) && item.collectorId === session.userId),
  );
  const created = !thread;
  if (!thread) {
    thread = {
      id,
      participantIds: [...new Set([session.userId, session.profileId, ...peers])],
      collectorId: session.userId,
      collectorName: session.displayName || session.email,
      atelierId: peerId,
      atelierName: input.atelierName,
      atelierSlug: input.atelierSlug,
      pieceSlug: input.pieceSlug,
      pieceName: input.pieceName,
      pieceImage: input.pieceImage,
      updatedAt: now,
      lastPreview: previewOf(message),
      liveId: null,
      readAt: { [session.userId]: now },
    };
    store.threads.unshift(thread);
    store.messages[id] = [];
  } else if (input.pieceSlug && !thread.pieceSlug) {
    thread.pieceSlug = input.pieceSlug;
    thread.pieceName = input.pieceName;
    thread.pieceImage = input.pieceImage;
  }

  const body =
    !commission && input.pieceName && (created || input.pieceSlug !== thread.pieceSlug)
      ? `Re: ${input.pieceName}\n${message}`
      : message;

  const note: DeskMessage = {
    id: `m-${Date.now()}`,
    threadId: thread.id,
    senderId: session.userId,
    senderName: session.displayName || session.email,
    content: body,
    createdAt: now,
    kind: "note",
  };
  store.messages[thread.id] = [...(store.messages[thread.id] ?? []), note];

  if (created) {
    store.messages[thread.id].push({
      id: `m-house-${Date.now()}`,
      threadId: thread.id,
      senderId: HOUSE_ID,
      senderName: "The house",
      content: houseWelcome(input.atelierName),
      createdAt: new Date().toISOString(),
      kind: "house",
    });
  }

  thread.updatedAt = now;
  thread.lastPreview = previewOf(body);
  thread.readAt = { ...thread.readAt, [session.userId]: now };
  writeStore(store);

  if (canTalkLive(session)) {
    void syncLiveNote(session, thread, note, peers).catch(() => undefined);
  }

  return thread;
}

export async function replyDesk(threadId: string, content: string): Promise<DeskMessage> {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to reply.");
  const message = content.trim();
  if (message.length < 1) throw new Error("Write a note first.");
  const store = readStore();
  const thread = store.threads.find((item) => item.id === threadId || item.liveId === threadId);
  if (!thread) throw new Error("This conversation has left the desk.");
  const now = new Date().toISOString();
  const note: DeskMessage = {
    id: `m-${Date.now()}`,
    threadId: thread.id,
    senderId: session.userId,
    senderName: session.displayName || session.email,
    content: message,
    createdAt: now,
    kind: "note",
  };
  store.messages[thread.id] = [...(store.messages[thread.id] ?? []), note];
  thread.updatedAt = now;
  thread.lastPreview = previewOf(message);
  thread.readAt = { ...thread.readAt, [session.userId]: now };
  writeStore(store);
  if (canTalkLive(session)) {
    const peers = thread.participantIds.filter((id) => id !== session.userId && id !== session.profileId);
    void syncLiveNote(session, thread, note, peers).catch(() => undefined);
  }
  return note;
}

async function syncLiveNote(session: FloorSession, thread: DeskThread, note: DeskMessage, peers: string[]) {
  const liveId = thread.liveId || (await findOrCreateLiveConversation(session, peers));
  if (!liveId) return;
  const store = readStore();
  const local = store.threads.find((item) => item.id === thread.id);
  if (local) local.liveId = liveId;
  writeStore(store);
  await postLiveMessage(session.accessToken, liveId, session.userId, note.content);
}

async function findOrCreateLiveConversation(session: FloorSession, peers: string[]) {
  const uuidPeers = peers.filter(isUuid);
  const self = sessionAliases(session).filter(isUuid);
  if (!uuidPeers.length || !self.length) return null;
  const headers = liveHeaders(session.accessToken);
  for (const me of self) {
    for (const peer of uuidPeers) {
      const existing = await fetch(
        `${SUPABASE_URL}/rest/v1/conversations?select=id,participant_ids&participant_ids=cs.{${me},${peer}}&limit=8`,
        { headers },
      );
      if (existing.ok) {
        const rows = (await existing.json()) as LiveConversation[];
        const match = rows.find((row) => {
          const ids = new Set(row.participant_ids ?? []);
          return ids.has(me) && ids.has(peer);
        });
        if (match) return match.id;
      }
    }
  }
  const participant_ids = [...new Set([...self, ...uuidPeers])];
  const created = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ participant_ids }),
  });
  if (!created.ok) return null;
  const row = (await created.json()) as LiveConversation | LiveConversation[];
  const record = Array.isArray(row) ? row[0] : row;
  return record?.id ?? null;
}

async function postLiveMessage(token: string, conversationId: string, senderId: string, content: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: "POST",
    headers: liveHeaders(token),
    body: JSON.stringify({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_urls: [],
    }),
  });
}

async function fetchLiveConversations(session: FloorSession) {
  const headers = liveHeaders(session.accessToken);
  const mine = sessionAliases(session).filter(isUuid);
  const found = new Map<string, LiveConversation>();
  for (const id of mine) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/conversations?select=id,participant_ids,updated_at,created_at&participant_ids=cs.{${id}}&order=updated_at.desc&limit=40`,
      { headers },
    );
    if (!res.ok) continue;
    const rows = (await res.json()) as LiveConversation[];
    for (const row of rows) found.set(row.id, row);
  }
  return [...found.values()];
}

async function fetchLiveMessages(session: FloorSession, conversationId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/messages?select=id,conversation_id,sender_id,content,created_at&conversation_id=eq.${conversationId}&order=created_at.asc&limit=80`,
    { headers: liveHeaders(session.accessToken) },
  );
  if (!res.ok) return [] as LiveMessage[];
  return (await res.json()) as LiveMessage[];
}

async function fetchProfiles(session: FloorSession, ids: string[]) {
  const unique = [...new Set(ids.filter(isUuid))];
  if (!unique.length) return [] as LiveProfile[];
  const headers = liveHeaders(session.accessToken);
  const byId = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,user_id,brand_name,username,email&or=(id.in.(${unique.join(",")}),user_id.in.(${unique.join(",")}))`,
    { headers },
  );
  if (!byId.ok) return [];
  return (await byId.json()) as LiveProfile[];
}

function profileName(profile?: LiveProfile | null) {
  return profile?.brand_name?.trim() || profile?.username?.trim() || profile?.email || "Collector";
}

export async function pullLiveDesk() {
  const session = getFloorSession();
  if (!canTalkLive(session)) {
    return listDeskThreads(session?.userId ?? "", false, session ? sessionAliases(session) : []);
  }
  const conversations = await fetchLiveConversations(session);
  if (!conversations.length) return listDeskThreads(session.userId, false, sessionAliases(session));

  const store = readStore();
  const self = new Set(sessionAliases(session));
  const peerIds = conversations.flatMap((row) => (row.participant_ids ?? []).filter((id) => !self.has(id)));
  const profiles = await fetchProfiles(session, [...self, ...peerIds]);
  const floor = await liveFloor().catch(() => ({ designers: [] as { userId: string | null; authId?: string | null; slug: string; name: string }[] }));

  for (const conversation of conversations) {
    const participants = conversation.participant_ids ?? [];
    const peers = participants.filter((id) => !self.has(id));
    const peer = peers[0];
    const peerProfile = profiles.find((row) => row.id === peer || row.user_id === peer);
    const selfIsDesigner = session.role === "designer" || session.role === "admin";
    const designer = floor.designers.find(
      (item) =>
        item.userId === peer ||
        item.authId === peer ||
        item.userId === session.profileId ||
        item.authId === session.userId,
    );
    const liveMessages = await fetchLiveMessages(session, conversation.id);
    const existing =
      store.threads.find((item) => item.liveId === conversation.id) ||
      store.threads.find((item) => item.participantIds.some((id) => peers.includes(id)));

    const atelierId = selfIsDesigner ? session.profileId || session.userId : peer || "atelier";
    const atelierName = selfIsDesigner
      ? session.brandName || session.displayName
      : designer?.name || profileName(peerProfile);
    const collectorId = selfIsDesigner ? peer || "collector" : session.userId;
    const collectorName = selfIsDesigner ? profileName(peerProfile) : session.displayName || session.email;

    const thread: DeskThread = existing ?? {
      id: conversation.id,
      participantIds: [...new Set([...participants, ...sessionAliases(session)])],
      collectorId,
      collectorName,
      atelierId,
      atelierName,
      atelierSlug: designer?.slug,
      updatedAt: conversation.updated_at || conversation.created_at || new Date().toISOString(),
      lastPreview: "",
      liveId: conversation.id,
      readAt: {},
    };
    thread.liveId = conversation.id;
    thread.participantIds = [...new Set([...thread.participantIds, ...participants, ...sessionAliases(session)])];
    thread.collectorName = collectorName;
    thread.atelierName = atelierName;
    if (!existing) store.threads.unshift(thread);

    const local = store.messages[thread.id] ?? [];
    const known = new Set(local.map((item) => item.id));
    const incoming: DeskMessage[] = liveMessages
      .filter((row) => !known.has(row.id))
      .map((row) => ({
        id: row.id,
        threadId: thread.id,
        senderId: row.sender_id,
        senderName: self.has(row.sender_id) ? session.displayName || session.email : profileName(peerProfile),
        content: row.content,
        createdAt: row.created_at,
        kind: "note" as const,
      }));
    if (incoming.length) {
      store.messages[thread.id] = [...local, ...incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    const last = (store.messages[thread.id] ?? []).at(-1);
    if (last) {
      thread.updatedAt = last.createdAt;
      thread.lastPreview = previewOf(last.content);
    }
  }
  writeStore(store);
  return listDeskThreads(session.userId, session.role === "admin", sessionAliases(session));
}

export async function listCommissionOrders(): Promise<OrderSummary[]> {
  const session = getFloorSession();
  if (!session) return [];
  await pullLiveDesk();
  const store = readStore();
  const mine = new Set(sessionAliases(session));
  const orders: OrderSummary[] = [];
  for (const thread of store.threads) {
    for (const note of store.messages[thread.id] ?? []) {
      if (!mine.has(note.senderId) && session.role === "client") continue;
      const parsed = parseCommission(note.content);
      if (parsed) orders.push(parsed);
    }
  }
  const seen = new Set<number>();
  return orders.filter((order) => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

export function deskOtherParty(thread: DeskThread, userId: string, aliases: string[] = []) {
  const known = new Set([userId, ...aliases.filter(Boolean)]);
  if (known.has(thread.atelierId) || (thread.atelierSlug && known.has(thread.atelierSlug))) {
    return { name: thread.collectorName, kind: "collector" as const };
  }
  return { name: thread.atelierName, kind: "atelier" as const };
}
