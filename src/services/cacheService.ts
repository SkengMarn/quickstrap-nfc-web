import { supabase } from './supabase';
import {
  EventMetricsCache,
  GatePerformanceCache,
  CategoryAnalyticsCache
} from '../types/phase2';

// ============================================================================
// INTELLIGENT CACHING SERVICE
// ============================================================================

export const cacheService = {
  // ==========================================================================
  // EVENT METRICS CACHE
  // ==========================================================================

  /**
   * Get cached event metrics
   */
  async getEventMetrics(eventId: string): Promise<EventMetricsCache | null> {
    const { data, error } = await supabase
      .from('event_metrics_cache')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as EventMetricsCache;
  },

  /**
   * Refresh event metrics cache
   */
  async refreshEventMetrics(eventId: string): Promise<EventMetricsCache> {
    const startTime = Date.now();

    // Call database function to refresh cache
    const { error: refreshError } = await supabase.rpc('refresh_event_caches', {
      p_event_id: eventId
    });

    if (refreshError) throw refreshError;

    // Get the updated cache
    const cache = await this.getEventMetrics(eventId);
    if (!cache) throw new Error('Failed to refresh cache');

    // Update computation time
    const computationTime = Date.now() - startTime;
    const { data, error } = await supabase
      .from('event_metrics_cache')
      .update({ computation_time_ms: computationTime })
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data as EventMetricsCache;
  },

  /**
   * Get event metrics with auto-refresh if stale
   */
  async getEventMetricsWithRefresh(eventId: string, maxAgeMinutes: number = 5): Promise<EventMetricsCache> {
    const cache = await this.getEventMetrics(eventId);

    if (!cache) {
      // No cache exists, create it
      return this.refreshEventMetrics(eventId);
    }

    // Check if cache is stale
    const lastComputedAt = new Date(cache.last_computed_at);
    const ageMinutes = (Date.now() - lastComputedAt.getTime()) / 1000 / 60;

    if (ageMinutes > maxAgeMinutes) {
      // Cache is stale, refresh it
      return this.refreshEventMetrics(eventId);
    }

    return cache;
  },

  // ==========================================================================
  // GATE PERFORMANCE CACHE
  // ==========================================================================

  /**
   * Get gate performance cache
   */
  async getGatePerformance(gateId: string, eventId: string): Promise<GatePerformanceCache | null> {
    const { data, error } = await supabase
      .from('gate_performance_cache')
      .select('*')
      .eq('gate_id', gateId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as GatePerformanceCache;
  },

  /**
   * Get all gate performance for an event
   */
  async getEventGatePerformance(eventId: string): Promise<GatePerformanceCache[]> {
    const { data, error } = await supabase
      .from('gate_performance_cache')
      .select('*')
      .eq('event_id', eventId)
      .order('total_scans', { ascending: false });

    if (error) throw error;
    return data as GatePerformanceCache[];
  },

  /**
   * Refresh gate performance cache
   */
  async refreshGatePerformance(gateId: string, eventId: string): Promise<GatePerformanceCache> {
    const startTime = Date.now();

    // Compute gate metrics
    const { data: scanData } = await supabase
      .from('checkin_logs')
      .select('processing_time_ms, status, created_at')
      .eq('gate_id', gateId)
      .eq('event_id', eventId);

    const totalScans = scanData?.length || 0;
    const successfulScans = scanData?.filter(s => s.status === 'success').length || 0;
    const failedScans = totalScans - successfulScans;
    const avgScanTime = scanData && scanData.length > 0 
      ? scanData.reduce((sum, s) => sum + (s.processing_time_ms || 0), 0) / totalScans 
      : 0;

    // Find peak hour
    const scansByHour: Record<string, number> = {};
    scanData?.forEach(scan => {
      const hour = new Date(scan.created_at).getHours();
      scansByHour[hour] = (scansByHour[hour] || 0) + 1;
    });

    const peakHourEntry = Object.entries(scansByHour).sort((a, b) => b[1] - a[1])[0];
    const peakHour = peakHourEntry ? new Date().setHours(parseInt(peakHourEntry[0]), 0, 0, 0) : null;
    const peakHourScans = peakHourEntry ? peakHourEntry[1] : 0;

    // Get last scan
    const { data: lastScan } = await supabase
      .from('checkin_logs')
      .select('created_at')
      .eq('gate_id', gateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate health score
    const successRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 100;
    const healthScore = Math.min(100, successRate);

    const cacheData = {
      gate_id: gateId,
      event_id: eventId,
      total_scans: totalScans,
      successful_scans: successfulScans,
      failed_scans: failedScans,
      avg_scan_time_ms: avgScanTime,
      peak_hour: peakHour ? new Date(peakHour).toISOString() : null,
      peak_hour_scans: peakHourScans,
      scans_per_hour: totalScans / 24, // Simplified
      health_score: healthScore,
      last_scan_at: lastScan?.created_at || null,
      uptime_percentage: 100, // Simplified
      last_computed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('gate_performance_cache')
      .upsert(cacheData, { onConflict: 'gate_id,event_id' })
      .select()
      .single();

    if (error) throw error;
    return data as GatePerformanceCache;
  },

  // ==========================================================================
  // CATEGORY ANALYTICS CACHE
  // ==========================================================================

  /**
   * Get category analytics
   */
  async getCategoryAnalytics(eventId: string, category: string): Promise<CategoryAnalyticsCache | null> {
    const { data, error } = await supabase
      .from('category_analytics_cache')
      .select('*')
      .eq('event_id', eventId)
      .eq('category', category)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as CategoryAnalyticsCache;
  },

  /**
   * Get all category analytics for an event
   */
  async getEventCategoryAnalytics(eventId: string): Promise<CategoryAnalyticsCache[]> {
    const { data, error } = await supabase
      .from('category_analytics_cache')
      .select('*')
      .eq('event_id', eventId)
      .order('total_checkins', { ascending: false });

    if (error) throw error;
    return data as CategoryAnalyticsCache[];
  },

  /**
   * Refresh category analytics cache
   */
  async refreshCategoryAnalytics(eventId: string, category: string): Promise<CategoryAnalyticsCache> {
    // Get wristbands for this category
    const { data: wristbands } = await supabase
      .from('wristbands')
      .select('id')
      .eq('event_id', eventId)
      .eq('category', category);

    const totalWristbands = wristbands?.length || 0;

    // Get check-ins for this category
    const wristbandIds = wristbands?.map(w => w.id) || [];

    const { data: checkins } = await supabase
      .from('checkin_logs')
      .select('wristband_id, gate_id, created_at')
      .eq('event_id', eventId)
      .in('wristband_id', wristbandIds);

    const totalCheckins = checkins?.length || 0;
    const uniqueAttendees = new Set(checkins?.map(c => c.wristband_id)).size;
    const checkinRate = totalWristbands > 0 ? (uniqueAttendees / totalWristbands) * 100 : 0;

    // Checkins by hour
    const checkinsByHour: Record<string, number> = {};
    checkins?.forEach(checkin => {
      const hour = new Date(checkin.created_at).getHours().toString();
      checkinsByHour[hour] = (checkinsByHour[hour] || 0) + 1;
    });

    // Checkins by gate
    const checkinsByGate: Record<string, number> = {};
    checkins?.forEach(checkin => {
      if (checkin.gate_id) {
        checkinsByGate[checkin.gate_id] = (checkinsByGate[checkin.gate_id] || 0) + 1;
      }
    });

    const cacheData = {
      event_id: eventId,
      category: category,
      total_wristbands: totalWristbands,
      total_checkins: totalCheckins,
      unique_attendees: uniqueAttendees,
      checkin_rate: checkinRate,
      checkins_by_hour: checkinsByHour,
      checkins_by_gate: checkinsByGate,
      last_computed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('category_analytics_cache')
      .upsert(cacheData, { onConflict: 'event_id,category' })
      .select()
      .single();

    if (error) throw error;
    return data as CategoryAnalyticsCache;
  },

  /**
   * Refresh all caches for an event
   */
  async refreshAllEventCaches(eventId: string): Promise<void> {
    // Refresh event metrics
    await this.refreshEventMetrics(eventId);

    // Refresh gate performance for all gates
    const { data: gates } = await supabase
      .from('gates')
      .select('id')
      .eq('event_id', eventId);

    if (gates) {
      await Promise.all(
        gates.map(gate => this.refreshGatePerformance(gate.id, eventId))
      );
    }

    // Refresh category analytics for all categories
    const { data: wristbands } = await supabase
      .from('wristbands')
      .select('category')
      .eq('event_id', eventId);

    if (wristbands) {
      const uniqueCategories = [...new Set(wristbands.map(w => w.category))];
      await Promise.all(
        uniqueCategories.map(category => this.refreshCategoryAnalytics(eventId, category))
      );
    }
  },

  /**
   * Schedule cache refresh (to be called by N8N workflow)
   */
  async scheduleRefresh(eventId: string, intervalMinutes: number = 5): Promise<void> {
    // This would typically be handled by N8N workflow
    // For now, just refresh once
    await this.refreshAllEventCaches(eventId);
  },

  /**
   * Get cache freshness info
   */
  async getCacheFreshness(eventId: string): Promise<{
    eventMetrics: { age: number; isFresh: boolean };
    gatePerformance: { count: number; avgAge: number };
    categoryAnalytics: { count: number; avgAge: number };
  }> {
    const maxAgeMinutes = 5;
    const now = Date.now();

    // Event metrics
    const eventMetrics = await this.getEventMetrics(eventId);
    const eventMetricsAge = eventMetrics
      ? (now - new Date(eventMetrics.last_computed_at).getTime()) / 1000 / 60
      : 9999;

    // Gate performance
    const gatePerformance = await this.getEventGatePerformance(eventId);
    const gateAvgAge = gatePerformance.length > 0
      ? gatePerformance.reduce((sum, g) => {
          return sum + (now - new Date(g.last_computed_at).getTime()) / 1000 / 60;
        }, 0) / gatePerformance.length
      : 9999;

    // Category analytics
    const categoryAnalytics = await this.getEventCategoryAnalytics(eventId);
    const categoryAvgAge = categoryAnalytics.length > 0
      ? categoryAnalytics.reduce((sum, c) => {
          return sum + (now - new Date(c.last_computed_at).getTime()) / 1000 / 60;
        }, 0) / categoryAnalytics.length
      : 9999;

    return {
      eventMetrics: {
        age: eventMetricsAge,
        isFresh: eventMetricsAge <= maxAgeMinutes
      },
      gatePerformance: {
        count: gatePerformance.length,
        avgAge: gateAvgAge
      },
      categoryAnalytics: {
        count: categoryAnalytics.length,
        avgAge: categoryAvgAge
      }
    };
  }
};

export default cacheService;
