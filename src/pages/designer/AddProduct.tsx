import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product } from '../../types/supabase';
import { X, Save, Image as ImageIcon, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { compressImage } from '../../lib/compressImage';

const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Footwear', 'Streetwear', 'Sustainable'];

type FormData = {
  name: string;
  description: string;
  category: string;
  price: string;
  materials: string;
  sizes: string;
  artistic_statement: string;
  lead_time: string;
  tags: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  category: '',
  price: '',
  materials: '',
  sizes: '',
  artistic_statement: '',
  lead_time: '',
  tags: '',
};

export default function AddProduct() {
  const { profile, user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { formatPrice } = useCurrency();
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  /* ─── Form data ─── */
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AddProduct] Mounting component with User ID:', userId, 'Edit ID:', editId);
  }, [userId, editId]);

  useEffect(() => {
    if (editId) loadProduct(editId);
  }, [editId]);

  async function loadProduct(id: string) {
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (data) {
      setForm({
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        price: data.price?.toString() || '',
        materials: (data.materials || []).join(', '),
        sizes: (data.sizes || []).join(', '),
        artistic_statement: data.artistic_statement || '',
        lead_time: data.lead_time || '',
        tags: (data.tags || []).join(', '),
      });
      setExistingImages(data.image_urls || []);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files];
    setImages(newImages);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  /* ─── Step navigation ─── */
  const goToNextStep = useCallback(() => {
    setStepError(null);

    if (step === 1) {
      // Validate required fields before advancing
      if (!form.name.trim()) {
        setStepError('Please enter a product name before continuing.');
        return;
      }
    }

    try {
      const nextStep = step + 1;
      console.log('[AddProduct] Advancing to step:', nextStep);
      setStep(nextStep);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load the photo step.';
      console.error('[AddProduct] Step transition error:', err);
      setStepError('Could not advance to the photo upload screen: ' + msg);
    }
  }, [step, form.name]);

  const goToPrevStep = useCallback(() => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  /* ─── Submit ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError('Authentication lost. Please sign in again.');
      return;
    }
    if (!form.name) {
      setError('Product name is required.');
      return;
    }

    // Early role check — surface a clear message if the user isn't a designer
    if (profile && profile.role !== 'designer' && profile.role !== 'admin') {
      setError(
        'Your account is not set up as a designer. Please complete the designer onboarding or contact support to enable design uploads.'
      );
      return;
    }

    setError(null);
    setOptimizing(true);
    try {
      let imageUrls = [...existingImages];
      const uploadErrors: string[] = [];

      // ── Phase 1: Compress all images in-browser ──
      const compressedFiles: { file: File; name: string }[] = [];
      for (const file of images) {
        try {
          const result = await compressImage(file);
          compressedFiles.push({ file: result.file, name: file.name });
          console.log(
            '[AddProduct] Compressed', file.name,
            result.originalSize, '→', result.compressedSize, 'bytes (quality', result.qualityUsed, ')'
          );
        } catch (compressErr) {
          const msg = compressErr instanceof Error ? compressErr.message : 'Compression failed';
          uploadErrors.push(`${file.name}: ${msg}`);
        }
      }

      // ── Phase 2: Upload compressed images ──
      setOptimizing(false);
      setSaving(true);

      for (const { file, name } of compressedFiles) {
        try {
          // Sanitise filename
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanBase = name
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase()
            .slice(0, 60);

          const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('[AddProduct] upload error:', uploadError);
            uploadErrors.push(`${cleanBase}: ${uploadError.message}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(path);
          imageUrls.push(publicUrl);
        } catch (perFileErr) {
          const msg = perFileErr instanceof Error ? perFileErr.message : 'Unknown error';
          console.error('[AddProduct] per-file error:', perFileErr);
          uploadErrors.push(`${name}: ${msg}`);
        }
      }

      // Surface upload errors gracefully
      if (uploadErrors.length > 0 && imageUrls.length === 0) {
        throw new Error(
          `Image upload failed. ${uploadErrors.slice(0, 3).join('; ')}${uploadErrors.length > 3 ? ` (+${uploadErrors.length - 3} more)` : ''}`
        );
      }
      if (uploadErrors.length > 0) {
        console.warn('[AddProduct] partial upload failure:', uploadErrors);
        setError(
          `${imageUrls.length} of ${images.length} images uploaded. Issues: ${uploadErrors.slice(0, 2).join('; ')}`
        );
      }
      const productData = {
        user_id: profile?.id || userId,
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        price: form.price ? parseFloat(form.price) : null,
        materials: form.materials
          ? form.materials.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        sizes: form.sizes
          ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        image_urls: imageUrls,
        artistic_statement: form.artistic_statement || null,
        lead_time: form.lead_time || null,
        tags: form.tags
          ? form.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        status: 'published', // Instant publish — no moderation queue
        is_hidden: false,
      };

      if (editId) {
        console.log('[AddProduct] Updating product:', editId, 'with data:', JSON.stringify(productData));
        const { error: updateError, data: updatedData } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editId)
          .select();

        if (updateError) {
          console.error('[AddProduct] Update error:', updateError);
          throw new Error(`Update failed: ${updateError.message}`);
        }
        console.log('[AddProduct] Update successful:', updatedData);
      } else {
        const { error: insertError } = await supabase.from('products').insert(productData);
        if (insertError) {
          console.error('[AddProduct] Insert error:', insertError);
          throw new Error(`Insert failed: ${insertError.message}`);
        }
      }
      console.log('[AddProduct] Product saved. Redirecting to /designer/products');
      navigate('/designer/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setOptimizing(false);
      setSaving(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{editId ? 'Edit' : 'Add'} Product — Drapé Collective</title>
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Step indicator ─── */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s === step
                    ? 'bg-primary text-on-primary'
                    : s < step
                    ? 'bg-primary/30 text-on-primary'
                    : 'bg-muted text-foreground/40'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${s === step ? 'text-foreground' : 'text-foreground/40'}`}>
                {s === 1 ? 'Details' : s === 2 ? 'Photos' : 'Review'}
              </span>
              {s < 3 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
          {editId ? 'Edit Product' : 'Add New Product'}
        </h1>

        {/* ─── Step error banner ─── */}
        {stepError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Navigation Error</p>
              <p className="text-xs text-destructive/80 mt-0.5">{stepError}</p>
            </div>
            <button
              type="button"
              onClick={() => setStepError(null)}
              className="ml-auto text-destructive/50 hover:text-destructive cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ════════════════════════════════════════ */}
          {/* STEP 1: Details */}
          {/* ════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Product Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Category
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Price
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="materials" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Materials (comma separated)
                  </label>
                  <input
                    id="materials"
                    type="text"
                    value={form.materials}
                    onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
                    placeholder="Cotton, Linen, Silk"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="sizes" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Sizes (comma separated)
                  </label>
                  <input
                    id="sizes"
                    type="text"
                    value={form.sizes}
                    onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                    placeholder="XS, S, M, L"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="artistic_statement" className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Artistic Statement
                </label>
                <textarea
                  id="artistic_statement"
                  rows={3}
                  value={form.artistic_statement}
                  onChange={(e) => setForm((f) => ({ ...f, artistic_statement: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Tell the story behind this piece..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lead_time" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Lead Time
                  </label>
                  <input
                    id="lead_time"
                    type="text"
                    value={form.lead_time}
                    onChange={(e) => setForm((f) => ({ ...f, lead_time: e.target.value }))}
                    placeholder="2-3 weeks"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="sustainable, streetwear"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* STEP 2: Photos */}
          {/* ════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Product Images</label>
                <div className="grid grid-cols-4 gap-3">
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((preview, i) => (
                    <div key={`new-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <ImageIcon size={20} className="text-foreground/30" />
                    <span className="text-xs text-foreground/30">Add Image</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* STEP 3: Review & Submit */}
          {/* ════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-xl bg-muted p-6 space-y-4">
                <h3 className="font-heading font-semibold text-foreground">Review Your Product</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <span className="text-foreground/50">Name</span>
                    <p className="text-foreground font-medium">{form.name}</p>
                  </div>
                  <div>
                    <span className="text-foreground/50">Category</span>
                    <p className="text-foreground font-medium">{form.category || '—'}</p>
                  </div>
                  <div>
                    <span className="text-foreground/50">Price</span>
                    <p className="text-foreground font-medium">{form.price ? formatPrice(parseFloat(form.price)) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-foreground/50">Lead Time</span>
                    <p className="text-foreground font-medium">{form.lead_time || '—'}</p>
                  </div>
                </div>
                {form.description && (
                  <div>
                    <span className="text-sm text-foreground/50">Description</span>
                    <p className="text-sm text-foreground mt-0.5">{form.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Error display ─── */}
          {error && (
            <p className="text-destructive text-sm bg-destructive/5 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* ─── Action buttons ─── */}
          <div className="flex gap-3 pt-4 border-t border-border">
            {step > 1 && (
              <button
                type="button"
                onClick={goToPrevStep}
                className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all cursor-pointer text-sm"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            <div className="flex-1" />

            {step < 3 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('[AddProduct] NEXT — ADD PHOTOS clicked. Current step:', step);
                  goToNextStep();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-medium rounded-xl hover:opacity-90 transition-all cursor-pointer text-sm"
              >
                {step === 1 ? 'NEXT — ADD PHOTOS' : 'NEXT — REVIEW'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={optimizing || saving || !form.name}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer text-sm"
              >
                {optimizing ? 'Optimizing Image…' : saving ? 'Uploading…' : editId ? 'Update Product' : 'Publish Product'}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}