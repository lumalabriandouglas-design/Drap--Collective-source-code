import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Palette, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import { houseError } from "@/lib/errors";
import { floorSignUp, type FloorRole } from "@/lib/floor-auth";
import { pathForRole } from "@/lib/use-role";

type Door = "client" | "designer";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>) => ({
    as: search.as === "designer" || search.as === "client" ? (search.as as Door) : undefined,
  }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const { as } = Route.useSearch();
  const nameRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"door" | "details">(as ? "details" : "door");
  const [door, setDoor] = useState<Door>(as ?? "client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "details") return;
    const t = window.setTimeout(() => nameRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [step]);

  function choose(next: Door) {
    setDoor(next);
    setStep("details");
    setHint(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setHint(null);
    try {
      const session = await floorSignUp({ email, password, name, door });
      toast.success(door === "designer" ? "Now open your studio and add a piece" : "Welcome");
      const dest = pathForRole(session.role as FloorRole);
      if (dest === "/studio") await navigate({ to: "/studio" });
      else await navigate({ to: "/account" });
    } catch (err) {
      setHint(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-charcoal-900 lg:block">
        <img
          src="/images/hero-2.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-charcoal-900/40" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <Wordmark light className="text-3xl" />
          <p className="mt-4 max-w-sm font-serif text-2xl italic text-ivory-50">
            {door === "designer" ? "Show your work. People write to you here." : "Find original clothes. Write to the maker."}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-charcoal-800">Join</h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {step === "door"
              ? "Buy clothes, or sell the clothes you make."
              : door === "designer"
                ? "You are joining as a designer."
                : "You are joining as a buyer."}
          </p>
          <div className="gold-line my-6" />

          {step === "door" ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => choose("client")}
                className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-5 text-left transition-colors hover:border-charcoal-300"
              >
                <User size={18} className="text-charcoal-700" />
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-charcoal-800">Buyer</p>
                <p className="mt-1 text-sm font-light text-charcoal-500">Shop and message designers.</p>
              </button>
              <button
                type="button"
                onClick={() => choose("designer")}
                className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-5 text-left transition-colors hover:border-charcoal-300"
              >
                <Palette size={18} className="text-charcoal-700" />
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-charcoal-800">Designer</p>
                <p className="mt-1 text-sm font-light text-charcoal-500">Open a studio and list your work.</p>
              </button>
              <p className="pt-4 text-center text-xs text-charcoal-500">
                Already have an account?{" "}
                <Link to="/login" className="text-charcoal-800 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="grid gap-4"
              onPointerDown={(e) => {
                const el = e.target as HTMLElement | null;
                if (el?.tagName === "INPUT") el.focus();
              }}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-charcoal-700"
                onClick={() => {
                  setStep("door");
                  setHint(null);
                }}
              >
                <ArrowLeft size={14} />
                {door === "designer" ? "Designer" : "Buyer"}
              </button>
              <div>
                <Label htmlFor="name">{door === "designer" ? "Brand name" : "Your name"}</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  name="name"
                  className="mt-1.5"
                  required
                  autoComplete="name"
                  placeholder={door === "designer" ? "House of…" : "Your name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  className="mt-1.5"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    className="pr-12"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 letters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {hint && <p className="text-sm text-destructive">{hint}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : door === "designer" ? "Create designer account" : "Create buyer account"}
              </Button>
              <p className="text-center text-xs text-charcoal-500">
                Already have an account?{" "}
                <Link to="/login" className="text-charcoal-800 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
          <p className="mt-8 text-center text-xs text-charcoal-400">
            <Link to="/" className="hover:text-charcoal-700">
              Back home
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
