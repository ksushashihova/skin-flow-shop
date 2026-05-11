export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          id: string
          postal_code: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          id?: string
          postal_code: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          id?: string
          postal_code?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_href: string
          cta_label: string
          enabled: boolean
          id: string
          image: string
          sort_order: number
          subtitle: string
          text_color: Database["public"]["Enums"]["banner_text_color"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_href?: string
          cta_label?: string
          enabled?: boolean
          id: string
          image?: string
          sort_order?: number
          subtitle?: string
          text_color?: Database["public"]["Enums"]["banner_text_color"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_href?: string
          cta_label?: string
          enabled?: boolean
          id?: string
          image?: string
          sort_order?: number
          subtitle?: string
          text_color?: Database["public"]["Enums"]["banner_text_color"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          position: number
          product_id: string
        }
        Insert: {
          bundle_id: string
          position?: number
          product_id: string
        }
        Update: {
          bundle_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          cover: string
          created_at: string
          description: string
          discount_percent: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cover?: string
          created_at?: string
          description?: string
          discount_percent?: number
          id: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cover?: string
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name_en: string
          name_ru: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name_en: string
          name_ru: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string
          name_ru?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          kind: string
          policy_version: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          kind: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          kind?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          amount: number
          buyer_user_id: string | null
          code: string
          created_at: string
          design: string
          message: string | null
          recipient_email: string
          remaining: number
        }
        Insert: {
          amount: number
          buyer_user_id?: string | null
          code: string
          created_at?: string
          design?: string
          message?: string | null
          recipient_email: string
          remaining: number
        }
        Update: {
          amount?: number
          buyer_user_id?: string | null
          code?: string
          created_at?: string
          design?: string
          message?: string | null
          recipient_email?: string
          remaining?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_line: string
          bonus_earned: number
          bonus_used: number
          city: string
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_price: number
          estimated_delivery: string | null
          id: string
          items: Json
          payment_method: Database["public"]["Enums"]["payment_method"]
          postal_code: string
          promo_discount: number
          promo_used: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_number: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          address_line: string
          bonus_earned?: number
          bonus_used?: number
          city: string
          created_at?: string
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_price?: number
          estimated_delivery?: string | null
          id?: string
          items?: Json
          payment_method: Database["public"]["Enums"]["payment_method"]
          postal_code: string
          promo_discount?: number
          promo_used?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_number?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          address_line?: string
          bonus_earned?: number
          bonus_used?: number
          city?: string
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_price?: number
          estimated_delivery?: string | null
          id?: string
          items?: Json
          payment_method?: Database["public"]["Enums"]["payment_method"]
          postal_code?: string
          promo_discount?: number
          promo_used?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          tracking_number?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string[]
          category: string
          cover: string
          created_at: string
          excerpt: string
          images: string[]
          published_at: string
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string[]
          category?: string
          cover?: string
          created_at?: string
          excerpt?: string
          images?: string[]
          published_at?: string
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string[]
          category?: string
          cover?: string
          created_at?: string
          excerpt?: string
          images?: string[]
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description_en: string
          description_ru: string
          how_to_use: string | null
          id: string
          images: string[]
          name_en: string
          name_ru: string
          price: number
          slug: string
          stock: number
          tagline_en: string
          tagline_ru: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description_en?: string
          description_ru?: string
          how_to_use?: string | null
          id: string
          images?: string[]
          name_en: string
          name_ru: string
          price: number
          slug: string
          stock?: number
          tagline_en?: string
          tagline_ru?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description_en?: string
          description_ru?: string
          how_to_use?: string | null
          id?: string
          images?: string[]
          name_en?: string
          name_ru?: string
          price?: number
          slug?: string
          stock?: number
          tagline_en?: string
          tagline_ru?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bonus_balance: number
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          bonus_balance?: number
          created_at?: string
          email: string
          id: string
          name?: string
          phone?: string | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          bonus_balance?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      promos: {
        Row: {
          amount: number | null
          code: string
          created_at: string
          description: string
          percent: number | null
          uses_left: number | null
        }
        Insert: {
          amount?: number | null
          code: string
          created_at?: string
          description?: string
          percent?: number | null
          uses_left?: number | null
        }
        Update: {
          amount?: number | null
          code?: string
          created_at?: string
          description?: string
          percent?: number | null
          uses_left?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          created_at: string
          id: string
          photos: string[]
          product_id: string
          rating: number
          text: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          created_at?: string
          id: string
          photos?: string[]
          product_id: string
          rating: number
          text?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          photos?: string[]
          product_id?: string
          rating?: number
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          consent: boolean
          created_at: string
          email: string
          promo_code: string | null
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email: string
          promo_code?: string | null
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string
          promo_code?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      banner_text_color: "light" | "dark"
      delivery_method: "pickup" | "courier" | "post" | "cdek"
      order_status: "new" | "paid" | "shipped" | "completed" | "cancelled"
      payment_method: "card_online" | "card_on_delivery" | "sbp" | "cash"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      banner_text_color: ["light", "dark"],
      delivery_method: ["pickup", "courier", "post", "cdek"],
      order_status: ["new", "paid", "shipped", "completed", "cancelled"],
      payment_method: ["card_online", "card_on_delivery", "sbp", "cash"],
    },
  },
} as const
