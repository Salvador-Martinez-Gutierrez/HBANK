export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    wallet_address: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    wallet_address: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    wallet_address?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            wallets: {
                Row: {
                    id: string
                    user_id: string
                    wallet_address: string
                    label: string | null
                    is_primary: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    wallet_address: string
                    label?: string | null
                    is_primary?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    wallet_address?: string
                    label?: string | null
                    is_primary?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            tokens_registry: {
                Row: {
                    id: string
                    token_address: string
                    token_name: string | null
                    token_symbol: string | null
                    token_icon: string | null
                    decimals: number
                    price_usd: string
                    last_price_update: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    token_address: string
                    token_name?: string | null
                    token_symbol?: string | null
                    token_icon?: string | null
                    decimals?: number
                    price_usd?: string
                    last_price_update?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    token_address?: string
                    token_name?: string | null
                    token_symbol?: string | null
                    token_icon?: string | null
                    decimals?: number
                    price_usd?: string
                    last_price_update?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            wallet_tokens: {
                Row: {
                    id: string
                    wallet_id: string
                    token_id: string
                    balance: string
                    last_synced_at: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    wallet_id: string
                    token_id: string
                    balance: string
                    last_synced_at?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    wallet_id?: string
                    token_id?: string
                    balance?: string
                    last_synced_at?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            nfts: {
                Row: {
                    id: string
                    wallet_id: string
                    token_id: string
                    serial_number: string | null
                    collection_name: string | null
                    metadata: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    wallet_id: string
                    token_id: string
                    serial_number?: string | null
                    collection_name?: string | null
                    metadata?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    wallet_id?: string
                    token_id?: string
                    serial_number?: string | null
                    collection_name?: string | null
                    metadata?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
