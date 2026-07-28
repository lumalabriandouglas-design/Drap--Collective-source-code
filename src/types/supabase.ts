export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      designer_drafts: {
        Row: {
          created_at: string
          data: Json
          expires_at: string
          id: string
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lookbooks: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          designer_id: string
          id: string
          is_featured: boolean
          product_ids: string[] | null
          published_at: string | null
          status: string
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          designer_id: string
          id?: string
          is_featured?: boolean
          product_ids?: string[] | null
          published_at?: string | null
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          designer_id?: string
          id?: string
          is_featured?: boolean
          product_ids?: string[] | null
          published_at?: string | null
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_urls: string[] | null
          is_read: boolean | null
          read_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_read?: boolean | null
          read_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artistic_statement: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_deleted: boolean
          is_featured: boolean
          is_hidden: boolean
          lead_time: string | null
          materials: string[] | null
          name: string
          price: number | null
          rejection_reason: string | null
          sizes: string[] | null
          status: Database["public"]["Enums"]["product_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
          video_urls: string[] | null
        }
        Insert: {
          artistic_statement?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          lead_time?: string | null
          materials?: string[] | null
          name: string
          price?: number | null
          rejection_reason?: string | null
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
          video_urls?: string[] | null
        }
        Update: {
          artistic_statement?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          lead_time?: string | null
          materials?: string[] | null
          name?: string
          price?: number | null
          rejection_reason?: string | null
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          brand_name: string | null
          created_at: string
          design_philosophy: string | null
          email: string | null
          id: string
          instagram: string | null
          is_suspended: boolean
          location: string | null
          preferred_currency: string
          primary_materials: string[] | null
          profile_photo_url: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["designer_status"]
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          brand_name?: string | null
          created_at?: string
          design_philosophy?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_suspended?: boolean
          location?: string | null
          preferred_currency?: string
          primary_materials?: string[] | null
          profile_photo_url?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["designer_status"]
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          brand_name?: string | null
          created_at?: string
          design_philosophy?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_suspended?: boolean
          location?: string | null
          preferred_currency?: string
          primary_materials?: string[] | null
          profile_photo_url?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["designer_status"]
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          style_tags: string[] | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          style_tags?: string[] | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          style_tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      reel_views: {
        Row: {
          id: string
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reels_videos: {
        Row: {
          created_at: string
          description: string | null
          duration_sec: number | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          name: string
          product_id: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          name: string
          product_id?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          product_id?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          product_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          id: string
          page_path: string
          session_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          page_path?: string
          session_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          page_path?: string
          session_id?: string
          visited_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_data: { Args: never; Returns: Json }
      get_designer_of_the_month: {
        Args: never
        Returns: {
          brand_name: string
          designer_id: string
          products_count: number
          profile_photo_url: string
          total_likes: number
          username: string
        }[]
      }
      get_outfit_of_the_month: {
        Args: never
        Returns: {
          brand_name: string
          designer_id: string
          likes_count: number
          product_id: string
          product_image_url: string
          product_name: string
          score: number
          username: string
          views_count: number
        }[]
      }
      get_saved_item_count: { Args: { product_id: string }; Returns: number }
      get_total_visits: { Args: never; Returns: number }
      get_unique_visitors: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      designer_status: "pending" | "approved" | "rejected" | "suspended"
      product_status: "pending" | "published" | "rejected"
      user_role: "customer" | "designer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export type Profile = Tables<"profiles">
export type Product = Tables<"products">
export type Lookbook = Tables<"lookbooks">
export type Conversation = Tables<"conversations">
export type Message = Tables<"messages">
export type SavedItem = Tables<"saved_items">
export type Like = Tables<"likes">
export type QuizResult = Tables<"quiz_results">
export type Report = Tables<"reports">
export type ProductView = Tables<"product_views">
export type ReelVideo = Tables<"reels_videos">
export type ReelView = Tables<"reel_views">
export type SiteVisit = Tables<"site_visits">
export type DesignerDraft = Tables<"designer_drafts">

// Backward-compatibility aliases for types that were named differently in the legacy code
export type UserRole = Enums<'user_role'>;
export type ReelsVideo = ReelVideo;
