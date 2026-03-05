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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      binance_connections: {
        Row: {
          api_key_encrypted: string | null
          api_key_masked: string
          api_secret_encrypted: string | null
          connected_at: string
          id: string
          is_connected: boolean
          permissions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_masked: string
          api_secret_encrypted?: string | null
          connected_at?: string
          id?: string
          is_connected?: boolean
          permissions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_masked?: string
          api_secret_encrypted?: string | null
          connected_at?: string
          id?: string
          is_connected?: boolean
          permissions?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_purchases: {
        Row: {
          bot_id: string
          id: string
          price: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          bot_id: string
          id?: string
          price: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          id?: string
          price?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          account_type: string
          created_at: string
          id: string
          is_running: boolean
          name: string
          profit: number
          stake_amount: number
          strategy: string
          trades_count: number
          updated_at: string
          user_id: string
          win_rate: number
        }
        Insert: {
          account_type?: string
          created_at?: string
          id?: string
          is_running?: boolean
          name: string
          profit?: number
          stake_amount?: number
          strategy: string
          trades_count?: number
          updated_at?: string
          user_id: string
          win_rate?: number
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          is_running?: boolean
          name?: string
          profit?: number
          stake_amount?: number
          strategy?: string
          trades_count?: number
          updated_at?: string
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          demo_balance: number
          email: string | null
          id: string
          name: string | null
          phone_number: string | null
          real_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_balance?: number
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          real_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_balance?: number
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          real_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_type: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          profit_loss: number | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          account_type?: string
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          profit_loss?: number | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          account_type?: string
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          profit_loss?: number | null
          status?: string
          type?: string
          user_id?: string
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
      adjust_profile_balance: {
        Args: { p_account_type: string; p_delta: number }
        Returns: number
      }
      admin_credit_account: {
        Args: {
          p_account_type?: string
          p_amount: number
          p_target_user_id: string
        }
        Returns: number
      }
      admin_get_deposits: {
        Args: never
        Returns: {
          account_type: string
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          status: string
          user_email: string
          user_id: string
          user_name: string
          user_phone: string
        }[]
      }
      admin_get_users: {
        Args: never
        Returns: {
          created_at: string
          demo_balance: number
          email: string
          name: string
          phone_number: string
          real_balance: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
