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
      liquidity_pool_tokens: {
        Row: {
          balance: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          pool_metadata: Json | null
          token_id: string | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          balance?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          pool_metadata?: Json | null
          token_id?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          balance?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          pool_metadata?: Json | null
          token_id?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidity_pool_tokens_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidity_pool_tokens_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_registry: {
        Row: {
          created_at: string | null
          decimals: number | null
          id: string
          last_price_update: string | null
          price_usd: number | null
          token_address: string
          token_icon: string | null
          token_name: string | null
          token_symbol: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decimals?: number | null
          id?: string
          last_price_update?: string | null
          price_usd?: number | null
          token_address: string
          token_icon?: string | null
          token_name?: string | null
          token_symbol?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decimals?: number | null
          id?: string
          last_price_update?: string | null
          price_usd?: number | null
          token_address?: string
          token_icon?: string | null
          token_name?: string | null
          token_symbol?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_tokens: {
        Row: {
          balance: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          token_id: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          balance?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          token_id: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          balance?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          token_id?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_tokens_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_tokens_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_primary: boolean | null
          label: string | null
          updated_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
  }
}
