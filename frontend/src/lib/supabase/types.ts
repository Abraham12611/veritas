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
      instances: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          user_id: string
          organization_id: string | null
          settings: Json | null
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          user_id: string
          organization_id?: string | null
          settings?: Json | null
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          user_id?: string
          organization_id?: string | null
          settings?: Json | null
          status?: string
        }
      }
      data_sources: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          type: string
          instance_id: string
          settings: Json | null
          status: string
          last_synced: string | null
          documents_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          type: string
          instance_id: string
          settings?: Json | null
          status?: string
          last_synced?: string | null
          documents_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          type?: string
          instance_id?: string
          settings?: Json | null
          status?: string
          last_synced?: string | null
          documents_count?: number
        }
      }
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          settings: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          settings?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          settings?: Json | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          organization_id: string | null
          role: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          organization_id?: string | null
          role?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          organization_id?: string | null
          role?: string
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