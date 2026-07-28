import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ProductView, Like, SiteVisit } from '../../types/supabase';
import { BarChart3, Eye, Heart, TrendingUp, Users } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalVisits: 0,
    visitsToday: 0,
    recentViews: [] as ProductView[],
    recentLikes: [] as Like[],
  });

  useEffect(() => { loadAnalytics(); }, []);

  async function loadAnalytics() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [viewsRes, likesRes, visitsRes, visitsTodayRes] = await Promise.all([
      supabase.from('product_views').select('*', { count: 'exact', head: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      supabase.from('site_visits').select('*', { count: 'exact', head: true }),
      supabase.from('site_visits').select('*', { count: 'exact', head: true }).gte('visited_at', todayISO),
    ]);

    const { data: recentViews } = await supabase.from('product_views').select('*').order('viewed_at', { ascending: false }).limit(10);
    const { data: recentLikes } = await supabase.from('likes').select('*, product:product_id(name)').order('created_at', { ascending: false }).limit(10);

    setData({
      totalViews: viewsRes.count || 0,
      totalLikes: likesRes.count || 0,
      totalVisits: visitsRes.count || 0,
      visitsToday: visitsTodayRes.count || 0,
      recentViews: recentViews || [],
      recentLikes: recentLikes || [],
    });
    setLoading(false);
  }

  const stats = [
    { label: 'Total Views', value: data.totalViews, icon: Eye, color: 'bg-primary/10 text-primary' },
    { label: 'Total Likes', value: data.totalLikes, icon: Heart, color: 'bg-destructive/10 text-destructive' },
    { label: 'Site Visits', value: data.totalVisits, icon: TrendingUp, color: 'bg-secondary/10 text-secondary' },
    { label: 'Visits Today', value: data.visitsToday, icon: Users, color: 'bg-accent/10 text-accent' },
  ];

  return (
    <>
      <Helmet><title>Analytics — Drapé Collective</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          <BarChart3 size={24} className="text-secondary" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Analytics</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {stats.map(s => (
                <div key={s.label} className="p-5 rounded-2xl bg-muted">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.color.split(' ')[0]} flex items-center justify-center ${s.color.split(' ')[1]}`}>
                      <s.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-foreground/50">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Views */}
              <div className="p-6 rounded-2xl bg-muted">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Views</h3>
                {data.recentViews.length === 0 ? (
                  <p className="text-sm text-foreground/40">No recent views</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentViews.map(view => (
                      <div key={view.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/60">{view.product_id?.slice(0, 8)}...</span>
                        <span className="text-foreground/40">{new Date(view.viewed_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Likes */}
              <div className="p-6 rounded-2xl bg-muted">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Likes</h3>
                {data.recentLikes.length === 0 ? (
                  <p className="text-sm text-foreground/40">No recent likes</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentLikes.slice(0, 10).map(like => (
                      <div key={like.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/60">
                          {(like as unknown as { product?: { name: string } })?.product?.name || like.product_id?.slice(0, 8) + '...'}
                        </span>
                        <span className="text-foreground/40">{new Date(like.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}