import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/supabase';
import { User, Palette, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Signup() {
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<UserRole>('customer');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await signUp(email, password, role, username || undefined);
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      navigate(role === 'designer' ? '/designer/onboarding' : '/feed', { replace: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Join — Drapé Collective</title>
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link to="/" className="font-heading text-3xl font-bold text-primary">Drapé</Link>
            <h1 className="font-heading text-2xl font-bold text-foreground mt-4">Join Drapé Collective</h1>
            <p className="text-foreground/60 mt-1 text-sm">Create your account</p>
          </div>

          {step === 'role' ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground/80 text-center">I want to join as a...</p>
              <button
                onClick={() => { setRole('customer'); setStep('details'); }}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Customer</p>
                    <p className="text-xs text-foreground/50">Discover and shop unique pieces</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setRole('designer'); setStep('details'); }}
                className="w-full p-4 rounded-xl border-2 border-border hover:border-secondary/40 hover:bg-secondary/5 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Palette size={20} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Designer</p>
                    <p className="text-xs text-foreground/50">Showcase and sell your collections</p>
                  </div>
                </div>
              </button>
              <p className="text-center text-xs text-foreground/40 mt-4">
                Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className="text-sm text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>
                <span className="text-xs text-foreground/30">|</span>
                <span className="text-xs text-foreground/50 capitalize">
                  Joining as <span className="font-medium text-primary">{role}</span>
                </span>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground/80 mb-1.5">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-destructive text-sm bg-destructive/5 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating account...' : `Create ${role} account`}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}