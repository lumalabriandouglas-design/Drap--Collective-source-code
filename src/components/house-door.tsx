import { useState } from "react";
import { Wordmark } from "@/components/wordmark";

const DOOR_IMAGE = "https://www.odrapecollective.com/images/hero-2.jpg";

export function HouseDoor({ line }: { line: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative hidden min-h-dvh overflow-hidden bg-charcoal-900 lg:block">
      {!failed && (
        <img
          src={DOOR_IMAGE}
          alt=""
          className="absolute inset-0 size-full object-cover object-top opacity-80"
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 10%, #3a2a1c 0%, transparent 55%), linear-gradient(160deg, #1a1410 0%, #0c0a09 55%, #24180f 100%)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-charcoal-900/40" />
      <div className="relative flex h-full min-h-dvh flex-col justify-end p-12">
        <Wordmark light className="text-3xl" />
        <p className="mt-4 max-w-sm font-serif text-2xl italic text-ivory-50">{line}</p>
      </div>
    </div>
  );
}
