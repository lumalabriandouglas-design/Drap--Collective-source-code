import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Palette, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseDoor } from "@/components/house-door";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { houseError } from "@/lib/errors";
import { floorSignUp, type FloorRole } from "@/lib/floor-auth";
import { pathForRole } from "@/lib/use-role";

type Door = "client" | "designer";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { as?: Door } => {
    if (search.as === "designer" || search.as === "client") return { as: search.as };
    return {};
  },
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const { as } = Route.useSearch();
  const [step, setStep] = useState<"door" | "details">(as ? "details" : "door");
  const [door, setDoor] = useState<Door>(as ?? "client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  }, []);

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
      toast.success(door === "designer" ? "Now open your atelier — that is the door you send to clients" : "Welcome to the house");
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
    <main className="relative z-20 grid min-h-dvh bg-ivory-50 lg:grid-cols-2">
      <HouseDoor
        line={
          door === "designer"
            ? "Open an atelier. Collectors meet you in the house."
            : "Collect original cloth. The house keeps the relationship."
        }
      />
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-charcoal-800">Join the house</h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {step === "door"
              ? "A collector’s account, or an atelier. One minute."
              : door === "designer"
                ? "Joining as a designer. You can list work after this."
                : "Joining as a collector. Heart pieces, write to ateliers, commission through the house."}
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
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-charcoal-800">Collector</p>
                <p className="mt-1 text-sm font-light text-charcoal-500">Discover and keep original pieces.</p>
              </button>
              <button
                type="button"
                onClick={() => choose("designer")}
                className="rounded-2xl border border-charcoal-100 bg-ivory-50 p-5 text-left transition-colors hover:border-charcoal-300"
              >
                <Palette size={18} className="text-charcoal-700" />
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-charcoal-800">Designer</p>
                <p className="mt-1 text-sm font-light text-charcoal-500">Open an atelier and list your cloth.</p>
              </button>
              <p className="pt-4 text-center text-xs text-charcoal-500">
                Already in the house?{" "}
                <Link to="/login" className="text-charcoal-800 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="relative z-20 grid gap-4">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-charcoal-700"
                onClick={() => {
                  setStep("door");
                  setHint(null);
                }}
              >
                <ArrowLeft size={14} />
                {door === "designer" ? "Designer" : "Collector"}
              </button>
              <div>
                <Label htmlFor="name">{door === "designer" ? "Atelier name" : "Your name"}</Label>
                <Input
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
                    placeholder="At least 8 characters"
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
                {busy ? "Opening the door…" : door === "designer" ? "Create designer account" : "Create collector account"}
              </Button>
              <p className="text-center text-xs text-charcoal-500">
                Already in the house?{" "}
                <Link to="/login" className="text-charcoal-800 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
          <p className="mt-8 text-center text-xs text-charcoal-400">
            <Link to="/" className="hover:text-charcoal-700">
              Back to the house
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
