import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Legal</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">Privacy</h1>
      <div className="gold-line my-8" />
      <div className="space-y-5 text-sm font-light leading-relaxed text-charcoal-600">
        <p>
          Drapé Collective is a private marketplace. We keep only what we need to run the
          house: your account, orders, saved pieces, and — if you open an atelier — the
          work you list.
        </p>
        <p>
          We do not sell collector or designer data. Payment details are not stored on this
          floor; orders are recorded with the house for fulfilment by the atelier.
        </p>
        <p>
          Enquiries you send to a designer are visible to that atelier and to you. You may
          ask us to close an account by writing to{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
