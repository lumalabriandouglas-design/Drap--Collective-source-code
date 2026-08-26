import { useState } from "react";
import { Wordmark } from "@/components/wordmark";

const DOORS = ["/images/hero-2.jpg", "/images/hero.jpg", "https://www.odrapecollective.com/images/hero-2.jpg"];

export function HouseDoor({ line }: { line: string }) {
  const [index, setIndex] = useState(0);
  const src = DOORS[index];

  return (
    <div className="relative hidden min-h-dvh overflow-hidden bg-charcoal-900 lg:block">
      {src ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(22%_0.02_18),oklch(5%_0.005_12))]" />
      )}
      <div className="absolute inset-0 bg-charcoal-900/40" />
      <div className="relative flex h-full flex-col justify-end p-12">
        <Wordmark light className="text-3xl" />
        <p className="mt-4 max-w-sm font-serif text-2xl italic text-ivory-50">{line}</p>
      </div>
    </div>
  );
}
