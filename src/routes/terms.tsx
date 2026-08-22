import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Legal</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800">Terms</h1>
      <div className="gold-line my-8" />
      <div className="space-y-5 text-sm font-light leading-relaxed text-charcoal-600">
        <p>
          By using Drapé Collective you agree to treat the floor as a private house:
          original work, fair dealing, and respect for the ateliers who cut the cloth.
        </p>
        <p>
          Designers list their own pieces and remain responsible for description, lead
          time, and fulfilment. Collectors are responsible for the accuracy of delivery
          details at checkout. Made-to-order work follows the atelier’s stated lead time.
        </p>
        <p>
          The house may remove listings that misrepresent authorship or harm the
          community. Questions:{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
