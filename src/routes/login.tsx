import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Palette, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import { authEnabled } from "@/lib/auth/auth-enabled";
import { houseError } from "@/lib/errors";
import { floorSignIn, type FloorRole, type FloorSession } from "@/lib/floor-auth";
import { staticFloor } from "@/lib/house-mode";
import { claimRole, getMyRole } from "@/lib/roles";
import { pathForRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [door, setDoor] = useState<"client" | "designer">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => emailRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [mode]);

  async function goToRoom(role?: FloorRole) {
    const dest = pathForRole(role ?? (await getMyRole()).role);
    if (dest === "/atelier-house") await navigate({ to: "/atelier-house" });
    else if (dest === "/studio") await navigate({ to: "/studio" });
    else await navigate({ to: "/account" });
  }

  async function signInExisting(userEmail: string, userPassword: string): Promise<FloorSession> {
    return floorSignIn(userEmail, userPassword);
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setHint(null);
    try {
      if (mode === "up") {
        if (staticFloor) {
          throw new Error(
            "New accounts open from the live house. Existing designers, sign in with the same email.",
          );
        }
        await claimRole({ data: { role: door } });
        toast.success(door === "designer" ? "Your atelier door is open" : "Welcome to the house");
        await goToRoom();
        return;
      }

      const session = await signInExisting(email, password);
      toast.success("Signed in");
      await goToRoom(session.role);
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
            Collectors and makers, same house — different rooms.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-charcoal-800">
            {mode === "in" ? "Welcome back" : "Join the house"}
          </h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {mode === "in"
              ? "Same email and password as odrapecollective.com. The live house is already connected."
              : "A collector’s account, or an atelier. One minute."}
          </p>
          <div className="gold-line my-6" />

          {authEnabled ? (
            <div className="space-y-3">
              <form
                onSubmit={(e) => void onEmail(e)}
                className="grid gap-4"
                onPointerDown={(e) => {
                  const el = e.target as HTMLElement | null;
                  if (el?.tagName === "INPUT") el.focus();
                }}
              >
                {mode === "up" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDoor("client")}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          door === "client"
                            ? "border-charcoal-800 bg-ivory-100"
                            : "border-border hover:border-charcoal-300",
                        )}
                      >
                        <User size={16} className="text-charcoal-700" />
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">Collector</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoor("designer")}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          door === "designer"
                            ? "border-charcoal-800 bg-ivory-100"
                            : "border-border hover:border-charcoal-300",
                        )}
                      >
                        <Palette size={16} className="text-charcoal-700" />
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">Designer</p>
                      </button>
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        className="mt-1.5"
                        value={name}
                        autoComplete="name"
                        placeholder="Your name"
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    ref={emailRef}
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
                    placeholder="you@atelier.com"
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
                      minLength={mode === "up" ? 8 : 6}
                      autoComplete={mode === "up" ? "new-password" : "current-password"}
                      placeholder="••••••••"
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
                  {busy
                    ? "Please wait…"
                    : mode === "in"
                      ? "Sign in"
                      : `Create ${door === "designer" ? "designer" : "collector"} account`}
                </Button>
              </form>
              <button
                type="button"
                className="w-full pt-2 text-center text-xs text-charcoal-500 hover:text-charcoal-800"
                onClick={() => {
                  setMode((m) => (m === "in" ? "up" : "in"));
                  setHint(null);
                }}
              >
                {mode === "in" ? "Need an account? Join" : "Already collecting? Sign in"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-charcoal-500">Sign-in is disabled.</p>
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
