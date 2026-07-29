import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/supabase';
import { User, Palette, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
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
      return;
    }

    // Success
    if (role === 'designer') {
      navigate('/designer/onboarding', { replace: true });
    } else {
      navigate('/feed', { replace: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Join — Drapé Collective</title>
      </Helmet>

      <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">
          {/* Brand */}
          <div className="text-center mb-10">
            <Link
              to="/"
              className="inline-block font-serif text-3xl font-medium tracking-tight text-charcoal-800"
            >
              Drapé
            </Link>
            <h1 className="font-serif text-2xl font-medium text-charcoal-800 mt-6">
              Join the Collective
            </h1>
            <p className="text-sm text-charcoal-400 mt-2">
              Create your account
            </p>
          </div>

          {step === 'role' ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-charcoal-600 text-center mb-2">
                I want to join as a…
              </p>

              {/* CUSTOMER OPTION */}
              <button
                type="button"
                onClick={() => {
                  setRole('customer');
                  setStep('details');
                }}
                className="w-full p-5 rounded-2xl border border-border bg-white hover:border-charcoal-400 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-ivory-100 flex items-center justify-center">
                    <User size={20} className="text-charcoal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">Customer / Buyer</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">
                      Discover and collect unique pieces
                    </p>
                  </div>
                </div>
              </button>

              {/* DESIGNER OPTION */}
              <button
                type="button"
                onClick={() => {
                  setRole('designer');
                  setStep('details');
                }}
                className="w-full p-5 rounded-2xl border border-border bg-white hover:border-charcoal-400 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-ivory-100 flex items-center justify-center">
                    <Palette size={20} className="text-charcoal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">Designer</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">
                      Showcase and sell your collections
                    </p>
                  </div>
                </div>
              </button>

              <p className="text-center text-sm text-charcoal-400 mt-8">
                Already have an account?{' '}
                <Link to="/login" className="text-charcoal-700 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className="flex items-center gap-1.5 text-sm text-charcoal-400 hover:text-charcoal-600"
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
                <span className="text-charcoal-200">|</span>
                <span className="text-xs text-charcoal-500">
                  Joining as <strong className="text-charcoal-700 capitalize">{role === 'customer' ? 'Customer' : 'Designer'}</strong>
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-charcoal-700 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 disabled:opacity-50"
              >
                {loading ? 'Creating account…' : `Create ${role === 'customer' ? 'Customer' : 'Designer'} account`}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}