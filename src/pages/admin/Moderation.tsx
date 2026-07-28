import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, Product, Report } from '../../types/supabase';
import { Shield, Check, X, User, Package, Flag } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'designers' | 'products' | 'reports';

export default function AdminModeration() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('designers');
  const [pendingDesigners, setPendingDesigners] = useState<Profile[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<(Report & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [designersRes, productsRes, reportsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'designer').neq('status', 'approved').order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, product:product_id(*)').is('resolved_at', null).order('created_at', { ascending: false }),
    ]);
    setPendingDesigners(designersRes.data || []);
    setPendingProducts(productsRes.data || []);
    setReports((reportsRes.data || []) as (Report & { product?: Product })[]);
    setLoading(false);
  }

  async function approveDesigner(profile: Profile) {
    await supabase.from('profiles').update({ status: 'approved', rejection_reason: null }).eq('id', profile.id);
    setPendingDesigners(prev => prev.filter(p => p.id !== profile.id));
  }

  async function rejectDesigner(profile: Profile) {
    const reason = prompt('Rejection reason:');
    if (reason !== null) {
      await supabase.from('profiles').update({ status: 'rejected', rejection_reason: reason }).eq('id', profile.id);
      setPendingDesigners(prev => prev.filter(p => p.id !== profile.id));
    }
  }

  async function approveProduct(product: Product) {
    await supabase.from('products').update({ status: 'published', rejection_reason: null }).eq('id', product.id);
    setPendingProducts(prev => prev.filter(p => p.id !== product.id));
  }

  async function rejectProduct(product: Product) {
    const reason = prompt('Rejection reason:');
    if (reason !== null) {
      await supabase.from('products').update({ status: 'rejected', rejection_reason: reason }).eq('id', product.id);
      setPendingProducts(prev => prev.filter(p => p.id !== product.id));
    }
  }

  async function dismissReport(report: Report) {
    await supabase.from('reports').update({ resolved_at: new Date().toISOString(), resolved_by: user?.id || null }).eq('id', report.id);
    setReports(prev => prev.filter(r => r.id !== report.id));
  }

  const tabs = [
    { id: 'designers' as Tab, label: 'Designers', count: pendingDesigners.length, icon: User },
    { id: 'products' as Tab, label: 'Products', count: pendingProducts.length, icon: Package },
    { id: 'reports' as Tab, label: 'Reports', count: reports.length, icon: Flag },
  ];

  return (
    <>
      <Helmet><title>Moderation — Drapé Collective</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={24} className="text-primary" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Moderation</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                tab === t.id ? 'bg-primary text-on-primary' : 'bg-muted text-foreground/60 hover:bg-muted/80'
              }`}
            >
              <t.icon size={16} />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-on-primary/20' : 'bg-primary/10 text-primary'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Designers */}
            {tab === 'designers' && (
              pendingDesigners.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-2xl">
                  <Shield size={36} className="mx-auto text-foreground/20 mb-3" />
                  <p className="text-foreground/40">No pending designer applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDesigners.map(designer => (
                    <div key={designer.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {designer.brand_name?.[0] || designer.username?.[0] || 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{designer.brand_name || designer.username || 'Unnamed'}</p>
                        <p className="text-xs text-foreground/50">{designer.email || 'No email'} · {designer.location || 'No location'}</p>
                        {designer.bio && <p className="text-xs text-foreground/40 mt-1 truncate">{designer.bio}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => approveDesigner(designer)} className="p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-all cursor-pointer" title="Approve">
                          <Check size={18} />
                        </button>
                        <button onClick={() => rejectDesigner(designer)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all cursor-pointer" title="Reject">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Products */}
            {tab === 'products' && (
              pendingProducts.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-2xl">
                  <Package size={36} className="mx-auto text-foreground/20 mb-3" />
                  <p className="text-foreground/40">No pending products</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingProducts.map(product => (
                    <div key={product.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted-foreground/10 flex-shrink-0">
                        <img src={product.image_urls?.[0] || ''} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-foreground/50">{product.category || 'Uncategorized'} · €{product.price || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => approveProduct(product)} className="p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-all cursor-pointer" title="Approve">
                          <Check size={18} />
                        </button>
                        <button onClick={() => rejectProduct(product)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all cursor-pointer" title="Reject">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Reports */}
            {tab === 'reports' && (
              reports.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-2xl">
                  <Flag size={36} className="mx-auto text-foreground/20 mb-3" />
                  <p className="text-foreground/40">No open reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Flag size={18} className="text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{report.product?.name || 'Unknown product'}</p>
                        <p className="text-xs text-foreground/50">{report.reason}</p>
                      </div>
                      <button onClick={() => dismissReport(report)} className="px-3 py-1.5 text-xs bg-muted-foreground/10 text-foreground/60 rounded-lg hover:bg-muted-foreground/20 transition-all cursor-pointer">
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}