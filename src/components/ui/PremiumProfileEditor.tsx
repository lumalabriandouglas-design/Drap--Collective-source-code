import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from './AvatarUpload';

const PHILOSOPHY_PRESETS = [
  'Minimalist',
  'Avant-Garde',
  'Sustainable Luxury',
  'Artisanal Craft',
  'Modern Tailoring',
  'Romantic Revival',
  'Deconstruction',
  'Street Couture',
  'Zero-Waste Design',
  'Cultural Heritage',
  'Experimental Textiles',
  'Bespoke Couture',
];

const MATERIAL_PRESETS = [
  'Silk', 'Linen', 'Deadstock Denim', 'Organic Cotton', 'Tencel',
  'Cashmere', 'Recycled Polyester', 'Bamboo', 'Hemp', 'Wool',
  'Vintage Fabric', 'Peace Silk', 'Cork', 'Piñatex', 'Mushroom Leather',
];

interface PremiumProfileEditorProps {
  open: boolean;
  onClose: () => void;
}

export default function PremiumProfileEditor({ open, onClose }: PremiumProfileEditorProps) {
  const { profile, user, refreshProfile } = useAuth();
  const userId = profile?.user_id || user?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [brandName, setBrandName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [designPhilosophy, setDesignPhilosophy] = useState('');
  const [primaryMaterials, setPrimaryMaterials] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [location, setLocation] = useState('');

  // Sync from profile
  useEffect(() => {
    if (profile) {
      console.log('[PremiumProfileEditor] Syncing form with profile:', profile.user_id);
      setBrandName(profile.brand_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setDesignPhilosophy(profile.design_philosophy || '');
      setPrimaryMaterials((profile.primary_materials as string[]) || []);
      setLocation(profile.location || '');
      setProfilePhotoUrl(profile.profile_photo_url);
    }
  }, [profile]);

  useEffect(() => {
    console.log('[PremiumProfileEditor] Mounted with User ID:', userId);
  }, [userId]);

  if (!open) return null;

  const addMaterial = (mat: string) => {
    const trimmed = mat.trim();
    if (trimmed && !primaryMaterials.includes(trimmed)) {
      setPrimaryMaterials((prev) => [...prev, trimmed]);
    }
  };

  const removeMaterial = (mat: string) => {
    setPrimaryMaterials((prev) => prev.filter((m) => m !== mat));
  };

  const togglePhilosophy = (phrase: string) => {
    setDesignPhilosophy((prev) => {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(prev)) {
        return prev
          .replace(regex, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*/, '')
          .replace(/,\s*$/, '')
          .trim();
      }
      return prev ? `${prev}, ${phrase}` : phrase;
    });
  };

  const handleSave = async () => {
    if (!userId) {
      setError('No user ID found. Please sign in again.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          brand_name: brandName.trim() || null,
          username: username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || null,
          bio: bio.trim() || null,
          design_philosophy: designPhilosophy.trim() || null,
          primary_materials: primaryMaterials.length > 0 ? primaryMaterials : null,
          location: location.trim() || null,
          profile_photo_url: profilePhotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      if (updateError) throw updateError;
      console.log('[PremiumProfileEditor] Profile saved successfully for user:', userId);
      await refreshProfile();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      console.error('[PremiumProfileEditor] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-start justify-center p-4 pt-12 md:pt-20 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-bg rounded-2xl border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-border">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Brand Profile</h2>
            <p className="text-sm text-foreground/50 mt-0.5">
              Present your brand to the Drapé Collective community
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 text-xs text-destructive">{error}</div>
          )}

          {/* ═══ Avatar Section ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">Profile Photo</h3>
            <AvatarUpload
              currentUrl={profilePhotoUrl}
              userId={userId || ''}
              onUploadComplete={(url) => setProfilePhotoUrl(url)}
              size={120}
            />
          </section>

          {/* ═══ Brand Identity ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">Brand Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1.5 tracking-wide">
                  Brand / Studio Name
                </label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30"
                  placeholder="e.g. Maison Lumière"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1.5 tracking-wide">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-foreground/40">@</span>
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                    }
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30"
                    placeholder="yourbrand"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ═══ About / Bio ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">About</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30 resize-none"
              placeholder="Tell your brand story — your heritage, inspiration, and creative journey…"
            />
            <p className="mt-1.5 text-xs text-foreground/40 text-right">{bio.length} / 1000</p>
          </section>

          {/* ═══ Design Philosophy ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">
              Design Philosophy &amp; Aesthetic
            </h3>
            <div>
              <textarea
                value={designPhilosophy}
                onChange={(e) => setDesignPhilosophy(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30 resize-none"
                placeholder="e.g. Minimalist, Avant-Garde, Sustainable Luxury"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PHILOSOPHY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePhilosophy(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    designPhilosophy.toLowerCase().includes(p.toLowerCase())
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-foreground/60 hover:border-primary/30'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* ═══ Primary Materials ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">
              Primary Mediums / Materials
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {primaryMaterials.map((mat) => (
                <span
                  key={mat}
                  className="inline-flex items-center gap-1 text-xs text-foreground bg-muted px-2.5 py-1 rounded-full border border-border"
                >
                  {mat}
                  <button
                    type="button"
                    onClick={() => removeMaterial(mat)}
                    className="text-foreground/40 hover:text-destructive transition-colors cursor-pointer"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMaterial(materialInput);
                    setMaterialInput('');
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30"
                placeholder="Type a material & press Enter"
              />
            </div>
            <div className="mt-2">
              <p className="text-xs text-foreground/40 mb-1.5">Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {MATERIAL_PRESETS.filter((m) => !primaryMaterials.includes(m)).slice(0, 10).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      addMaterial(m);
                      setMaterialInput('');
                    }}
                    className="text-xs text-foreground/50 hover:text-foreground bg-muted hover:bg-primary/5 px-2 py-0.5 rounded-full border border-border transition-colors cursor-pointer"
                  >
                    + {m}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ Location ═══ */}
          <section>
            <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-[0.1em] mb-4">
              Location
            </h3>
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5 tracking-wide">
                Base of Operations
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-sm text-foreground placeholder:text-foreground/30"
                  placeholder="e.g. Paris, France"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex gap-3 p-6 md:p-8 pt-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-primary text-on-primary font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border border-white/30 border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-3 bg-muted text-foreground font-medium rounded-xl hover:opacity-80 transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
