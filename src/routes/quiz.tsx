import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { recommendProducts } from "@/lib/catalog";
import { QUIZ } from "@/lib/constants";

export const Route = createFileRoute("/quiz")({ component: Quiz });

function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const done = step >= QUIZ.length;
  const tags = useMemo(() => {
    const collected: string[] = [];
    for (const question of QUIZ) {
      const value = answers[question.id];
      const option = question.options.find((o) => o.value === value);
      if (option) collected.push(...option.tags);
    }
    return collected;
  }, [answers]);

  const recs = useQuery({
    queryKey: ["quiz", tags.join("|")],
    enabled: done && tags.length > 0,
    queryFn: () => recommendProducts({ data: tags }),
  });

  const question = QUIZ[step];

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 lg:pt-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-600">Style quiz</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal-800 sm:text-5xl">Find your house</h1>
      <p className="mt-3 text-sm font-light text-charcoal-500">Five quiet questions. A personal edit from the floor.</p>
      <div className="gold-line my-8" />
      {!done && question && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-charcoal-400">{step + 1} / {QUIZ.length}</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal-800">{question.question}</h2>
          <div className="mt-8 grid gap-3">
            {question.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, [question.id]: option.value }));
                  setStep((s) => s + 1);
                }}
                className="min-h-14 rounded-2xl border border-border bg-ivory-50 px-5 text-left text-sm text-charcoal-700 transition-colors hover:border-gold-300 hover:bg-gold-50/40"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {done && (
        <div>
          <h2 className="font-serif text-3xl text-charcoal-800">Your edit</h2>
          <p className="mt-2 text-sm text-charcoal-500">Pieces that sit closest to the silhouette you described.</p>
          <div className="mt-8">
            {recs.isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-portrait animate-pulse rounded-xl bg-ivory-100" />
                ))}
              </div>
            ) : (
              <ProductGrid products={recs.data ?? []} />
            )}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => { setStep(0); setAnswers({}); }}>Retake</Button>
            <Button asChild><Link to="/shop">Browse the full floor</Link></Button>
          </div>
        </div>
      )}
    </main>
  );
}
