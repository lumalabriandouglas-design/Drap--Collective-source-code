import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, Product, Report, SiteVisit } from '../../types/supabase';
import { Shield, Users, Package, Flag, BarChart3, Eye, Ban } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, products: 0, pendingDesigners: 0, pendingProducts: 0, reports: 0, visits: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    const [profiles, products, pendingD, pendingP, reports, visits, suspended] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'designer').eq('status', 'pending'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).is('resolved_at', null),
      supabase.from('site_visits').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    ]);
    setStats({
      users: profiles.count || 0,
      products: products.count || 0,
      pendingDesigners: pendingD.count || 0,
      pendingProducts: pendingP.count || 0,
      reports: reports.count || 0,
      visits: visits.count || 0,
      suspended: suspended.count || 0,
    });
    setLoading(false);
  }

  const cards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'bg-primary/10 text-primary', href: '/admin/users' },
    { label: 'Products', value: stats.products, icon: Package, color: 'bg-secondary/10 text-secondary', href: '/admin/moderation' },
    { label: 'Pending Designers', value: stats.pendingDesigners, icon: Shield, color: 'bg-accent/10 text-accent', href: '/admin/moderation' },
    { label: 'Pending Products', value: stats.pendingProducts, icon: Eye, color: 'bg-accent/10 text-accent', href: '/admin/moderation' },
    { label: 'Open Reports', value: stats.reports, icon: Flag, color: 'bg-destructive/10 text-destructive', href: '/admin/moderation' },
    { label: 'Suspended Users', value: stats.suspended, icon: Ban, color: 'bg-destructive/10 text-destructive', href: '/admin/users' },
    { label: 'Site Visits', value: stats.visits, icon: BarChart3, color: 'bg-primary/10 text-primary', href: '/admin/analytics' },
  ];

  return (
    <>
      <Helmet><title>Admin Dashboard — Drapé Collective</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={24} className="text-accent" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {cards.map(card => (
                <Link key={card.label} to={card.href} className="p-5 rounded-2xl bg-muted hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${card.color.split(' ')[0]} flex items-center justify-center ${card.color.split(' ')[1]}`}>
                      <card.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      <p className="text-xs text-foreground/50">{card.label}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link to="/admin/moderation" className="p-6 rounded-2xl bg-muted hover:bg-muted/80 transition-colors">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Moderation Queue</h3>
                <p className="text-sm text-foreground/60">
                  {stats.pendingDesigners + stats.pendingProducts + stats.reports} items awaiting review
                </p>
              </Link>
              <Link to="/admin/analytics" className="p-6 rounded-2xl bg-muted hover:bg-muted/80 transition-colors">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Analytics</h3>
                <p className="text-sm text-foreground/60">{stats.visits} total site visits</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}