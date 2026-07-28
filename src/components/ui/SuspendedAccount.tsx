import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function SuspendedAccount() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Account Suspended</h1>
        <p className="text-foreground/60 mt-3 leading-relaxed">
          Your account has been suspended. If you believe this was a mistake, please contact support.
        </p>
        {user?.email && (
          <p className="text-sm text-foreground/40 mt-2">{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="mt-8 px-6 py-2.5 bg-destructive text-white rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}