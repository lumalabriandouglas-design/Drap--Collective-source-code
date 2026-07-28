import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, ArrowLeft, Check, Palette, Store, BookOpen, Camera } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const steps = [
  { id: 'brand', title: 'Brand Details', icon: Store },
  { id: 'philosophy', title: 'Design Philosophy', icon: Palette },
  { id: 'portfolio', title: 'Portfolio', icon: BookOpen },
  { id: 'social', title: 'Social Links', icon: Camera },
];

export default function DesignerOnboarding() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    bio: '',
    location: '',
    website: '',
    instagram: '',
    design_philosophy: '',
    primary_materials: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        brand_name: profile.brand_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        instagram: profile.instagram || '',
        design_philosophy: profile.design_philosophy || '',
        primary_materials: (profile.primary_materials || []).join(', '),
      });
    }
  }, [profile]);

  const updateField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  async function saveStep() {
    if (!profile) return;
    setSaving(true);

    const updateData: Record<string, unknown> = {};
    if (step === 0) {
      updateData.brand_name = form.brand_name || null;
      updateData.bio = form.bio || null;
      updateData.location = form.location || null;
    } else if (step === 1) {
      updateData.design_philosophy = form.design_philosophy || null;
      updateData.primary_materials = form.primary_materials ? form.primary_materials.split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (step === 3) {
      updateData.website = form.website || null;
      updateData.instagram = form.instagram || null;
    }

    // On final step, ensure the profile role is set to 'designer'
    // (covers the case where an existing customer upgrades to designer)
    if (step === steps.length - 1) {
      updateData.role = 'designer';
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateErr } = await supabase.from('profiles').update(updateData).eq('user_id', profile.user_id);
      if (updateErr) {
        console.error('[Onboarding] Profile update error:', updateErr);
      }
    }

    setSaving(false);
  }

  async function handleNext() {
    await saveStep();
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      await refreshProfile();
      setCompleted(true);
    }
  }

  if (completed) {
    return (
      <>
        <Helmet><title>Welcome to Drapé — Designer Onboarding</title></Helmet>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Welcome to Drapé!</h2>
            <p className="text-foreground/60 mt-2">Your designer profile is set up. You can now start adding products and building your brand.</p>
            <button onClick={() => navigate('/designer/dashboard')} className="mt-6 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer">
              Go to Studio
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Designer Onboarding — Drapé Collective</title></Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  i <= step ? 'bg-primary text-on-primary' : 'bg-muted text-foreground/40'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              {step === 0 && <Store size={24} className="text-primary" />}
              {step === 1 && <Palette size={24} className="text-primary" />}
              {step === 2 && <BookOpen size={24} className="text-primary" />}
              {step === 3 && <Camera size={24} className="text-primary" />}
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground">{steps[step].title}</h2>
            <p className="text-foreground/60 mt-1 text-sm">
              {step === 0 && 'Tell customers about your brand'}
              {step === 1 && 'Share your creative vision'}
              {step === 2 && 'Build your portfolio by adding products and reels. They\'ll be visible to customers right away.'}
              {step === 3 && 'Link your online presence'}
            </p>
          </div>

          <div className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Brand Name</label>
                  <input type="text" value={form.brand_name} onChange={e => updateField('brand_name', e.target.value)} placeholder="Your Brand Name"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Bio</label>
                  <textarea rows={3} value={form.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Tell your story as a designer..."
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Location</label>
                  <input type="text" value={form.location} onChange={e => updateField('location', e.target.value)} placeholder="City, Country"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Design Philosophy</label>
                  <textarea rows={4} value={form.design_philosophy} onChange={e => updateField('design_philosophy', e.target.value)} placeholder="What drives your creative process? What makes your designs unique?"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Primary Materials</label>
                  <input type="text" value={form.primary_materials} onChange={e => updateField('primary_materials', e.target.value)} placeholder="Cotton, Silk, Recycled Polyester"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-xs text-foreground/40 mt-1">Comma separated list</p>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="p-6 rounded-2xl bg-muted text-center">
                <BookOpen size={36} className="mx-auto text-foreground/20 mb-3" />
                <p className="text-foreground/60">After you finish onboarding, you can start adding products and reels to build your portfolio.</p>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Website</label>
                  <input type="url" value={form.website} onChange={e => updateField('website', e.target.value)} placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Instagram</label>
                  <input type="text" value={form.instagram} onChange={e => updateField('instagram', e.target.value)} placeholder="yourhandle"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-xs text-foreground/40 mt-1">Just your username, no @ needed</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground disabled:opacity-30 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : step === steps.length - 1 ? 'Complete Setup' : 'Next'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}