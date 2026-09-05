import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseRoom, RoomEmpty } from "@/components/house-room";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deskDisplayText,
  deskOtherParty,
  deskUnread,
  getDeskThread,
  listDeskMessages,
  listDeskThreads,
  markDeskRead,
  markDeskInboxRead,
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
  if (sameDay) {
    return date.toLocaleTimeString("en-UG", { hour: "numeric", minute: "2-digit" });
  }
  return formatDay(iso);
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
      params={{ threadId: thread.id }}
      className={cn(
        "block border-b border-charcoal-100 px-4 py-4 transition-colors",
        active ? "bg-ivory-100" : "hover:bg-ivory-50",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("font-serif text-lg text-charcoal-800", unread && "text-charcoal-900")}>
          {other.name}
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-charcoal-400">{timeLabel(thread.updatedAt)}</p>
      </div>
      <p className="mt-1 truncate text-sm font-light text-charcoal-500">
        {thread.pieceName ? `${thread.pieceName} · ` : ""}
        {deskDisplayText(thread.lastPreview)}
      </p>
      {unread ? (
        <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-charcoal-800" aria-label="Unread" />
      ) : null}
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
  useEffect(() => {
    markDeskInboxRead(userId, isAdmin, aliases);
  }, [userId, isAdmin, aliases.join("|"), threads.length]);
  const first = threads[0];
  if (first) {
    return (
      <DeskConversation
        threadId={first.liveId || first.id}
        userId={userId}
        isAdmin={isAdmin}
        aliases={aliases}
      />
    );
  }
  return (
    <HouseRoom
      eyebrow="Messages"
      title="Inbox"
      lede={
        isDesigner
          ? "Clients write here. Open a thread when the first note arrives."
          : "Write to a designer from a piece. Their reply lands here."
      }
    >
      <RoomEmpty
        title="No messages yet"
        body="Open a piece in the shop and tap Message. The designer will answer here."
        action={
          <Button asChild>
            <Link to="/shop">Go to shop</Link>
          </Button>
        }
      />
    </HouseRoom>
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
  const thread = getDeskThread(threadId);
  const messages = listDeskMessages(threadId);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const known = useMemo(() => new Set([userId, ...aliases]), [userId, aliases]);

  useEffect(() => {
    if (thread) markDeskRead(threadId, userId, aliases);
  }, [threadId, userId, thread?.updatedAt, aliases.join("|")]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, threadId]);

  const allowed =
    Boolean(thread) &&
    (isAdmin ||
      thread!.participantIds.some((id) => known.has(id)) ||
      known.has(thread!.atelierId) ||
      known.has(thread!.collectorId));

  if (!thread || !allowed) {
    return (
      <HouseRoom eyebrow="Messages" title="Message not found" lede="This chat is not on your list.">
        <Button asChild variant="outline">
          <Link to="/desk">Back to messages</Link>
        </Button>
      </HouseRoom>
    );
  }

  const other = deskOtherParty(thread, userId, aliases);

  async function onReply(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await replyDesk(threadId, draft);
      setDraft("");
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto grid max-w-6xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <aside className="hidden border-r border-charcoal-100 lg:block lg:pt-24">
          <div className="px-4 pb-4 lg:px-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Messages</p>
            <h1 className="mt-2 font-serif text-3xl text-charcoal-800">Inbox</h1>
          </div>
          <div className="border-t border-charcoal-100">
            {threads.map((item) => (
              <ThreadRow
                key={item.id}
                thread={item}
                userId={userId}
                aliases={aliases}
                active={item.id === threadId || item.liveId === threadId}
              />
            ))}
          </div>
        </aside>

        <section className="flex min-h-dvh flex-col pt-20 lg:pt-24">
          <header className="border-b border-charcoal-100 px-4 py-5 sm:px-6">
            <Link
              to="/desk"
              className="text-[10px] uppercase tracking-[0.16em] text-charcoal-400 hover:text-charcoal-800 lg:hidden"
            >
              Back to messages
            </Link>
            <h2 className="mt-2 font-serif text-3xl text-charcoal-800">{other.name}</h2>
            {thread.pieceSlug && thread.pieceName ? (
              <Link
                to="/shop/$slug"
                params={{ slug: thread.pieceSlug }}
                className="mt-1 inline-block text-sm text-charcoal-500 underline-offset-4 hover:underline"
              >
                {thread.pieceName}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-charcoal-400">{thread.atelierName}</p>
            )}
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.map((item) => (
              <NoteBubble key={item.id} note={item} mine={known.has(item.senderId)} />
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => void onReply(e)} className="border-t border-charcoal-100 bg-ivory-50 px-4 py-4 sm:px-6">
            <label htmlFor="desk-note" className="sr-only">
              Write a message
            </label>
            <Textarea
              id="desk-note"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Write to ${other.name}…`}
              className="min-h-24 bg-white text-base"
              required
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-charcoal-400">Stays on Drapé.</p>
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function NoteBubble({ note, mine }: { note: DeskMessage; mine: boolean }) {
  const body = deskDisplayText(note.content);
  if (note.kind === "house") {
    return (
      <div className="mx-auto max-w-md px-4 py-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.16em] text-gold-600">Drapé</p>
        <p className="mt-1 text-sm font-light text-pretty text-charcoal-500">{body}</p>
      </div>
    );
  }
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(36rem,85%)] rounded-2xl px-4 py-3",
          mine ? "rounded-br-md bg-charcoal-800 text-ivory-50" : "rounded-bl-md bg-ivory-100 text-charcoal-800",
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.12em] opacity-70">{note.senderName}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm font-light leading-relaxed">{body}</p>
        <p className="mt-2 text-[10px] tabular-nums opacity-50">{timeLabel(note.createdAt)}</p>
      </div>
    </div>
  );
}
