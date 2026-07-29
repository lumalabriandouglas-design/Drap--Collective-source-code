import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, Check, Store, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function DesignerOnboarding() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    brand_name: '',
    bio: '',
    location: '',
    instagram: '',
    design_philosophy: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        brand_name: profile.brand_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        instagram: profile.instagram || '',
        design_philosophy: profile.design_philosophy || '',
      });
    }
  }, [profile]);

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function saveProfile(markAsDesigner = false) {
    if (!user?.id) {
      setError('You are not logged in. Please sign in again.');
      return false;
    }

    setSaving(true);
    setError(null);

    const updateData: Record<string, unknown> = {
      brand_name: form.brand_name.trim() || null,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      instagram: form.instagram.trim() || null,
      design_philosophy: form.design_philosophy.trim() || null,
    };

    if (markAsDesigner) {
      updateData.role = 'designer';
    }

    // Try updating by user_id first, then by id as fallback
    let { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      // Fallback
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (fallbackError) {
        console.error('Onboarding update failed:', fallbackError);
        setError(fallbackError.message);
        setSaving(false);
        return false;
      }
    }

    await refreshProfile();
    setSaving(false);
    return true;
  }

  async function handleContinue() {
    const success = await saveProfile(false);
    if (success) setStep(1);
  }

  async function handleComplete() {
    const success = await saveProfile(true);
    if (success) setCompleted(true);
  }

  async function handleSkip() {
    const success = await saveProfile(true); // still mark as designer
    if (success) setCompleted(true);
  }

  if (completed) {
    return (
      <>
        <Helmet><title>Welcome — Drapé Collective</title></Helmet>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-charcoal-700 flex items-center justify-center mx-auto mb-6">
              <Check size={28} className="text-white" />
            </div>
            <h2 className="font-serif text-2xl font-medium text-charcoal-800">You’re in</h2>
            <p className="text-charcoal-400 mt-3 text-sm">
              Your designer studio is ready. Start by adding your first piece.
            </p>
            <button
              onClick={() => navigate('/designer/add-product')}
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 bg-charcoal-700 text-white rounded-full text-sm font-medium hover:bg-charcoal-800"
            >
              Add your first piece
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 block mx-auto text-sm text-charcoal-400 hover:text-charcoal-600"
            >
              Go to Studio instead
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Designer Setup — Drapé Collective</title></Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Progress bar */}
          <div className="flex gap-3 mb-10">
            <div className={`h-1 flex-1 rounded-full ${step >= 0 ? 'bg-charcoal-700' : 'bg-ivory-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-charcoal-700' : 'bg-ivory-200'}`} />
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {step === 0 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-full bg-ivory-100 flex items-center justify-center mx-auto mb-4">
                  <Store size={22} className="text-charcoal-600" />
                </div>
                <h1 className="font-serif text-2xl font-medium text-charcoal-800">Set up your brand</h1>
                <p className="text-sm text-charcoal-400 mt-2">Just the essentials. You can refine later.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
                    Brand name <span className="text-gold-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.brand_name}
                    onChange={(e) => updateField('brand_name', e.target.value)}
                    placeholder="Your brand or designer name"
                    className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Short bio</label>
                  <textarea
                    rows={3}
                    value={form.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="A few words about you or your work..."
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/40"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleContinue}
                  disabled={!form.brand_name.trim() || saving}
                  className="w-full py-3.5 bg-charcoal-700 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Continue'}
                </button>

                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="w-full py-2.5 text-sm text-charcoal-400 hover:text-charcoal-600"
                >
                  Skip for now — I’ll finish later
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-full bg-ivory-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={22} className="text-charcoal-600" />
                </div>
                <h1 className="font-serif text-2xl font-medium text-charcoal-800">A little more (optional)</h1>
                <p className="text-sm text-charcoal-400 mt-2">You can skip any of these.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="City, Country"
                    className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Instagram</label>
                  <input
                    type="text"
                    value={form.instagram}
                    onChange={(e) => updateField('instagram', e.target.value)}
                    placeholder="yourhandle"
                    className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Design philosophy</label>
                  <textarea
                    rows={3}
                    value={form.design_philosophy}
                    onChange={(e) => updateField('design_philosophy', e.target.value)}
                    placeholder="What drives your work?"
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/40"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full py-3.5 bg-charcoal-700 text-white rounded-xl text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40"
                >
                  {saving ? 'Finishing…' : 'Complete setup'}
                </button>

                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="w-full py-2.5 text-sm text-charcoal-400 hover:text-charcoal-600"
                >
                  Skip remaining — take me to my studio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}