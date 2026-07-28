export type UserRole = 'customer' | 'designer' | 'admin';
export type DesignerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ProductStatus = 'pending' | 'approved' | 'rejected';
export type LookbookStatus = 'draft' | 'published' | 'archived';
export type ReelStatus = 'pending' | 'approved' | 'rejected' | 'processing';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  brand_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  profile_photo_url: string | null;
  preferred_currency: string;
  status: DesignerStatus;
  created_at: string;
  updated_at: string;
  username: string | null;
  email: string | null;
  rejection_reason: string | null;
  is_suspended: boolean;
  design_philosophy: string | null;
  primary_materials: string[];
  instagram: string | null;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  materials: string[];
  sizes: string[];
  image_urls: string[];
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  video_urls: string[];
  artistic_statement: string;
  rejection_reason: string | null;
  tags: string[];
  is_featured: boolean;
  is_hidden: boolean;
  lead_time: string | null;
  designer?: Profile;
  like_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface SavedItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_urls: string[];
  read_at: string | null;
  created_at: string;
  is_read: boolean;
  status: string;
  sender?: Profile;
}

export interface Lookbook {
  id: string;
  designer_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  product_ids: string[];
  tags: string[];
  status: LookbookStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  products?: Product[];
  designer?: Profile;
}

export interface QuizResult {
  id: string;
  user_id: string;
  answers: Record<string, string>;
  style_tags: string[];
  created_at: string;
}

export interface Report {
  id: string;
  product_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  product?: Product;
  reporter?: Profile;
}

export interface Reel {
  id: string;
  user_id: string;
  product_id: string | null;
  video_url: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_sec: number | null;
  status: ReelStatus;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  designer?: Profile;
  view_count?: number;
}

export interface ReelView {
  id: string;
  product_id: string;
  user_id: string;
  viewed_at: string;
}

export interface ProductView {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface DesignerDraft {
  id: string;
  user_id: string;
  step: number;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsMetrics {
  total_products: number;
  total_views: number;
  total_likes: number;
  total_saves: number;
  total_designers: number;
  total_customers: number;
  pending_products: number;
  pending_designers: number;
  pending_reels: number;
  active_reports: number;
  recent_visits: number;
}