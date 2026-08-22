import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Palette, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { houseError } from "@/lib/errors";
import { floorSignIn } from "@/lib/floor-auth";
import { checkExistingPassword, claimRole, getMyRole } from "@/lib/roles";
import { pathForRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

const spa = import.meta.env.VITE_SPA === "true";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [door, setDoor] = useState<"client" | "designer">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function afterSession() {
    const identity = await getMyRole();
    const dest = pathForRole(identity.role);
    if (dest === "/atelier-house") void navigate({ to: "/atelier-house" });
    else if (dest === "/studio") void navigate({ to: "/studio" });
    else void navigate({ to: "/account" });
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setHint(null);
    try {
      if (mode === "up") {
        if (spa) {
          throw new Error("New accounts open from the live house. Existing designers, sign in with the same email.");
        }
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (error) throw new Error(error.message || "Could not create the account");
        await claimRole({ data: { role: door } });
        toast.success(door === "designer" ? "Your atelier door is open" : "Welcome to the house");
      } else {
        let signedIn = false;
        if (!spa) {
          let { error } = await authClient.signIn.email({ email, password });
          if (error) {
            const existing = await checkExistingPassword({ data: { email, password } });
            if (existing.ok) {
              const created = await authClient.signUp.email({
                email,
                password,
                name: email.split("@")[0],
              });
              if (created.error) {
                const again = await authClient.signIn.email({ email, password });
                if (!again.error) signedIn = true;
              } else {
                signedIn = true;
              }
            }
          } else {
            signedIn = true;
          }
        }
        if (!signedIn) {
          await floorSignIn(email, password);
        }
        toast.success("Signed in");
      }
      await afterSession();
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
            {mode === "in" ? "Sign in" : "Join the house"}
          </h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {mode === "in"
              ? "Already on the floor? Use the same email."
              : "A collector’s account, or an atelier. One minute."}
          </p>
          <div className="gold-line my-6" />
          {authEnabled ? (
            <div className="space-y-3">
              {!spa &&
                GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signIn(p.providerId, { callbackURL: "/welcome" })}
                  >
                    Continue with {p.label}
                  </Button>
                ))}
              {!spa && (
                <p className="py-2 text-center text-[10px] uppercase tracking-[0.18em] text-charcoal-300">
                  or with email
                </p>
              )}
              <form onSubmit={(e) => void onEmail(e)} className="grid gap-3">
                {mode === "up" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDoor("client")} className={cn("rounded-xl border p-3 text-left transition-colors", door === "client" ? "border-charcoal-800 bg-ivory-100" : "border-border hover:border-charcoal-300")}>
                        <User size={16} className="text-charcoal-700" />
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">Collector</p>
                      </button>
                      <button type="button" onClick={() => setDoor("designer")} className={cn("rounded-xl border p-3 text-left transition-colors", door === "designer" ? "border-charcoal-800 bg-ivory-100" : "border-border hover:border-charcoal-300")}>
                        <Palette size={16} className="text-charcoal-700" />
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">Designer</p>
                      </button>
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" className="mt-1.5" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" className="mt-1.5" type="password" required minLength={8} autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {hint && <p className="text-sm text-destructive">{hint}</p>}
                <Button type="submit" disabled={busy}>
                  {busy ? "Please wait…" : mode === "in" ? "Sign in" : `Create ${door === "designer" ? "designer" : "collector"} account`}
                </Button>
              </form>
              <button type="button" className="w-full pt-2 text-center text-xs text-charcoal-500 hover:text-charcoal-800" onClick={() => { setMode((m) => (m === "in" ? "up" : "in")); setHint(null); }}>
                {mode === "in" ? "Need an account? Join" : "Already collecting? Sign in"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-charcoal-500">Sign-in is disabled.</p>
          )}
          <p className="mt-8 text-center text-xs text-charcoal-400">
            <Link to="/" className="hover:text-charcoal-700">Back to the house</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
