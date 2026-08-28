import { getFloorSession, type FloorSession } from "@/lib/floor-auth";

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

function threadKey(a: string, b: string) {
  return `desk:${[a, b].sort().join(":")}`;
}

function canTalkLive(session: FloorSession | null) {
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
  return readStore().threads.find((thread) => thread.id === id) ?? null;
}

export function listDeskMessages(threadId: string): DeskMessage[] {
  return readStore().messages[threadId] ?? [];
}

export function deskUnread(thread: DeskThread, userId: string) {
  const last = thread.readAt[userId];
  if (!last) return thread.lastPreview.length > 0;
  return thread.updatedAt > last;
}

export function markDeskRead(threadId: string, userId: string) {
  const store = readStore();
  const thread = store.threads.find((item) => item.id === threadId);
  if (!thread) return;
  thread.readAt = { ...thread.readAt, [userId]: new Date().toISOString() };
  writeStore(store);
}

function previewOf(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 90 ? `${clean.slice(0, 87)}…` : clean;
}

function houseWelcome(atelierName?: string): string {
  const house = atelierName ? `The ${atelierName} atelier has your note.` : "The house has your note.";
  return `${house} They reply here — this conversation stays in Drapé.`;
}

export async function openDeskNote(input: OpenNoteInput): Promise<DeskThread> {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to write to the atelier.");
  const message = input.message.trim();
  if (message.length < 8) throw new Error("Write a little more so the atelier can reply.");

  const peerId = input.atelierId || input.atelierSlug || "atelier";
  const id = threadKey(session.userId, peerId);
  const now = new Date().toISOString();
  const store = readStore();
  let thread = store.threads.find((item) => item.id === id);
  const created = !thread;
  if (!thread) {
    thread = {
      id,
      participantIds: [session.userId, peerId],
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
    input.pieceName && (created || input.pieceSlug !== thread.pieceSlug)
      ? `Re: ${input.pieceName}\n${message}`
      : message;

  const note: DeskMessage = {
    id: `m-${Date.now()}`,
    threadId: id,
    senderId: session.userId,
    senderName: session.displayName || session.email,
    content: body,
    createdAt: now,
    kind: "note",
  };
  store.messages[id] = [...(store.messages[id] ?? []), note];

  if (created) {
    store.messages[id].push({
      id: `m-house-${Date.now()}`,
      threadId: id,
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

  if (canTalkLive(session) && peerId.length > 20) {
    void syncLiveNote(session, thread, note).catch(() => undefined);
  }

  return thread;
}

export async function replyDesk(threadId: string, content: string): Promise<DeskMessage> {
  const session = getFloorSession();
  if (!session) throw new Error("Sign in to reply.");
  const message = content.trim();
  if (message.length < 1) throw new Error("Write a note first.");
  const store = readStore();
  const thread = store.threads.find((item) => item.id === threadId);
  if (!thread) throw new Error("This conversation has left the desk.");
  const now = new Date().toISOString();
  const note: DeskMessage = {
    id: `m-${Date.now()}`,
    threadId,
    senderId: session.userId,
    senderName: session.displayName || session.email,
    content: message,
    createdAt: now,
    kind: "note",
  };
  store.messages[threadId] = [...(store.messages[threadId] ?? []), note];
  thread.updatedAt = now;
  thread.lastPreview = previewOf(message);
  thread.readAt = { ...thread.readAt, [session.userId]: now };
  writeStore(store);
  if (canTalkLive(session) && thread.liveId) {
    void postLiveMessage(session.accessToken, thread.liveId, session.userId, message).catch(() => undefined);
  }
  return note;
}

async function syncLiveNote(session: FloorSession, thread: DeskThread, note: DeskMessage) {
  const liveId = thread.liveId || (await findOrCreateLiveConversation(session, thread.atelierId));
  if (!liveId) return;
  const store = readStore();
  const local = store.threads.find((item) => item.id === thread.id);
  if (local) local.liveId = liveId;
  writeStore(store);
  await postLiveMessage(session.accessToken, liveId, session.userId, note.content);
}

async function findOrCreateLiveConversation(session: FloorSession, peerId: string) {
  const headers = liveHeaders(session.accessToken);
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/conversations?select=id,participant_ids&participant_ids=cs.{${session.userId},${peerId}}&limit=5`,
    { headers },
  );
  if (existing.ok) {
    const rows = (await existing.json()) as { id: string; participant_ids: string[] }[];
    const match = rows.find((row) => {
      const ids = new Set(row.participant_ids ?? []);
      return ids.has(session.userId) && ids.has(peerId);
    });
    if (match) return match.id;
  }
  const created = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ participant_ids: [session.userId, peerId] }),
  });
  if (!created.ok) return null;
  const row = (await created.json()) as { id?: string } | { id?: string }[];
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

export function deskOtherParty(thread: DeskThread, userId: string) {
  if (userId === thread.atelierId || userId === thread.atelierSlug) {
    return { name: thread.collectorName, kind: "collector" as const };
  }
  return { name: thread.atelierName, kind: "atelier" as const };
}

