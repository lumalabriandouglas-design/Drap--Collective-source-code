import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { X, ImagePlus, ChevronDown, ChevronUp, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { compressImage } from '../../lib/compressImage';

const CATEGORIES = [
  'Ready-to-Wear',
  'Outerwear',
  'Accessories',
  'Knitwear',
  'Evening',
  'Avant-Garde',
  'Denim',
  'Other',
];

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

const DRAFT_KEY = 'drape:product-draft';
const DRAFT_DB = 'drape-product-drafts';
const DRAFT_STORE = 'images';

/* ─── IndexedDB helpers for image File blobs ─── */
function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDraftImages(files: File[]): Promise<void> {
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);
    store.clear();
    files.forEach((file, i) => {
      store.put(
        {
          blob: file,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        },
        i,
      );
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadDraftImages(): Promise<File[]> {
  try {
    const db = await openDraftDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const store = tx.objectStore(DRAFT_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as {
          blob: Blob;
          name: string;
          type: string;
          lastModified: number;
        }[];
        const files = rows.map(
          (r) => new File([r.blob], r.name, { type: r.type, lastModified: r.lastModified }),
        );
        resolve(files);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function clearDraftImages(): Promise<void> {
  try {
    const db = await openDraftDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

type TextDraft = {
  form: FormData;
  existingImages: string[];
  showMore: boolean;
  savedAt: string;
};

function loadTextDraft(): TextDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TextDraft;
  } catch {
    return null;
  }
}

function saveTextDraft(draft: TextDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode
  }
}

function clearTextDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function AddProduct() {
  const { profile, user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { formatPrice } = useCurrency();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draftBanner, setDraftBanner] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const skipNextSave = useRef(true);

  /* Load edit product OR restore local draft */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (editId) {
        await loadProduct(editId);
        if (!cancelled) setDraftReady(true);
        return;
      }

      const text = loadTextDraft();
      const files = await loadDraftImages();
      if (cancelled) return;

      if (text || files.length > 0) {
        if (text) {
          setForm(text.form || EMPTY_FORM);
          setExistingImages(text.existingImages || []);
          setShowMore(!!text.showMore);
        }
        if (files.length > 0) {
          setImages(files);
          setImagePreviews(files.map((f) => URL.createObjectURL(f)));
        }
        const when = text?.savedAt
          ? new Date(text.savedAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'recently';
        setDraftBanner(`Draft restored · saved ${when}`);
      }
      setDraftReady(true);
      setTimeout(() => {
        skipNextSave.current = false;
      }, 400);
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* Auto-save draft (new pieces only) */
  useEffect(() => {
    if (editId || !draftReady || skipNextSave.current) return;

    const timer = setTimeout(() => {
      saveTextDraft({
        form,
        existingImages,
        showMore,
        savedAt: new Date().toISOString(),
      });
      void saveDraftImages(images);
    }, 600);

    return () => clearTimeout(timer);
  }, [form, images, existingImages, showMore, editId, draftReady]);

  /* Cleanup object URLs on unmount */
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setImages((prev) => [...prev, ...fileArray]);
    const previews = fileArray.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function removeImage(index: number) {
    setImagePreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  async function discardDraft() {
    skipNextSave.current = true;
    clearTextDraft();
    await clearDraftImages();
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setForm(EMPTY_FORM);
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setShowMore(false);
    setDraftBanner(null);
    setError(null);
    setTimeout(() => {
      skipNextSave.current = false;
    }, 400);
  }

  const totalImages = existingImages.length + images.length;
  const canPublish = form.name.trim() && form.price && totalImages > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError('Authentication lost. Please sign in again.');
      return;
    }
    if (!form.name.trim()) {
      setError('Please give your piece a name.');
      return;
    }
    if (totalImages === 0) {
      setError('Please add at least one photo.');
      return;
    }
    if (!form.price) {
      setError('Please set a price.');
      return;
    }

    if (profile && profile.role !== 'designer' && profile.role !== 'admin') {
      setError('Your account is not set up as a designer. Please complete onboarding first.');
      return;
    }

    setError(null);
    setOptimizing(true);

    try {
      let imageUrls = [...existingImages];
      const uploadErrors: string[] = [];

      const compressedFiles: { file: File; name: string }[] = [];
      for (const file of images) {
        try {
          const result = await compressImage(file);
          compressedFiles.push({ file: result.file, name: file.name });
        } catch (compressErr) {
          const msg = compressErr instanceof Error ? compressErr.message : 'Compression failed';
          uploadErrors.push(`${file.name}: ${msg}`);
        }
      }

      setOptimizing(false);
      setSaving(true);

      for (const { file, name } of compressedFiles) {
        try {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(path, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            uploadErrors.push(`${name}: ${uploadError.message}`);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('products').getPublicUrl(path);
          imageUrls.push(publicUrl);
        } catch (perFileErr) {
          const msg = perFileErr instanceof Error ? perFileErr.message : 'Unknown error';
          uploadErrors.push(`${name}: ${msg}`);
        }
      }

      if (uploadErrors.length > 0 && imageUrls.length === 0) {
        throw new Error(`Image upload failed. ${uploadErrors.slice(0, 2).join('; ')}`);
      }

      // Publish immediately — no moderation queue
      const productData = {
        user_id: profile?.id || userId,
        name: form.name.trim(),
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
        status: 'published',
        is_hidden: false,
      };

      if (editId) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editId);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase.from('products').insert(productData);
        if (insertError) throw new Error(insertError.message);
      }

      // Clear local draft after successful publish
      clearTextDraft();
      await clearDraftImages();
      skipNextSave.current = true;

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
        <title>{editId ? 'Edit Piece' : 'New Piece'} — Drapé Collective</title>
      </Helmet>

      <div className="min-h-screen bg-bg">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              to="/designer/products"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:border-charcoal-300 transition-all"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-800">
                {editId ? 'Edit Piece' : 'New Piece'}
              </h1>
              <p className="text-sm text-charcoal-400 mt-0.5">
                {editId ? 'Update your design' : 'Share something beautiful · draft auto-saves'}
              </p>
            </div>
          </div>

          {/* Draft restored banner */}
          {draftBanner && !editId && (
            <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gold-50 border border-gold-200/60">
              <p className="text-xs sm:text-sm text-charcoal-600 min-w-0">{draftBanner}</p>
              <button
                type="button"
                onClick={() => void discardDraft()}
                className="shrink-0 flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                Discard
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ─── PHOTOS ─── */}
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <label className="text-sm font-medium text-charcoal-700">
                  Photos <span className="text-gold-500">*</span>
                </label>
                <span className="text-xs text-charcoal-400">
                  {totalImages} {totalImages === 1 ? 'photo' : 'photos'}
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  dragOver
                    ? 'border-gold-400 bg-gold-50/50'
                    : 'border-border hover:border-charcoal-300 hover:bg-ivory-50'
                } ${totalImages === 0 ? 'py-16' : 'py-8'}`}
              >
                <div className="flex flex-col items-center justify-center gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-ivory-100 flex items-center justify-center">
                    <ImagePlus size={22} className="text-charcoal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-700">
                      {totalImages === 0 ? 'Add photos of your piece' : 'Add more photos'}
                    </p>
                    <p className="text-xs text-charcoal-400 mt-1">
                      Drag & drop or click · JPG, PNG · Multiple allowed
                    </p>
                  </div>
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

              {/* Previews — remove always visible */}
              {totalImages > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                  {existingImages.map((url, i) => (
                    <div
                      key={`ex-${i}`}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ivory-100"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExistingImage(url);
                        }}
                        className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-red-600 transition-colors cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-2 left-2 text-[10px] tracking-wider uppercase bg-black/60 text-white px-2 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                  {imagePreviews.map((preview, i) => (
                    <div
                      key={`new-${i}`}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ivory-100"
                    >
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-red-600 transition-colors cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                      {existingImages.length === 0 && i === 0 && (
                        <span className="absolute bottom-2 left-2 text-[10px] tracking-wider uppercase bg-black/60 text-white px-2 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── NAME ─── */}
            <section>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal-700 mb-2">
                Name <span className="text-gold-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Draped Corset Dress"
                className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm text-charcoal-800 placeholder:text-charcoal-300 focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
              />
            </section>

            {/* ─── PRICE ─── */}
            <section>
              <label htmlFor="price" className="block text-sm font-medium text-charcoal-700 mb-2">
                Price <span className="text-gold-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm text-charcoal-800 placeholder:text-charcoal-300 focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                />
              </div>
              {form.price && (
                <p className="text-xs text-charcoal-400 mt-1.5">
                  Will display as {formatPrice(parseFloat(form.price) || 0)}
                </p>
              )}
            </section>

            {/* ─── CATEGORY ─── */}
            <section>
              <label className="block text-sm font-medium text-charcoal-700 mb-3">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, category: f.category === cat ? '' : cat }))
                    }
                    className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                      form.category === cat
                        ? 'bg-charcoal-700 text-white'
                        : 'bg-ivory-100 text-charcoal-500 hover:bg-ivory-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>
            {/* ─── MORE DETAILS ─── */}
            <section>
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex items-center justify-between w-full py-3 text-left group cursor-pointer"
              >
                <span className="text-sm font-medium text-charcoal-600 group-hover:text-charcoal-800 transition-colors">
                  Additional details
                  <span className="text-charcoal-400 font-normal ml-1.5">(optional)</span>
                </span>
                {showMore ? (
                  <ChevronUp size={18} className="text-charcoal-400" />
                ) : (
                  <ChevronDown size={18} className="text-charcoal-400" />
                )}
              </button>

              {showMore && (
                <div className="space-y-5 pt-2 pb-4 border-t border-border">
                  <div>
                    <label className="block text-sm text-charcoal-600 mb-1.5">Description</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the piece, fit, occasion..."
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-charcoal-600 mb-1.5">Materials</label>
                      <input
                        type="text"
                        value={form.materials}
                        onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
                        placeholder="Silk, Cotton, Linen"
                        className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-charcoal-600 mb-1.5">Sizes</label>
                      <input
                        type="text"
                        value={form.sizes}
                        onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                        placeholder="XS, S, M, L or Made to measure"
                        className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-charcoal-600 mb-1.5">
                      Artistic Statement
                    </label>
                    <textarea
                      rows={2}
                      value={form.artistic_statement}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, artistic_statement: e.target.value }))
                      }
                      placeholder="The story or inspiration behind this piece..."
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-charcoal-600 mb-1.5">Lead Time</label>
                      <input
                        type="text"
                        value={form.lead_time}
                        onChange={(e) => setForm((f) => ({ ...f, lead_time: e.target.value }))}
                        placeholder="1–2 weeks"
                        className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-charcoal-600 mb-1.5">Tags</label>
                      <input
                        type="text"
                        value={form.tags}
                        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                        placeholder="sustainable, evening, custom"
                        className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300/40 focus:border-gold-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <button
                type="submit"
                disabled={!canPublish || optimizing || saving}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-charcoal-700 text-white font-medium text-sm tracking-wide hover:bg-charcoal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {(optimizing || saving) && <Loader2 size={18} className="animate-spin" />}
                {optimizing
                  ? 'Optimizing photos…'
                  : saving
                    ? 'Publishing…'
                    : editId
                      ? 'Update Piece'
                      : 'Publish Piece'}
              </button>

              {!canPublish && (
                <p className="text-center text-xs text-charcoal-400 mt-3">
                  Add a name, price, and at least one photo to publish
                </p>
              )}
              {!editId && (
                <p className="text-center text-[11px] text-charcoal-300 mt-2">
                  Progress is saved on this device automatically
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}