import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WhatsAppDoor } from "@/components/whatsapp-door";
import { sendInquiry } from "@/lib/commerce";
import { getFloorSession } from "@/lib/floor-auth";
import { houseError } from "@/lib/errors";
import { pieceWhatsAppNote } from "@/lib/whatsapp";

export function LeaveNumber({
  house,
  atelierId,
  atelierSlug,
  whatsapp,
  piece,
}: {
  house: string;
  atelierId?: string | null;
  atelierSlug: string;
  whatsapp?: string | null;
  piece: { name: string; slug: string; image?: string };
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [prefill, setPrefill] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const who = name.trim();
    const tel = phone.trim();
    if (!who || !tel) {
      toast("Name and number, please.");
      return;
    }
    const body = [`Please call ${who} on ${tel}.`, note.trim(), piece.name ? `Re: ${piece.name}` : ""]
      .filter(Boolean)
      .join(" ");
    const session = getFloorSession();
    setBusy(true);
    try {
      if (session) {
        await sendInquiry({
          data: {
            atelierId: atelierId || atelierSlug,
            atelierName: house,
            atelierSlug,
            pieceSlug: piece.slug,
            pieceName: piece.name,
            pieceImage: piece.image,
            message: body,
          },
        });
        setSent(true);
        toast.success("The atelier has your number on the desk.");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setPrefill(
        `${pieceWhatsAppNote(house, piece)} Please call ${who} on ${tel}.${note.trim() ? ` ${note.trim()}` : ""}${origin ? ` ${origin}/shop/${piece.slug}` : ""}`,
      );
      if (!whatsapp) {
        toast("Sign in so the number can sit on the desk — or the designer can add WhatsApp.");
        void navigate({ to: "/login" });
      }
    } catch (err) {
      toast.error(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-charcoal-500">Received. {house} has your number on the desk.</p>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-charcoal-100 bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gold-600">Leave a number</p>
      <p className="mt-2 text-sm font-light text-charcoal-500">
        No account needed. Sign in only if you want the thread attached to you.
      </p>
      <form className="mt-4 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-11 w-full rounded-xl border border-charcoal-100 bg-ivory-50 px-3 text-sm outline-none focus:border-gold-400"
        />
        <input
          required
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+256 7xx xxx xxx"
          className="h-11 w-full rounded-xl border border-charcoal-100 bg-ivory-50 px-3 text-sm outline-none focus:border-gold-400"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="The look, and when to call"
          rows={3}
          className="w-full resize-none rounded-xl border border-charcoal-100 bg-ivory-50 px-3 py-2 text-sm outline-none focus:border-gold-400"
        />
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Sending…" : "Leave number"}
        </Button>
      </form>
      {prefill && whatsapp ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-charcoal-500">The desk needs a door. WhatsApp can carry this number now.</p>
          <WhatsAppDoor house={house} number={whatsapp} piece={piece} prefill={prefill} />
        </div>
      ) : null}
    </div>
  );
}
