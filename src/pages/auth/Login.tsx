import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError, profile: signedInProfile } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      // Navigate based on the user's role
      const role = signedInProfile?.role;
      if (role === 'designer') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/feed', { replace: true });
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In — Drapé Collective</title>
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link to="/" className="font-heading text-3xl font-bold text-primary">Drapé</Link>
            <h1 className="font-heading text-2xl font-bold text-foreground mt-4">Welcome back</h1>
            <p className="text-foreground/60 mt-1 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Signing in...' : 'Sign In'}
              <LogIn size={16} />
            </button>
          </form>

          <p className="text-center text-sm text-foreground/50 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">Join Drapé</Link>
          </p>
        </div>
      </div>
    </>
  );
}