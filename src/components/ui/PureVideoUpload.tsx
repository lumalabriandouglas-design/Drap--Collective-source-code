import { useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PureVideoUploadProps {
  open: boolean;
  onClose: () => void;
}

export default function PureVideoUpload({ open, onClose }: PureVideoUploadProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedVideo(file);
  };

  /**
   * ZERO-COMPRESSOR RAW DIRECT REBUILD
   * ─────────────────────────────────
   * Every media-transcoding dependency, every ffmpeg invocation,
   * every background compression script — completely purged.
   *
   * The only path to navigate('/dashboard') is the explicit success
   * block. Every error branch sets isUploading(false) and returns
   * immediately, freezing the form on screen with an alert visible.
   */
  const handlePublish = useCallback(async () => {
    if (!user) {
      alert('You must be logged in to publish a reel.');
      return;
    }
    if (!selectedVideo) {
      alert('Please select a video file first.');
      return;
    }

    setIsUploading(true);

    try {
      // ── Step 1: Stream the raw file directly to the bucket exactly as it is ──
      const fileName = `reels/${Date.now()}_video.mp4`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('reels_videos')
        .upload(fileName, selectedVideo);

      if (storageError) {
        alert('SUPABASE BUCKET REJECTION: ' + storageError.message);
        setIsUploading(false);
        return; // HALT EXECUTION — no redirect
      }

      // ── Step 2: Get the public URL ──
      const { data: { publicUrl } } = supabase.storage
        .from('reels_videos')
        .getPublicUrl(storageData.path);

      // ── Step 3: Direct Database Row Entry ──
      const { error: dbError } = await supabase
        .from('reels_videos')
        .insert({
          video_url: publicUrl,
          name: captionText.trim() || 'Untitled Reel',
          description: captionText,
          user_id: user.id,
          mime_type: selectedVideo.type,
          file_size_bytes: selectedVideo.size,
        });

      if (dbError) {
        alert('SUPABASE TABLE REJECTION: ' + dbError.message);
        setIsUploading(false);
        return; // HALT EXECUTION — no redirect
      }

      // ── Step 4: Explicit Success — locked behind this single gate ──
      alert('Success! Video uploaded directly.');
      setSelectedVideo(null);
      setCaptionText('');
      onClose();
      navigate('/dashboard');
    } catch (err: unknown) {
      alert('FATAL CODE EXCEPTION: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsUploading(false);
      return; // HALT EXECUTION — no redirect
    }
  }, [selectedVideo, user, captionText, onClose, navigate]);

  if (!open) return null;

  return (
    <div
      className="fixed top-0 left-0 z-50 flex items-center justify-center bg-charcoal-900/60"
      style={{
        width: '100vw',
        height: '100dvh',
        overscrollBehavior: 'none',
      }}
      onMouseDown={onClose}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-lg shadow-elevation-3"
        style={{ height: '360px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Prevent native form submission on Enter key ── */}
        <form onSubmit={(e) => e.preventDefault()} className="contents">
          {/* Header — fixed height strip */}
          <div className="flex items-center justify-between h-14 px-6 border-b border-border-light">
            <h2 className="text-lg font-serif-alt text-charcoal-700">Upload Reel</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="text-charcoal-300 hover:text-charcoal-500 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body — fixed remaining space */}
          <div className="flex flex-col justify-between p-6" style={{ height: 'calc(360px - 56px)' }}>
            <div className="space-y-5">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-charcoal-500 mb-1.5">
                  Video File
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  disabled={isUploading}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-charcoal-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Caption Input */}
              <div>
                <label
                  htmlFor="reel-caption"
                  className="block text-sm font-medium text-charcoal-500 mb-1.5"
                >
                  Reel Caption
                </label>
                <input
                  id="reel-caption"
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  disabled={isUploading}
                  placeholder="Add a caption for your reel\u2026"
                  className="block w-full rounded-lg border border-border-light px-3 py-2 text-sm text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Button — always at the same spot */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={isUploading}
              className="btn-luxury btn-luxury-gold w-full mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Publishing&hellip;
                </>
              ) : (
                'Publish Reel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}