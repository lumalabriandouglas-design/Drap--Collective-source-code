import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HouseDoor } from "@/components/house-door";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authEnabled } from "@/lib/auth/auth-enabled";
import { houseError } from "@/lib/errors";
import { floorSignIn, setFloorSession, type FloorRole, type FloorSession } from "@/lib/floor-auth";
import { staticFloor } from "@/lib/house-mode";
import { getMyRole } from "@/lib/roles";
import { pathForRole } from "@/lib/use-role";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => emailRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

  async function goToRoom(role?: FloorRole) {
    const dest = pathForRole(role ?? (await getMyRole()).role);
    if (dest === "/atelier-house") await navigate({ to: "/atelier-house" });
    else if (dest === "/studio") await navigate({ to: "/studio" });
    else await navigate({ to: "/account" });
  }

  async function signInExisting(userEmail: string, userPassword: string): Promise<FloorSession | null> {
    let floorErr: unknown = null;
    const viaBrowser = async () => floorSignIn(userEmail, userPassword);

    try {
      if (import.meta.env.VITE_SPA !== "true" && (import.meta.env.DEV || import.meta.env.SSR)) {
        try {
          const { floorSignInRpc } = await import("@/lib/floor-auth-rpc");
          const session = await floorSignInRpc({ data: { email: userEmail, password: userPassword } });
          setFloorSession(session);
          return session;
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : "";
          if (msg.includes("invalid") || msg.includes("credential") || msg.includes("password")) {
            floorErr = err;
          } else {
            return await viaBrowser();
          }
        }
      } else {
        return await viaBrowser();
      }
    } catch (err) {
      floorErr = err;
    }

    if (staticFloor) throw floorErr ?? new Error("Could not sign in");

    const { authClient } = await import("@/lib/auth/client");
    const { error } = await authClient.signIn.email({ email: userEmail, password: userPassword });
    if (!error) return null;
    throw floorErr ?? new Error(error.message || "Could not sign in");
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setHint(null);
    try {
      const session = await signInExisting(email, password);
      toast.success("Signed in");
      await goToRoom(session?.role);
    } catch (err) {
      setHint(houseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <HouseDoor line="Collectors and makers, same house — different rooms." />
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-charcoal-800">Welcome back</h1>
          <p className="mt-2 text-sm text-charcoal-500">
            Same email and password as odrapecollective.com. New here? Join as a collector or a designer.
          </p>
          <div className="gold-line my-6" />

          {authEnabled ? (
            <form
              onSubmit={(e) => void onEmail(e)}
              className="grid gap-4"
              onPointerDown={(e) => {
                const el = e.target as HTMLElement | null;
                if (el?.tagName === "INPUT") el.focus();
              }}
            >
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
                    minLength={6}
                    autoComplete="current-password"
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
                {busy ? "Please wait…" : "Sign in"}
              </Button>
              <Link
                to="/join"
                className="w-full pt-1 text-center text-xs text-charcoal-500 hover:text-charcoal-800"
              >
                Need an account? Join the house
              </Link>
            </form>
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
