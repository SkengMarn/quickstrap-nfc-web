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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string | null
          current_resource_id: string | null
          current_resource_type: string | null
          current_route: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          last_activity_at: string | null
          organization_id: string | null
          session_started_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_resource_id?: string | null
          current_resource_type?: string | null
          current_route?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          organization_id?: string | null
          session_started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_resource_id?: string | null
          current_resource_type?: string | null
          current_route?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          organization_id?: string | null
          session_started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptive_thresholds: {
        Row: {
          confidence_threshold: number | null
          created_at: string | null
          duplicate_distance_meters: number | null
          event_id: string | null
          id: string
          last_optimization_at: string | null
          optimization_history: Json | null
          organization_id: string | null
          performance_improvement: number | null
          promotion_sample_size: number | null
          updated_at: string | null
          velocity_threshold_ms: number | null
        }
        Insert: {
          confidence_threshold?: number | null
          created_at?: string | null
          duplicate_distance_meters?: number | null
          event_id?: string | null
          id?: string
          last_optimization_at?: string | null
          optimization_history?: Json | null
          organization_id?: string | null
          performance_improvement?: number | null
          promotion_sample_size?: number | null
          updated_at?: string | null
          velocity_threshold_ms?: number | null
        }
        Update: {
          confidence_threshold?: number | null
          created_at?: string | null
          duplicate_distance_meters?: number | null
          event_id?: string | null
          id?: string
          last_optimization_at?: string | null
          optimization_history?: Json | null
          organization_id?: string | null
          performance_improvement?: number | null
          promotion_sample_size?: number | null
          updated_at?: string | null
          velocity_threshold_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_thresholds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptive_thresholds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "adaptive_thresholds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "adaptive_thresholds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "adaptive_thresholds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_log: {
        Row: {
          api_key_id: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          organization_id: string | null
          query_params: Json | null
          request_body: Json | null
          requested_at: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          organization_id?: string | null
          query_params?: Json | null
          request_body?: Json | null
          requested_at?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          organization_id?: string | null
          query_params?: Json | null
          request_body?: Json | null
          requested_at?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_origins: string[] | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          rate_limit_per_day: number | null
          rate_limit_per_hour: number | null
          scopes: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_origins?: string[] | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_origins?: string[] | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          scopes?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          created_at: string | null
          first_request_at: string | null
          id: string
          last_request_at: string | null
          requests_allowed: number | null
          requests_count: number | null
          window_end: string
          window_start: string
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          first_request_at?: string | null
          id?: string
          last_request_at?: string | null
          requests_allowed?: number | null
          requests_count?: number | null
          window_end: string
          window_start: string
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          first_request_at?: string | null
          id?: string
          last_request_at?: string | null
          requests_allowed?: number | null
          requests_count?: number | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          event_id: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      autonomous_events: {
        Row: {
          action: string
          automated: boolean | null
          confidence_score: number
          created_at: string | null
          event_id: string | null
          event_type: string
          id: string
          impact: string | null
          metadata: Json | null
          organization_id: string | null
          reasoning: string | null
          requires_review: boolean | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          action: string
          automated?: boolean | null
          confidence_score: number
          created_at?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          impact?: string | null
          metadata?: Json | null
          organization_id?: string | null
          reasoning?: string | null
          requires_review?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          action?: string
          automated?: boolean | null
          confidence_score?: number
          created_at?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          impact?: string | null
          metadata?: Json | null
          organization_id?: string | null
          reasoning?: string | null
          requires_review?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autonomous_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomous_gates: {
        Row: {
          accuracy_rate: number | null
          avg_response_time_ms: number | null
          confidence_history: Json | null
          confidence_score: number | null
          created_at: string | null
          decisions_count: number | null
          decisions_today: number | null
          event_id: string
          gate_id: string
          id: string
          last_decision_at: string | null
          last_decision_type: string | null
          last_optimization_at: string | null
          learning_started_at: string | null
          optimization_count: number | null
          organization_id: string | null
          status: string | null
          success_rate: number | null
          total_processed: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_rate?: number | null
          avg_response_time_ms?: number | null
          confidence_history?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          decisions_count?: number | null
          decisions_today?: number | null
          event_id: string
          gate_id: string
          id?: string
          last_decision_at?: string | null
          last_decision_type?: string | null
          last_optimization_at?: string | null
          learning_started_at?: string | null
          optimization_count?: number | null
          organization_id?: string | null
          status?: string | null
          success_rate?: number | null
          total_processed?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_rate?: number | null
          avg_response_time_ms?: number | null
          confidence_history?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          decisions_count?: number | null
          decisions_today?: number | null
          event_id?: string
          gate_id?: string
          id?: string
          last_decision_at?: string | null
          last_decision_type?: string | null
          last_optimization_at?: string | null
          learning_started_at?: string | null
          optimization_count?: number | null
          organization_id?: string | null
          status?: string | null
          success_rate?: number | null
          total_processed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autonomous_gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "autonomous_gates_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autonomous_gates_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "autonomous_gates_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "autonomous_gates_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "autonomous_gates_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "autonomous_gates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      beacons: {
        Row: {
          beacon_key: string
          created_at: string | null
          gate_id: string | null
          id: string
        }
        Insert: {
          beacon_key: string
          created_at?: string | null
          gate_id?: string | null
          id?: string
        }
        Update: {
          beacon_key?: string
          created_at?: string | null
          gate_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beacons_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beacons_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "beacons_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "beacons_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "beacons_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      category_analytics_cache: {
        Row: {
          category: string
          checkin_rate: number | null
          checkins_by_gate: Json | null
          checkins_by_hour: Json | null
          created_at: string | null
          event_id: string
          id: string
          last_computed_at: string | null
          total_checkins: number | null
          total_wristbands: number | null
          unique_attendees: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          checkin_rate?: number | null
          checkins_by_gate?: Json | null
          checkins_by_hour?: Json | null
          created_at?: string | null
          event_id: string
          id?: string
          last_computed_at?: string | null
          total_checkins?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          checkin_rate?: number | null
          checkins_by_gate?: Json | null
          checkins_by_hour?: Json | null
          created_at?: string | null
          event_id?: string
          id?: string
          last_computed_at?: string | null
          total_checkins?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_analytics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_analytics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "category_analytics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "category_analytics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      checkin_logs: {
        Row: {
          app_accuracy: number | null
          app_lat: number | null
          app_lon: number | null
          ble_seen: string[] | null
          event_id: string
          gate_id: string | null
          gps_quality_score: number | null
          id: string
          is_test_data: boolean | null
          location: string | null
          notes: string | null
          probation_tagged: boolean | null
          processing_time_ms: number | null
          scanner_id: string | null
          series_id: string | null
          staff_id: string | null
          status: string | null
          ticket_id: string | null
          timestamp: string | null
          wifi_ssids: string[] | null
          wristband_id: string
        }
        Insert: {
          app_accuracy?: number | null
          app_lat?: number | null
          app_lon?: number | null
          ble_seen?: string[] | null
          event_id: string
          gate_id?: string | null
          gps_quality_score?: number | null
          id?: string
          is_test_data?: boolean | null
          location?: string | null
          notes?: string | null
          probation_tagged?: boolean | null
          processing_time_ms?: number | null
          scanner_id?: string | null
          series_id?: string | null
          staff_id?: string | null
          status?: string | null
          ticket_id?: string | null
          timestamp?: string | null
          wifi_ssids?: string[] | null
          wristband_id: string
        }
        Update: {
          app_accuracy?: number | null
          app_lat?: number | null
          app_lon?: number | null
          ble_seen?: string[] | null
          event_id?: string
          gate_id?: string | null
          gps_quality_score?: number | null
          id?: string
          is_test_data?: boolean | null
          location?: string | null
          notes?: string | null
          probation_tagged?: boolean | null
          processing_time_ms?: number | null
          scanner_id?: string | null
          series_id?: string | null
          staff_id?: string | null
          status?: string | null
          ticket_id?: string | null
          timestamp?: string | null
          wifi_ssids?: string[] | null
          wristband_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "checkin_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "checkin_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "checkin_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "checkin_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "checkin_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "checkin_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "checkin_logs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "checkin_logs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_logs_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_activity: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string | null
          id: string
          mentions: string[] | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string
          resource_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id: string
          resource_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string
          resource_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_actions: {
        Row: {
          action_description: string | null
          action_title: string
          action_type: string
          actual_impact: string | null
          affected_gates: string[] | null
          affected_users: string[] | null
          completed_at: string | null
          created_at: string | null
          estimated_impact: string | null
          event_id: string | null
          executed_at: string | null
          executed_by: string
          id: string
          incident_id: string | null
          organization_id: string | null
          result_details: Json | null
          severity: string
          status: string | null
        }
        Insert: {
          action_description?: string | null
          action_title: string
          action_type: string
          actual_impact?: string | null
          affected_gates?: string[] | null
          affected_users?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          estimated_impact?: string | null
          event_id?: string | null
          executed_at?: string | null
          executed_by: string
          id?: string
          incident_id?: string | null
          organization_id?: string | null
          result_details?: Json | null
          severity: string
          status?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string
          action_type?: string
          actual_impact?: string | null
          affected_gates?: string[] | null
          affected_users?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          estimated_impact?: string | null
          event_id?: string | null
          executed_at?: string | null
          executed_by?: string
          id?: string
          incident_id?: string | null
          organization_id?: string | null
          result_details?: Json | null
          severity?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "emergency_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_incidents: {
        Row: {
          action_log: Json | null
          actual_affected: number | null
          assigned_to: string | null
          created_at: string | null
          description: string
          estimated_affected: number | null
          event_id: string
          evidence: Json | null
          id: string
          incident_type: string
          location: string | null
          organization_id: string | null
          reported_at: string | null
          reported_by: string | null
          reported_by_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          responders: string[] | null
          response_started_at: string | null
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_log?: Json | null
          actual_affected?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description: string
          estimated_affected?: number | null
          event_id: string
          evidence?: Json | null
          id?: string
          incident_type: string
          location?: string | null
          organization_id?: string | null
          reported_at?: string | null
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responders?: string[] | null
          response_started_at?: string | null
          severity: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_log?: Json | null
          actual_affected?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          estimated_affected?: number | null
          event_id?: string
          evidence?: Json | null
          id?: string
          incident_type?: string
          location?: string | null
          organization_id?: string | null
          reported_at?: string | null
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responders?: string[] | null
          response_started_at?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "emergency_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_status: {
        Row: {
          active_incidents: number | null
          alert_cleared_at: string | null
          alert_level: string | null
          alert_started_at: string | null
          evacuation_status: string | null
          id: string
          is_active: boolean | null
          last_updated_at: string | null
          organization_id: string | null
          status_details: Json | null
          systems_locked: boolean | null
          updated_at: string | null
        }
        Insert: {
          active_incidents?: number | null
          alert_cleared_at?: string | null
          alert_level?: string | null
          alert_started_at?: string | null
          evacuation_status?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_at?: string | null
          organization_id?: string | null
          status_details?: Json | null
          systems_locked?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active_incidents?: number | null
          alert_cleared_at?: string | null
          alert_level?: string | null
          alert_started_at?: string | null
          evacuation_status?: string | null
          id?: string
          is_active?: boolean | null
          last_updated_at?: string | null
          organization_id?: string | null
          status_details?: Json | null
          systems_locked?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_access: {
        Row: {
          access_level: string | null
          created_at: string | null
          event_id: string
          granted_by: string | null
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          event_id: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          event_id?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_category_limits: {
        Row: {
          category: string
          created_at: string | null
          event_id: string
          id: string
          max_wristbands: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          event_id: string
          id?: string
          max_wristbands?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          event_id?: string
          id?: string
          max_wristbands?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_category_limits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_category_limits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_category_limits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_category_limits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_metrics_cache: {
        Row: {
          active_gates: number | null
          avg_checkins_per_hour: number | null
          avg_gate_health: number | null
          avg_processing_time_ms: number | null
          checkin_rate: number | null
          computation_time_ms: number | null
          created_at: string | null
          critical_fraud_alerts: number | null
          event_id: string
          id: string
          last_computed_at: string | null
          peak_hour: string | null
          peak_hour_checkins: number | null
          total_checkins: number | null
          total_fraud_alerts: number | null
          total_gates: number | null
          total_processing_time_ms: number | null
          total_wristbands: number | null
          unique_attendees: number | null
          updated_at: string | null
        }
        Insert: {
          active_gates?: number | null
          avg_checkins_per_hour?: number | null
          avg_gate_health?: number | null
          avg_processing_time_ms?: number | null
          checkin_rate?: number | null
          computation_time_ms?: number | null
          created_at?: string | null
          critical_fraud_alerts?: number | null
          event_id: string
          id?: string
          last_computed_at?: string | null
          peak_hour?: string | null
          peak_hour_checkins?: number | null
          total_checkins?: number | null
          total_fraud_alerts?: number | null
          total_gates?: number | null
          total_processing_time_ms?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Update: {
          active_gates?: number | null
          avg_checkins_per_hour?: number | null
          avg_gate_health?: number | null
          avg_processing_time_ms?: number | null
          checkin_rate?: number | null
          computation_time_ms?: number | null
          created_at?: string | null
          critical_fraud_alerts?: number | null
          event_id?: string
          id?: string
          last_computed_at?: string | null
          peak_hour?: string | null
          peak_hour_checkins?: number | null
          total_checkins?: number | null
          total_fraud_alerts?: number | null
          total_gates?: number | null
          total_processing_time_ms?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_metrics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_metrics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_metrics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_metrics_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_series: {
        Row: {
          auto_transition_enabled: boolean | null
          capacity: number | null
          checkin_window_end_offset: unknown
          checkin_window_start_offset: unknown
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_public: boolean | null
          is_recurring: boolean | null
          lifecycle_status: string | null
          location: string | null
          main_event_id: string
          name: string
          organization_id: string
          parent_series_id: string | null
          recurrence_pattern: Json | null
          requires_separate_ticket: boolean | null
          sequence_number: number | null
          series_type: string | null
          start_date: string
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          auto_transition_enabled?: boolean | null
          capacity?: number | null
          checkin_window_end_offset?: unknown
          checkin_window_start_offset?: unknown
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          lifecycle_status?: string | null
          location?: string | null
          main_event_id: string
          name: string
          organization_id: string
          parent_series_id?: string | null
          recurrence_pattern?: Json | null
          requires_separate_ticket?: boolean | null
          sequence_number?: number | null
          series_type?: string | null
          start_date: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          auto_transition_enabled?: boolean | null
          capacity?: number | null
          checkin_window_end_offset?: unknown
          checkin_window_start_offset?: unknown
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          lifecycle_status?: string | null
          location?: string | null
          main_event_id?: string
          name?: string
          organization_id?: string
          parent_series_id?: string | null
          recurrence_pattern?: Json | null
          requires_separate_ticket?: boolean | null
          sequence_number?: number | null
          series_type?: string | null
          start_date?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      event_state_transitions: {
        Row: {
          automated: boolean | null
          changed_by: string | null
          created_at: string | null
          event_id: string
          from_status: Database["public"]["Enums"]["lifecycle_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["lifecycle_status"]
        }
        Insert: {
          automated?: boolean | null
          changed_by?: string | null
          created_at?: string | null
          event_id: string
          from_status?: Database["public"]["Enums"]["lifecycle_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["lifecycle_status"]
        }
        Update: {
          automated?: boolean | null
          changed_by?: string | null
          created_at?: string | null
          event_id?: string
          from_status?: Database["public"]["Enums"]["lifecycle_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["lifecycle_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          organization_id: string
          template_data: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          organization_id: string
          template_data?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          organization_id?: string
          template_data?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_unlinked_entry: boolean | null
          auto_transition_enabled: boolean | null
          capacity: number | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          location: string | null
          name: string
          organization_id: string
          start_date: string
          status_changed_at: string | null
          status_changed_by: string | null
          ticket_linking_mode: string | null
          updated_at: string | null
        }
        Insert: {
          allow_unlinked_entry?: boolean | null
          auto_transition_enabled?: boolean | null
          capacity?: number | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          location?: string | null
          name: string
          organization_id: string
          start_date?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          ticket_linking_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_unlinked_entry?: boolean | null
          auto_transition_enabled?: boolean | null
          capacity?: number | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          location?: string | null
          name?: string
          organization_id?: string
          start_date?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          ticket_linking_mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          event_id: string | null
          expires_at: string | null
          export_type: string
          file_url: string | null
          filters: Json | null
          format: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          expires_at?: string | null
          export_type: string
          file_url?: string | null
          filters?: Json | null
          format: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          expires_at?: string | null
          export_type?: string
          file_url?: string | null
          filters?: Json | null
          format?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "export_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "export_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      fraud_cases: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          case_number: string
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string
          evidence: Json | null
          fraud_detection_id: string | null
          id: string
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_ids: string[] | null
          wristband_ids: string[] | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          case_number: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id: string
          evidence?: Json | null
          fraud_detection_id?: string | null
          id?: string
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_ids?: string[] | null
          wristband_ids?: string[] | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          case_number?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string
          evidence?: Json | null
          fraud_detection_id?: string | null
          id?: string
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_ids?: string[] | null
          wristband_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_cases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_cases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_cases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_cases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_cases_fraud_detection_id_fkey"
            columns: ["fraud_detection_id"]
            isOneToOne: false
            referencedRelation: "fraud_detections"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_detections: {
        Row: {
          created_at: string | null
          details: Json | null
          detection_type: string
          event_id: string
          id: string
          investigated_at: string | null
          investigated_by: string | null
          series_id: string | null
          severity: string
          wristband_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          detection_type: string
          event_id: string
          id?: string
          investigated_at?: string | null
          investigated_by?: string | null
          series_id?: string | null
          severity: string
          wristband_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          detection_type?: string
          event_id?: string
          id?: string
          investigated_at?: string | null
          investigated_by?: string | null
          series_id?: string | null
          severity?: string
          wristband_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_detections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_detections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_detections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_detections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_detections_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_detections_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_detections_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "fraud_detections_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_detections_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          alert_severity: string | null
          auto_alert: boolean | null
          auto_block: boolean | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          risk_score: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          alert_severity?: string | null
          auto_alert?: boolean | null
          auto_block?: boolean | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          risk_score?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          alert_severity?: string | null
          auto_alert?: boolean | null
          auto_block?: boolean | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          risk_score?: number | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fraud_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_bindings: {
        Row: {
          bound_at: string | null
          category: string
          confidence: number | null
          created_at: string | null
          event_id: string | null
          gate_id: string
          id: string | null
          last_violation_at: string | null
          sample_count: number | null
          status: string
          updated_at: string | null
          violation_count: number | null
        }
        Insert: {
          bound_at?: string | null
          category: string
          confidence?: number | null
          created_at?: string | null
          event_id?: string | null
          gate_id: string
          id?: string | null
          last_violation_at?: string | null
          sample_count?: number | null
          status: string
          updated_at?: string | null
          violation_count?: number | null
        }
        Update: {
          bound_at?: string | null
          category?: string
          confidence?: number | null
          created_at?: string | null
          event_id?: string | null
          gate_id?: string
          id?: string | null
          last_violation_at?: string | null
          sample_count?: number | null
          status?: string
          updated_at?: string | null
          violation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_bindings_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_bindings_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_bindings_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_bindings_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_bindings_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gate_geofences: {
        Row: {
          gate_id: string
          geojson: Json | null
        }
        Insert: {
          gate_id: string
          geojson?: Json | null
        }
        Update: {
          gate_id?: string
          geojson?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_geofences_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_geofences_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_geofences_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_geofences_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_geofences_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: true
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gate_merge_suggestions: {
        Row: {
          confidence_score: number
          created_at: string | null
          distance_meters: number | null
          event_id: string
          id: string
          primary_gate_id: string
          reasoning: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_gate_id: string
          status: string | null
          suggested_at: string | null
          traffic_similarity: number | null
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          distance_meters?: number | null
          event_id: string
          id?: string
          primary_gate_id: string
          reasoning: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_gate_id: string
          status?: string | null
          suggested_at?: string | null
          traffic_similarity?: number | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          distance_meters?: number | null
          event_id?: string
          id?: string
          primary_gate_id?: string
          reasoning?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_gate_id?: string
          status?: string | null
          suggested_at?: string | null
          traffic_similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_merge_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_primary_gate_id_fkey"
            columns: ["primary_gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_primary_gate_id_fkey"
            columns: ["primary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_primary_gate_id_fkey"
            columns: ["primary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_primary_gate_id_fkey"
            columns: ["primary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_primary_gate_id_fkey"
            columns: ["primary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_secondary_gate_id_fkey"
            columns: ["secondary_gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_secondary_gate_id_fkey"
            columns: ["secondary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_secondary_gate_id_fkey"
            columns: ["secondary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_secondary_gate_id_fkey"
            columns: ["secondary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merge_suggestions_secondary_gate_id_fkey"
            columns: ["secondary_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gate_merges: {
        Row: {
          event_id: string
          id: string
          merged_at: string | null
          merged_by: string
          reason: string | null
          source_gate_id: string
          target_gate_id: string
        }
        Insert: {
          event_id: string
          id?: string
          merged_at?: string | null
          merged_by: string
          reason?: string | null
          source_gate_id: string
          target_gate_id: string
        }
        Update: {
          event_id?: string
          id?: string
          merged_at?: string | null
          merged_by?: string
          reason?: string | null
          source_gate_id?: string
          target_gate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_merges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_merges_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merges_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_source_gate_id_fkey"
            columns: ["source_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_target_gate_id_fkey"
            columns: ["target_gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_merges_target_gate_id_fkey"
            columns: ["target_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_target_gate_id_fkey"
            columns: ["target_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_target_gate_id_fkey"
            columns: ["target_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_merges_target_gate_id_fkey"
            columns: ["target_gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gate_performance_cache: {
        Row: {
          category_breakdown: Json | null
          event_id: string
          failed_scans: number | null
          gate_id: string
          last_computed_at: string | null
          last_scan_at: string | null
          successful_scans: number | null
          total_scans: number | null
        }
        Insert: {
          category_breakdown?: Json | null
          event_id: string
          failed_scans?: number | null
          gate_id: string
          last_computed_at?: string | null
          last_scan_at?: string | null
          successful_scans?: number | null
          total_scans?: number | null
        }
        Update: {
          category_breakdown?: Json | null
          event_id?: string
          failed_scans?: number | null
          gate_id?: string
          last_computed_at?: string | null
          last_scan_at?: string | null
          successful_scans?: number | null
          total_scans?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_performance_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_performance_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_performance_cache_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_performance_cache_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gate_wifi: {
        Row: {
          gate_id: string
          id: string
          ssid: string
        }
        Insert: {
          gate_id: string
          id?: string
          ssid: string
        }
        Update: {
          gate_id?: string
          id?: string
          ssid?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_wifi_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_wifi_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_wifi_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_wifi_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_wifi_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
        ]
      }
      gates: {
        Row: {
          created_at: string | null
          derivation_confidence: number | null
          derivation_method: string | null
          event_id: string
          health_score: number | null
          id: string
          latitude: number | null
          location_description: string | null
          longitude: number | null
          metadata: Json | null
          name: string
          series_id: string | null
          spatial_variance: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          derivation_confidence?: number | null
          derivation_method?: string | null
          event_id: string
          health_score?: number | null
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          series_id?: string | null
          spatial_variance?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          derivation_confidence?: number | null
          derivation_method?: string | null
          event_id?: string
          health_score?: number | null
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          series_id?: string | null
          spatial_variance?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_models: {
        Row: {
          accuracy: number | null
          algorithm: string | null
          created_at: string | null
          created_by: string | null
          f1_score: number | null
          hyperparameters: Json | null
          id: string
          mean_absolute_error: number | null
          model_size_bytes: number | null
          model_storage_path: string | null
          model_type: string
          name: string
          organization_id: string | null
          precision_score: number | null
          recall_score: number | null
          status: string | null
          training_completed_at: string | null
          training_dataset_size: number | null
          training_duration_seconds: number | null
          training_started_at: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          accuracy?: number | null
          algorithm?: string | null
          created_at?: string | null
          created_by?: string | null
          f1_score?: number | null
          hyperparameters?: Json | null
          id?: string
          mean_absolute_error?: number | null
          model_size_bytes?: number | null
          model_storage_path?: string | null
          model_type: string
          name: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          training_completed_at?: string | null
          training_dataset_size?: number | null
          training_duration_seconds?: number | null
          training_started_at?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          accuracy?: number | null
          algorithm?: string | null
          created_at?: string | null
          created_by?: string | null
          f1_score?: number | null
          hyperparameters?: Json | null
          id?: string
          mean_absolute_error?: number | null
          model_size_bytes?: number | null
          model_storage_path?: string | null
          model_type?: string
          name?: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          training_completed_at?: string | null
          training_dataset_size?: number | null
          training_duration_seconds?: number | null
          training_started_at?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["org_role"]
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          allowed_ip_ranges: string[] | null
          auto_archive_enabled: boolean | null
          created_at: string | null
          data_retention_days: number | null
          features: Json | null
          id: string
          notifications: Json | null
          organization_id: string
          require_2fa: boolean | null
          session_timeout_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_ip_ranges?: string[] | null
          auto_archive_enabled?: boolean | null
          created_at?: string | null
          data_retention_days?: number | null
          features?: Json | null
          id?: string
          notifications?: Json | null
          organization_id: string
          require_2fa?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_ip_ranges?: string[] | null
          auto_archive_enabled?: boolean | null
          created_at?: string | null
          data_retention_days?: number | null
          features?: Json | null
          id?: string
          notifications?: Json | null
          organization_id?: string
          require_2fa?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_domain: string | null
          description: string | null
          id: string
          logo_url: string | null
          max_events: number | null
          max_team_members: number | null
          max_wristbands: number | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          subscription_tier: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          max_events?: number | null
          max_team_members?: number | null
          max_wristbands?: number | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          max_events?: number | null
          max_team_members?: number | null
          max_wristbands?: number | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          accuracy: number | null
          actual_outcome: Json | null
          confidence_score: number | null
          created_at: string | null
          event_id: string | null
          id: string
          model_id: string
          prediction_data: Json
          prediction_for: string | null
          prediction_type: string
          valid_until: string | null
        }
        Insert: {
          accuracy?: number | null
          actual_outcome?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          model_id: string
          prediction_data: Json
          prediction_for?: string | null
          prediction_type: string
          valid_until?: string | null
        }
        Update: {
          accuracy?: number | null
          actual_outcome?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          model_id?: string
          prediction_data?: Json
          prediction_for?: string | null
          prediction_type?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_insights: {
        Row: {
          actual_outcome: Json | null
          confidence_score: number
          created_at: string | null
          event_id: string | null
          id: string
          impact_level: string
          insight_type: string
          is_active: boolean | null
          is_resolved: boolean | null
          message: string
          organization_id: string | null
          predicted_time: string | null
          resolved_at: string | null
          suggested_actions: Json | null
          valid_until: string | null
          was_accurate: boolean | null
        }
        Insert: {
          actual_outcome?: Json | null
          confidence_score: number
          created_at?: string | null
          event_id?: string | null
          id?: string
          impact_level: string
          insight_type: string
          is_active?: boolean | null
          is_resolved?: boolean | null
          message: string
          organization_id?: string | null
          predicted_time?: string | null
          resolved_at?: string | null
          suggested_actions?: Json | null
          valid_until?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          actual_outcome?: Json | null
          confidence_score?: number
          created_at?: string | null
          event_id?: string | null
          id?: string
          impact_level?: string
          insight_type?: string
          is_active?: boolean | null
          is_resolved?: boolean | null
          message?: string
          organization_id?: string | null
          predicted_time?: string | null
          resolved_at?: string | null
          suggested_actions?: Json | null
          valid_until?: string | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictive_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictive_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "predictive_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_creation_log: {
        Row: {
          created_at: string | null
          email: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_sign_in: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_sign_in?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_sign_in?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_locks: {
        Row: {
          acquired_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          lock_reason: string | null
          locked_by_session_id: string | null
          locked_by_user_id: string
          metadata: Json | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_by_session_id?: string | null
          locked_by_user_id: string
          metadata?: Json | null
          resource_id: string
          resource_type: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_by_session_id?: string | null
          locked_by_user_id?: string
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_locks_locked_by_session_id_fkey"
            columns: ["locked_by_session_id"]
            isOneToOne: false
            referencedRelation: "active_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          recipients: string[]
          schedule: string
          template_id: string
          template_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients: string[]
          schedule: string
          template_id: string
          template_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          schedule?: string
          template_id?: string
          template_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      series_category_limits: {
        Row: {
          category: string
          created_at: string | null
          current_count: number | null
          id: string
          max_capacity: number | null
          max_wristbands: number | null
          price: number | null
          requires_ticket: boolean | null
          series_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          max_capacity?: number | null
          max_wristbands?: number | null
          price?: number | null
          requires_ticket?: boolean | null
          series_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          max_capacity?: number | null
          max_wristbands?: number | null
          price?: number | null
          requires_ticket?: boolean | null
          series_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_category_limits_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_category_limits_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_category_limits_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_category_limits_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      series_gates: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          gate_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          series_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          gate_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          series_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          gate_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_gates_gate_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_gates_gate_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "series_gates_gate_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_attention"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "series_gates_gate_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_complete"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "series_gates_gate_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "v_gates_enforcing"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "series_gates_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_gates_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_gates_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_gates_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      series_metrics_cache: {
        Row: {
          active_gates: number | null
          avg_checkins_per_hour: number | null
          checkin_rate: number | null
          computation_time_ms: number | null
          created_at: string | null
          id: string
          last_computed_at: string | null
          peak_hour: string | null
          peak_hour_checkins: number | null
          series_id: string
          total_checkins: number | null
          total_gates: number | null
          total_wristbands: number | null
          unique_attendees: number | null
          updated_at: string | null
        }
        Insert: {
          active_gates?: number | null
          avg_checkins_per_hour?: number | null
          checkin_rate?: number | null
          computation_time_ms?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          peak_hour?: string | null
          peak_hour_checkins?: number | null
          series_id: string
          total_checkins?: number | null
          total_gates?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Update: {
          active_gates?: number | null
          avg_checkins_per_hour?: number | null
          checkin_rate?: number | null
          computation_time_ms?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          peak_hour?: string | null
          peak_hour_checkins?: number | null
          series_id?: string
          total_checkins?: number | null
          total_gates?: number | null
          total_wristbands?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_metrics_cache_series_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_metrics_cache_series_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_metrics_cache_series_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_metrics_cache_series_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      series_state_transitions: {
        Row: {
          automated: boolean | null
          changed_by: string | null
          created_at: string | null
          from_status: string | null
          id: string
          reason: string | null
          series_id: string
          to_status: string
        }
        Insert: {
          automated?: boolean | null
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          series_id: string
          to_status: string
        }
        Update: {
          automated?: boolean | null
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          series_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_state_transitions_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_state_transitions_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_state_transitions_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_state_transitions_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      series_templates: {
        Row: {
          categories: Json | null
          created_at: string | null
          created_by: string | null
          default_capacity: number | null
          default_checkin_window_end: unknown
          default_checkin_window_start: unknown
          default_series_type: string | null
          description: string | null
          gate_configurations: Json | null
          id: string
          is_public: boolean | null
          name: string
          organization_id: string
          recurrence_pattern: Json | null
          template_type: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_capacity?: number | null
          default_checkin_window_end?: unknown
          default_checkin_window_start?: unknown
          default_series_type?: string | null
          description?: string | null
          gate_configurations?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          organization_id: string
          recurrence_pattern?: Json | null
          template_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_capacity?: number | null
          default_checkin_window_end?: unknown
          default_checkin_window_start?: unknown
          default_series_type?: string | null
          description?: string | null
          gate_configurations?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          organization_id?: string
          recurrence_pattern?: Json | null
          template_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "series_templates_organization_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      series_tickets: {
        Row: {
          id: string
          is_active: boolean | null
          linked_at: string | null
          linked_by: string | null
          series_id: string
          ticket_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          linked_by?: string | null
          series_id: string
          ticket_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          linked_by?: string | null
          series_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_tickets_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_tickets_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_tickets_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_tickets_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_tickets_ticket_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      series_wristband_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          checkin_count: number | null
          first_checkin_at: string | null
          id: string
          is_active: boolean | null
          last_checkin_at: string | null
          series_id: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
          wristband_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          checkin_count?: number | null
          first_checkin_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checkin_at?: string | null
          series_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
          wristband_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          checkin_count?: number | null
          first_checkin_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checkin_at?: string | null
          series_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
          wristband_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_wristband_assignments_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_wristband_assignments_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_wristband_assignments_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "series_wristband_assignments_series_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_wristband_assignments_wristband_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_broadcast: boolean | null
          message: string
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_broadcast?: boolean | null
          message: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_broadcast?: boolean | null
          message?: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      staff_performance: {
        Row: {
          avg_scan_time_ms: number | null
          break_time_minutes: number | null
          created_at: string | null
          efficiency_score: number | null
          error_count: number | null
          event_id: string
          failed_scans: number | null
          id: string
          last_scan_at: string | null
          scans_per_hour: number | null
          shift_end: string | null
          shift_start: string | null
          successful_scans: number | null
          total_scans: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_scan_time_ms?: number | null
          break_time_minutes?: number | null
          created_at?: string | null
          efficiency_score?: number | null
          error_count?: number | null
          event_id: string
          failed_scans?: number | null
          id?: string
          last_scan_at?: string | null
          scans_per_hour?: number | null
          shift_end?: string | null
          shift_start?: string | null
          successful_scans?: number | null
          total_scans?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_scan_time_ms?: number | null
          break_time_minutes?: number | null
          created_at?: string | null
          efficiency_score?: number | null
          error_count?: number | null
          event_id?: string
          failed_scans?: number | null
          id?: string
          last_scan_at?: string | null
          scans_per_hour?: number | null
          shift_end?: string | null
          shift_start?: string | null
          successful_scans?: number | null
          total_scans?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_performance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          data: Json | null
          event_id: string
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          data?: Json | null
          event_id: string
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          data?: Json | null
          event_id?: string
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "system_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "system_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          auto_healing_rate: number | null
          health_details: Json | null
          id: string
          intervention_required: number | null
          issues_auto_resolved: number | null
          last_auto_cleanup_at: string | null
          next_maintenance_cycle_at: string | null
          organization_id: string | null
          recorded_at: string | null
          self_recovery_count: number | null
          uptime_percentage: number | null
        }
        Insert: {
          auto_healing_rate?: number | null
          health_details?: Json | null
          id?: string
          intervention_required?: number | null
          issues_auto_resolved?: number | null
          last_auto_cleanup_at?: string | null
          next_maintenance_cycle_at?: string | null
          organization_id?: string | null
          recorded_at?: string | null
          self_recovery_count?: number | null
          uptime_percentage?: number | null
        }
        Update: {
          auto_healing_rate?: number | null
          health_details?: Json | null
          id?: string
          intervention_required?: number | null
          issues_auto_resolved?: number | null
          last_auto_cleanup_at?: string | null
          next_maintenance_cycle_at?: string | null
          organization_id?: string | null
          recorded_at?: string | null
          self_recovery_count?: number | null
          uptime_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_auth_sessions: {
        Row: {
          created_at: string | null
          email: string
          session_expiry: string
          user_id: number
        }
        Insert: {
          created_at?: string | null
          email: string
          session_expiry: string
          user_id: number
        }
        Update: {
          created_at?: string | null
          email?: string
          session_expiry?: string
          user_id?: number
        }
        Relationships: []
      }
      telegram_login_sessions: {
        Row: {
          attempts: number | null
          email: string | null
          step: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          attempts?: number | null
          email?: string | null
          step: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          attempts?: number | null
          email?: string | null
          step?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: []
      }
      telegram_menu_state: {
        Row: {
          context: Json | null
          current_menu: string
          previous_menu: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          context?: Json | null
          current_menu: string
          previous_menu?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          context?: Json | null
          current_menu?: string
          previous_menu?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          max_capacity: number | null
          name: string
          sort_order: number | null
          template_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_capacity?: number | null
          name: string
          sort_order?: number | null
          template_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_capacity?: number | null
          name?: string
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_gates: {
        Row: {
          category_bindings: Json | null
          created_at: string | null
          gate_type: string | null
          id: string
          location_description: string | null
          name: string
          sort_order: number | null
          template_id: string
        }
        Insert: {
          category_bindings?: Json | null
          created_at?: string | null
          gate_type?: string | null
          id?: string
          location_description?: string | null
          name: string
          sort_order?: number | null
          template_id: string
        }
        Update: {
          category_bindings?: Json | null
          created_at?: string | null
          gate_type?: string | null
          id?: string
          location_description?: string | null
          name?: string
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_gates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_link_audit: {
        Row: {
          action: string
          event_id: string
          id: string
          metadata: Json | null
          performed_by: string
          reason: string | null
          ticket_id: string | null
          timestamp: string | null
          wristband_id: string
        }
        Insert: {
          action: string
          event_id: string
          id?: string
          metadata?: Json | null
          performed_by: string
          reason?: string | null
          ticket_id?: string | null
          timestamp?: string | null
          wristband_id: string
        }
        Update: {
          action?: string
          event_id?: string
          id?: string
          metadata?: Json | null
          performed_by?: string
          reason?: string | null
          ticket_id?: string | null
          timestamp?: string | null
          wristband_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_link_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_link_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_link_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_link_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_link_audit_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_link_audit_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_uploads: {
        Row: {
          event_id: string
          failed_imports: number | null
          filename: string
          id: string
          metadata: Json | null
          successful_imports: number | null
          total_tickets: number
          upload_timestamp: string | null
          uploaded_by: string
        }
        Insert: {
          event_id: string
          failed_imports?: number | null
          filename: string
          id?: string
          metadata?: Json | null
          successful_imports?: number | null
          total_tickets: number
          upload_timestamp?: string | null
          uploaded_by: string
        }
        Update: {
          event_id?: string
          failed_imports?: number | null
          filename?: string
          id?: string
          metadata?: Json | null
          successful_imports?: number | null
          total_tickets?: number
          upload_timestamp?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      ticket_wristband_links: {
        Row: {
          id: string
          linked_at: string | null
          linked_by: string | null
          metadata: Json | null
          ticket_id: string
          wristband_id: string
        }
        Insert: {
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          metadata?: Json | null
          ticket_id: string
          wristband_id: string
        }
        Update: {
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          metadata?: Json | null
          ticket_id?: string
          wristband_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_wristband_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_wristband_links_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: true
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          event_id: string
          holder_email: string | null
          holder_name: string | null
          holder_phone: string | null
          id: string
          linked_at: string | null
          linked_by: string | null
          linked_wristband_id: string | null
          status: string
          ticket_category: string
          ticket_number: string
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          holder_email?: string | null
          holder_name?: string | null
          holder_phone?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          linked_wristband_id?: string | null
          status?: string
          ticket_category: string
          ticket_number: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          holder_email?: string | null
          holder_name?: string | null
          holder_phone?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          linked_wristband_id?: string | null
          status?: string
          ticket_category?: string
          ticket_number?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tickets_linked_wristband_id_fkey"
            columns: ["linked_wristband_id"]
            isOneToOne: true
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      training_data: {
        Row: {
          created_at: string | null
          data_type: string
          features: Json
          id: string
          is_validated: boolean | null
          label: Json | null
          organization_id: string | null
          quality_score: number | null
          source_event_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          features: Json
          id?: string
          is_validated?: boolean | null
          label?: Json | null
          organization_id?: string | null
          quality_score?: number | null
          source_event_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          features?: Json
          id?: string
          is_validated?: boolean | null
          label?: Json | null
          organization_id?: string | null
          quality_score?: number | null
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_data_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_data_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "training_data_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "training_data_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string | null
          default_radius_m: number | null
          gps_threshold_accuracy_m: number | null
          id: string
          name: string
          venue_type: string
        }
        Insert: {
          created_at?: string | null
          default_radius_m?: number | null
          gps_threshold_accuracy_m?: number | null
          id?: string
          name: string
          venue_type: string
        }
        Update: {
          created_at?: string | null
          default_radius_m?: number | null
          gps_threshold_accuracy_m?: number | null
          id?: string
          name?: string
          venue_type?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_by: string | null
          auto_block: boolean | null
          auto_flag: boolean | null
          created_at: string | null
          entity_type: string
          entity_value: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string | null
          reason: string
          related_case_ids: string[] | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          auto_block?: boolean | null
          auto_flag?: boolean | null
          created_at?: string | null
          entity_type: string
          entity_value: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          reason: string
          related_case_ids?: string[] | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          auto_block?: boolean | null
          auto_flag?: boolean | null
          created_at?: string | null
          entity_type?: string
          entity_value?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          reason?: string
          related_case_ids?: string[] | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wristband_blocks: {
        Row: {
          blocked_at: string | null
          blocked_by: string
          event_id: string
          id: string
          reason: string
          unblocked_at: string | null
          unblocked_by: string | null
          wristband_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by: string
          event_id: string
          id?: string
          reason: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          wristband_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string
          event_id?: string
          id?: string
          reason?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          wristband_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wristband_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wristband_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristband_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristband_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristband_blocks_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      wristbands: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          category: string
          created_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          linked_at: string | null
          linked_ticket_id: string | null
          nfc_id: string
          series_id: string | null
          status: string | null
          ticket_link_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          category: string
          created_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          linked_ticket_id?: string | null
          nfc_id: string
          series_id?: string | null
          status?: string | null
          ticket_link_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          category?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          linked_ticket_id?: string | null
          nfc_id?: string
          series_id?: string | null
          status?: string | null
          ticket_link_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wristbands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wristbands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristbands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristbands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "wristbands_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wristbands_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wristbands_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wristbands_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "wristbands_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      series_overview: {
        Row: {
          assigned_gates: number | null
          assigned_wristbands: number | null
          capacity: number | null
          category_count: number | null
          description: string | null
          end_date: string | null
          id: string | null
          is_recurring: boolean | null
          is_within_window: boolean | null
          lifecycle_status: string | null
          location: string | null
          main_event_id: string | null
          main_event_name: string | null
          name: string | null
          organization_id: string | null
          series_type: string | null
          start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      series_ticket_linking_summary: {
        Row: {
          allows_unlinked_entry: boolean | null
          effective_ticket_mode: string | null
          event_name: string | null
          event_ticket_mode: string | null
          inherits_from_event: boolean | null
          lifecycle_status: string | null
          main_event_id: string | null
          series_config_mode: string | null
          series_id: string | null
          series_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      series_with_metrics: {
        Row: {
          active_gates: number | null
          auto_transition_enabled: boolean | null
          capacity: number | null
          checkin_rate: number | null
          checkin_window_end_offset: unknown
          checkin_window_start_offset: unknown
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string | null
          is_public: boolean | null
          is_recurring: boolean | null
          last_computed_at: string | null
          lifecycle_status: string | null
          location: string | null
          main_event_id: string | null
          name: string | null
          organization_id: string | null
          parent_series_id: string | null
          peak_hour: string | null
          peak_hour_checkins: number | null
          recurrence_pattern: Json | null
          requires_separate_ticket: boolean | null
          sequence_number: number | null
          series_type: string | null
          start_date: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          total_checkins: number | null
          total_gates: number | null
          total_wristbands: number | null
          unique_attendees: number | null
          updated_at: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "event_series_parent_series_fkey"
            columns: ["parent_series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_learning_progress_fixed: {
        Row: {
          avg_confidence: number | null
          enforced_bindings: number | null
          event_id: string | null
          event_name: string | null
          gates_active: number | null
          gates_learning: number | null
          gates_optimizing: number | null
          last_learning_cycle: string | null
          probation_bindings: number | null
          total_active_gates: number | null
          total_processed_scans: number | null
        }
        Relationships: []
      }
      v_gate_enforcement_status_fixed: {
        Row: {
          accuracy_rate: number | null
          autonomous_status: string | null
          categories: Json | null
          confidence_score: number | null
          decisions_count: number | null
          event_id: string | null
          event_name: string | null
          gate_created_at: string | null
          gate_id: string | null
          gate_name: string | null
          gate_status: string | null
          health_score: number | null
          last_decision_at: string | null
          latitude: number | null
          learning_started_at: string | null
          location_description: string | null
          longitude: number | null
          series_id: string | null
          total_scans: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_ticket_linking_summary"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "gates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gates_attention: {
        Row: {
          category_bindings: Json | null
          category_breakdown: Json | null
          created_at: string | null
          derivation_method: string | null
          discovery_confidence: number | null
          discovery_metadata: Json | null
          enforcement_confidence: number | null
          enforcement_decisions: number | null
          enforcement_status: string | null
          event_id: string | null
          event_name: string | null
          failed_scans: number | null
          gate_id: string | null
          gate_name: string | null
          gate_status: string | null
          health_score: number | null
          last_learning_at: string | null
          last_scan_at: string | null
          latitude: number | null
          learning_samples: number | null
          longitude: number | null
          overall_status: string | null
          spatial_variance: number | null
          successful_scans: number | null
          system_info: Json | null
          total_scans: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_gates_complete: {
        Row: {
          category_bindings: Json | null
          category_breakdown: Json | null
          created_at: string | null
          derivation_method: string | null
          discovery_confidence: number | null
          discovery_metadata: Json | null
          enforcement_confidence: number | null
          enforcement_decisions: number | null
          enforcement_status: string | null
          event_id: string | null
          event_name: string | null
          failed_scans: number | null
          gate_id: string | null
          gate_name: string | null
          gate_status: string | null
          health_score: number | null
          last_learning_at: string | null
          last_scan_at: string | null
          latitude: number | null
          learning_samples: number | null
          longitude: number | null
          overall_status: string | null
          spatial_variance: number | null
          successful_scans: number | null
          system_info: Json | null
          total_scans: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_gates_enforcing: {
        Row: {
          category_bindings: Json | null
          category_breakdown: Json | null
          created_at: string | null
          derivation_method: string | null
          discovery_confidence: number | null
          discovery_metadata: Json | null
          enforcement_confidence: number | null
          enforcement_decisions: number | null
          enforcement_status: string | null
          event_id: string | null
          event_name: string | null
          failed_scans: number | null
          gate_id: string | null
          gate_name: string | null
          gate_status: string | null
          health_score: number | null
          last_learning_at: string | null
          last_scan_at: string | null
          latitude: number | null
          learning_samples: number | null
          longitude: number | null
          overall_status: string | null
          spatial_variance: number | null
          successful_scans: number | null
          system_info: Json | null
          total_scans: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_learning_progress_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_gate_enforcement_status_fixed"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "gates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_system_health_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_system_health_dashboard: {
        Row: {
          avg_gate_health: number | null
          enforced_bindings: number | null
          event_id: string | null
          event_name: string | null
          failed_checkins: number | null
          gates_enforcing: number | null
          gates_learning: number | null
          gates_with_learning: number | null
          last_cache_update: string | null
          last_checkin: string | null
          last_learning_cycle: string | null
          lifecycle_status:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          probation_bindings: number | null
          recommendation: string | null
          successful_checkins: number | null
          system_status: string | null
          total_bindings: number | null
          total_checkins: number | null
          total_gates: number | null
          v2_discovered_gates: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_event_activation: { Args: { event_id: string }; Returns: boolean }
      compute_series_metrics: { Args: { p_series_id: string }; Returns: Json }
      create_recurring_series_instances: {
        Args: { p_occurrences?: number; p_parent_series_id: string }
        Returns: {
          created_series_id: string
        }[]
      }
      discover_physical_gates: {
        Args: { p_event_id: string }
        Returns: {
          avg_accuracy: number
          category_distribution: Json
          checkin_count: number
          cluster_id: string
          confidence_score: number
          derivation_method: string
          dominant_category: string
          first_seen: string
          gate_name: string
          last_seen: string
          latitude: number
          longitude: number
          metadata: Json
        }[]
      }
      get_active_series_for_event: {
        Args: { p_event_id: string }
        Returns: {
          end_date: string
          is_within_window: boolean
          series_id: string
          series_name: string
          start_date: string
        }[]
      }
      get_events_with_activation: {
        Args: never
        Returns: {
          allow_unlinked_entry: boolean
          capacity: number
          config: Json
          created_at: string
          created_by: string
          description: string
          end_date: string
          id: string
          is_active: boolean
          is_public: boolean
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          location: string
          name: string
          organization_id: string
          start_date: string
          ticket_linking_mode: string
          updated_at: string
        }[]
      }
      get_profile_creation_errors: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          email: string
          error_message: string
          user_id: string
        }[]
      }
      get_series_ticket_linking_mode: {
        Args: { p_series_id: string }
        Returns: string
      }
      get_threshold_with_default: {
        Args: {
          p_default_value: number
          p_event_id: string
          p_threshold_name: string
        }
        Returns: number
      }
      grant_admin_role: { Args: { user_email: string }; Returns: boolean }
      haversine_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_series_within_checkin_window: {
        Args: { p_series_id: string }
        Returns: boolean
      }
      learn_and_enforce_gates_fixed: {
        Args: {
          p_cluster_epsilon_meters?: number
          p_event_id: string
          p_hard_threshold?: number
          p_learning_window_hours?: number
          p_min_effective_samples?: number
          p_min_samples?: number
          p_soft_threshold?: number
        }
        Returns: {
          action: string
          category: string
          confidence: number
          gate_id: string
          sample_count: number
        }[]
      }
      refresh_all_performance_caches: { Args: never; Returns: undefined }
      refresh_event_activations: {
        Args: never
        Returns: {
          active_events: number
          newly_activated: number
          total_checked: number
        }[]
      }
      refresh_event_analytics: { Args: never; Returns: undefined }
      refresh_event_metrics_cache: { Args: never; Returns: undefined }
      refresh_recent_checkins_cache: { Args: never; Returns: undefined }
      revoke_admin_role: { Args: { user_email: string }; Returns: boolean }
      series_allows_unlinked_entry: {
        Args: { p_series_id: string }
        Returns: boolean
      }
      validate_wristband_for_series: {
        Args: { p_series_id: string; p_wristband_id: string }
        Returns: Json
      }
    }
    Enums: {
      lifecycle_status:
        | "draft"
        | "scheduled"
        | "active"
        | "completed"
        | "cancelled"
      org_role: "owner" | "admin" | "manager" | "member"
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
      lifecycle_status: [
        "draft",
        "scheduled",
        "active",
        "completed",
        "cancelled",
      ],
      org_role: ["owner", "admin", "manager", "member"],
    },
  },
} as const
