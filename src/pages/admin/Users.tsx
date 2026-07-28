import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/supabase';
import { Shield, Search, ShieldAlert, AlertTriangle, X, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const PAGE_SIZE = 20;

type BadgeColor = 'bg-blue-500/10 text-blue-500' | 'bg-purple-500/10 text-purple-500' | 'bg-amber-500/10 text-amber-500';

const roleBadge: Record<string, { label: string; color: BadgeColor }> = {
  customer: { label: 'Customer', color: 'bg-blue-500/10 text-blue-500' },
  designer: { label: 'Designer', color: 'bg-purple-500/10 text-purple-500' },
  admin:    { label: 'Admin',    color: 'bg-amber-500/10 text-amber-500' },
};

const statusBadge: Record<string, { label: string; dot: string }> = {
  approved:  { label: 'Active',   dot: 'bg-green-500' },
  suspended: { label: 'Suspended', dot: 'bg-red-500' },
  pending:   { label: 'Pending',   dot: 'bg-yellow-500' },
  rejected:  { label: 'Rejected',  dot: 'bg-gray-400' },
};

function relativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchProfiles(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p =>
      (p.username && p.username.toLowerCase().includes(q)) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }, [profiles, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleSuspend() {
    if (!suspendTarget) return;
    setProcessing(true);
    const isSuspending = !suspendTarget.is_suspended;
    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: isSuspending,
        status: isSuspending ? 'suspended' : 'approved',
      })
      .eq('id', suspendTarget.id);

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setProfiles(prev =>
        prev.map(p =>
          p.id === suspendTarget.id
            ? { ...p, is_suspended: isSuspending, status: isSuspending ? 'suspended' : 'approved' as Profile['status'] }
            : p
        )
      );
      setToast({
        message: isSuspending
          ? `Suspended ${suspendTarget.username || suspendTarget.brand_name || 'user'}`
          : `Unsuspended ${suspendTarget.username || suspendTarget.brand_name || 'user'}`,
        type: 'success',
      });
    }
    setProcessing(false);
    setSuspendTarget(null);
  }

  return (
    <>
      <Helmet><title>User Management — Drapé Collective</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert size={24} className="text-destructive" />
          <h1 className="font-heading text-3xl font-bold text-foreground">User Management</h1>
        </div>

        {/* Search bar */}
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, brand, or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto text-foreground/20 mb-3" />
            <p className="text-foreground/50">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(profile => {
                  const roleInfo = roleBadge[profile.role] || roleBadge.customer;
                  const statusInfo = statusBadge[profile.status] || statusBadge.pending;
                  return (
                    <tr key={profile.id} className="border-t border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {profile.profile_photo_url ? (
                            <img
                              src={profile.profile_photo_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover bg-muted"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-foreground/40 font-medium">
                              {(profile.username || profile.brand_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{profile.brand_name || profile.username || 'Anonymous'}</p>
                            {profile.brand_name && profile.username && (
                              <p className="text-xs text-foreground/40">@{profile.username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-foreground/70">{profile.email || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-foreground/70">
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-foreground/50 text-xs">{relativeDate(profile.created_at)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSuspendTarget(profile)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            profile.is_suspended
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                              : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          }`}
                        >
                          {profile.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-foreground/40">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Suspend Confirmation Modal */}
        {suspendTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-bg w-full max-w-md rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-destructive" />
                </div>
                <button onClick={() => setSuspendTarget(null)} className="text-foreground/40 hover:text-foreground cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {suspendTarget.is_suspended ? 'Unsuspend' : 'Suspend'} {suspendTarget.username || suspendTarget.brand_name || 'this user'}?
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                {suspendTarget.is_suspended
                  ? 'This user will regain access to their account. Their products and showroom will become visible again.'
                  : 'This user will be logged out immediately. Their products, showroom, and all public content will be hidden from customers.'}
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={processing}
                  className={`flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-50 ${
                    suspendTarget.is_suspended
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-destructive hover:opacity-90'
                  }`}
                >
                  {processing ? (
                    'Processing...'
                  ) : suspendTarget.is_suspended ? (
                    <>
                      <Check size={16} /> Unsuspend
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} /> Yes, Suspend
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-white'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </>
  );
}