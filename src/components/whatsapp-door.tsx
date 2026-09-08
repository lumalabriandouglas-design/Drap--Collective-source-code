import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { displayWhatsApp, whatsappHref } from "@/lib/whatsapp";

export function WhatsAppDoor({
  house,
  number,
  piece,
  light = false,
  onDesk,
}: {
  house: string;
  number: string;
  piece?: { name?: string; slug?: string } | null;
  light?: boolean;
  onDesk?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const href = whatsappHref(number, house, piece);
  if (!href) return null;

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={
          light ? "border-ivory-50/50 text-ivory-50 hover:bg-ivory-50 hover:text-charcoal-800" : undefined
        }
        onClick={() => setOpen(true)}
      >
        WhatsApp
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-charcoal-900/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-door-title"
            className="w-full max-w-sm rounded-2xl bg-ivory-50 p-5 shadow-[0_16px_40px_rgb(0_0_0_/_0.18)]"
          >
            <p id="wa-door-title" className="font-serif text-2xl text-charcoal-800">
              The desk is better
            </p>
            <p className="mt-2 text-sm text-charcoal-600">
              Write on Drapé and {house} answers here — the house keeps the thread. WhatsApp leaves this floor. They may still reply, but this conversation will not sit on Drapé.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-charcoal-400">{displayWhatsApp(number)}</p>
            <div className="mt-5 grid gap-2">
              {onDesk ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    close();
                    onDesk();
                  }}
                >
                  <MessageCircle size={14} />
                  Write on Drapé
                </Button>
              ) : piece?.slug ? (
                <Button asChild className="w-full">
                  <Link to="/shop/$slug" params={{ slug: piece.slug }} onClick={close}>
                    <MessageCircle size={14} />
                    Write on Drapé
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link to="/desk" onClick={close}>
                    <MessageCircle size={14} />
                    Open the desk
                  </Link>
                </Button>
              )}
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full border border-charcoal-800/80 px-4 text-[10px] font-medium tracking-[0.12em] uppercase text-charcoal-800 hover:bg-charcoal-800 hover:text-ivory-50"
                onClick={close}
              >
                Continue to WhatsApp
              </a>
              <button
                type="button"
                className="py-2 text-[11px] uppercase tracking-[0.14em] text-charcoal-400 hover:text-charcoal-800"
                onClick={close}
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
