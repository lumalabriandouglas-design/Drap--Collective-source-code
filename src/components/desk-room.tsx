import { Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RoomEmpty } from "@/components/house-room";
import { Button } from "@/components/ui/button";
import {
  deskDisplayText,
  deskOtherParty,
  deskUnread,
  getDeskThread,
  listDeskMessages,
  listDeskThreads,
  markDeskRead,
  pullLiveDesk,
  replyDesk,
  subscribeDesk,
  type DeskMessage,
  type DeskThread,
} from "@/lib/desk";
import { formatDay } from "@/lib/format";
import { houseError } from "@/lib/errors";
import { cn } from "@/lib/utils";

function useDeskList(userId: string, isAdmin: boolean, aliases: string[]) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeDesk(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        await pullLiveDesk();
        if (alive) setTick((n) => n + 1);
      } catch {
        /* keep the local desk */
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 8000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [userId]);
  return listDeskThreads(userId, isAdmin, aliases);
}

function timeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = new Date().toDateString() === date.toDateString();
  if (sameDay) return date.toLocaleTimeString("en-UG", { hour: "numeric", minute: "2-digit" });
  return formatDay(iso);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "");
  return letters.toUpperCase() || "D";
}

function DeskAvatar({ name, gold }: { name: string; gold?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full font-serif text-sm",
        gold ? "bg-gold-500 text-ivory-50" : "bg-charcoal-800 text-ivory-50",
      )}
    >
      {initials(name)}
    </span>
  );
}

function ThreadRow({
  thread,
  userId,
  aliases,
  active,
}: {
  thread: DeskThread;
  userId: string;
  aliases: string[];
  active: boolean;
}) {
  const other = deskOtherParty(thread, userId, aliases);
  const unread = deskUnread(thread, userId, aliases);
  return (
    <Link
      to="/desk/$threadId"
      params={{ threadId: thread.liveId || thread.id }}
      className={cn(
        "flex gap-3 border-b border-charcoal-100/80 px-4 py-3.5 transition-colors",
        active ? "bg-ivory-100" : "hover:bg-ivory-50",
      )}
    >
      <span className="relative">
        <DeskAvatar name={other.name} gold={unread} />
        {unread ? (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-gold-500 ring-2 ring-ivory-50" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate font-serif text-base text-charcoal-800", unread && "font-medium")}>
            {other.name}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-charcoal-400">
            {timeLabel(thread.updatedAt)}
          </span>
        </span>
        {thread.pieceName ? (
          <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-gold-700">
            {thread.pieceName}
          </span>
        ) : null}
        <span className={cn("mt-0.5 block truncate text-sm font-light", unread ? "text-charcoal-700" : "text-charcoal-400")}>
          {deskDisplayText(thread.lastPreview)}
        </span>
      </span>
    </Link>
  );
}

export function DeskInbox({
  userId,
  isAdmin,
  aliases,
  isDesigner = false,
}: {
  userId: string;
  isAdmin: boolean;
  aliases: string[];
  isDesigner?: boolean;
}) {
  const threads = useDeskList(userId, isAdmin, aliases);
  if (!threads.length) {
    return (
      <HouseRoom
        eyebrow="Messages"
        title="The desk"
        lede={
          isDesigner
            ? "Collectors write from a piece. Their notes land here — one house, one conversation."
            : "Write to a designer from a piece. Their reply lands on this desk."
        }
      >
        <RoomEmpty
          title="The desk is quiet"
          body="Open a piece on the floor and tap Message. Replies stay on Drapé."
          action={
            <Button asChild>
              <Link to="/shop">Go to the floor</Link>
            </Button>
          }
        />
      </HouseRoom>
    );
  }

  return (
    <DeskSplit
      threads={threads}
      threadId={null}
      userId={userId}
      isAdmin={isAdmin}
      aliases={aliases}
      isDesigner={isDesigner}
    />
  );
}

export function DeskConversation({
  threadId,
  userId,
  isAdmin,
  aliases,
}: {
  threadId: string;
  userId: string;
  isAdmin: boolean;
  aliases: string[];
}) {
  const threads = useDeskList(userId, isAdmin, aliases);
  return (
    <DeskSplit
      threads={threads}
      threadId={threadId}
      userId={userId}
      isAdmin={isAdmin}
      aliases={aliases}
    />
  );
}

