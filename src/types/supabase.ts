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
      events: {
        Row: {
          id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_public: boolean
          total_capacity: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_public?: boolean
          total_capacity?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_public?: boolean
          total_capacity?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wristbands: {
        Row: {
          id: string
          status: 'active' | 'inactive' | 'lost' | 'deactivated'
          category: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          status: 'active' | 'inactive' | 'lost' | 'deactivated'
          category?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'active' | 'inactive' | 'lost' | 'deactivated'
          category?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      checkin_logs: {
        Row: {
          id: string
          event_id: string
          wristband_id: string
          user_id: string
          timestamp: string
          status: 'completed' | 'failed' | 'pending'
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          wristband_id: string
          user_id: string
          timestamp?: string
          status?: 'completed' | 'failed' | 'pending'
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          wristband_id?: string
          user_id?: string
          timestamp?: string
          status?: 'completed' | 'failed' | 'pending'
          location?: string | null
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