function DeskSplit({
  threads,
  threadId,
  userId,
  isAdmin,
  aliases,
  isDesigner = false,
}: {
  threads: DeskThread[];
  threadId: string | null;
  userId: string;
  isAdmin: boolean;
  aliases: string[];
  isDesigner?: boolean;
}) {
  const selected =
    threads.find((item) => item.id === threadId || item.liveId === threadId) ??
    (threadId ? getDeskThread(threadId) : null);

  return (
    <main className="min-h-dvh bg-ivory-50">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "flex min-h-dvh flex-col border-charcoal-100 bg-white lg:border-r",
            selected ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="px-5 pt-24 pb-4 lg:px-6 lg:pt-28">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">The desk</p>
            <h1 className="mt-2 font-serif text-3xl text-charcoal-800">Messages</h1>
            <p className="mt-1 text-xs text-charcoal-400">
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
              {isDesigner ? " · collectors" : ""}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-charcoal-100">
            {threads.map((item) => (
              <ThreadRow
                key={item.id}
                thread={item}
                userId={userId}
                aliases={aliases}
                active={Boolean(selected && (item.id === selected.id || item.liveId === selected.liveId))}
              />
            ))}
          </div>
        </aside>

        <section className={cn("min-h-dvh bg-ivory-50", selected ? "flex flex-col" : "hidden lg:flex")}>
          {selected ? (
            <ThreadPane thread={selected} userId={userId} isAdmin={isAdmin} aliases={aliases} />
          ) : (
            <div className="hidden flex-1 items-center justify-center lg:flex">
              <p className="max-w-xs text-center font-serif text-xl text-charcoal-400">
                Choose a conversation from the desk.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ThreadPane({
  thread,
  userId,
  isAdmin,
  aliases,
}: {
  thread: DeskThread;
  userId: string;
  isAdmin: boolean;
  aliases: string[];
}) {
  const threadId = thread.liveId || thread.id;
  const messages = listDeskMessages(threadId);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const known = useMemo(() => new Set([userId, ...aliases]), [userId, aliases]);

  useEffect(() => {
    markDeskRead(threadId, userId, aliases);
  }, [threadId, userId, thread.updatedAt, aliases.join("|")]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, threadId]);

  const allowed =
    isAdmin ||
    thread.participantIds.some((id) => known.has(id)) ||
    known.has(thread.atelierId) ||
    known.has(thread.collectorId);

  if (!allowed) {
    return (
      <div className="flex flex-1 flex-col items-start justify-center px-6 pt-24">
        <p className="font-serif text-2xl text-charcoal-800">This desk is closed to you.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/desk">Back to messages</Link>
        </Button>
      </div>
    );
  }

  const other = deskOtherParty(thread, userId, aliases);

  async function onReply(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await replyDesk(threadId, draft);
      setDraft("");
      boxRef.current?.focus();
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onReply();
    }
  }

  let lastDay = "";

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-charcoal-100 bg-ivory-50/95 px-3 pt-20 pb-4 backdrop-blur-md sm:px-6 lg:pt-24">
        <Link
          to="/desk"
          aria-label="All messages"
          className="grid size-11 place-items-center rounded-full text-charcoal-600 hover:bg-ivory-100 lg:hidden"
        >
          <ArrowLeft size={18} />
        </Link>
        <DeskAvatar name={other.name} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-xl text-charcoal-800 sm:text-2xl">{other.name}</h2>
          {thread.pieceSlug && thread.pieceName ? (
            <Link
              to="/shop/$slug"
              params={{ slug: thread.pieceSlug }}
              className="truncate text-[11px] uppercase tracking-[0.14em] text-gold-700 hover:text-gold-800"
            >
              {thread.pieceName}
            </Link>
          ) : (
            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-charcoal-400">{thread.atelierName}</p>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.map((item) => {
          const day = new Date(item.createdAt).toDateString();
          const stamp = day !== lastDay;
          lastDay = day;
          return (
            <div key={item.id}>
              {stamp ? (
                <p className="my-4 text-center text-[10px] uppercase tracking-[0.18em] text-charcoal-300">
                  {formatDay(item.createdAt)}
                </p>
              ) : null}
              <NoteBubble note={item} mine={known.has(item.senderId)} />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => void onReply(e)} className="border-t border-charcoal-100 bg-white px-4 py-3 sm:px-6">
        <label htmlFor="desk-note" className="sr-only">
          Write a message
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-charcoal-100 bg-ivory-50 px-3 py-2 focus-within:border-gold-400">
          <textarea
            id="desk-note"
            ref={boxRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${other.name}…`}
            rows={1}
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-charcoal-800 outline-none placeholder:text-charcoal-300"
            required
          />
          <Button type="submit" size="sm" disabled={busy || !draft.trim()} className="mb-0.5 rounded-full px-4">
            <Send size={14} />
            {busy ? "Sending" : "Send"}
          </Button>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-charcoal-300">Enter to send · Shift+Enter for a new line</p>
      </form>
    </>
  );
}

function NoteBubble({ note, mine }: { note: DeskMessage; mine: boolean }) {
  const body = deskDisplayText(note.content);
  if (note.kind === "house") {
    return (
      <div className="mx-auto max-w-sm py-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Drapé</p>
        <p className="mt-1 text-sm font-light text-pretty text-charcoal-500">{body}</p>
      </div>
    );
  }
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(36rem,88%)] px-4 py-3",
          mine
            ? "rounded-2xl rounded-br-md bg-charcoal-800 text-ivory-50"
            : "rounded-2xl rounded-bl-md border border-charcoal-100 bg-white text-charcoal-800 shadow-[0_1px_0_rgba(28,25,23,0.04)]",
        )}
      >
        {!mine ? (
          <p className="text-[10px] uppercase tracking-[0.12em] text-gold-700">{note.senderName}</p>
        ) : null}
        <p className="whitespace-pre-wrap text-sm font-light leading-relaxed">{body}</p>
        <p className={cn("mt-1.5 text-[10px] tabular-nums", mine ? "text-ivory-50/45" : "text-charcoal-300")}>
          {timeLabel(note.createdAt)}
        </p>
      </div>
    </div>
  );
}
