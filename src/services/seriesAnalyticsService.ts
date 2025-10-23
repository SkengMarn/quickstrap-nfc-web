import { supabase } from './supabase';

export interface SeriesAnalyticsDetailed {
  series_id: string;
  series_name: string;
  main_event_id: string;
  main_event_name: string;
  series_start: string;
  series_end: string;
  sequence_number?: number;
  series_type?: string;
  unique_checkins: number;
  total_checkins: number;
  successful_checkins: number;
  assigned_wristbands: number;
  staff_count: number;
  gates_used: number;
  first_checkin?: string;
  last_checkin?: string;
  utilization_percentage: number;
  category_breakdown?: any[];
}

export interface MainEventAnalyticsDetailed {
  event_id: string;
  event_name: string;
  event_start: string;
  event_end: string;
  total_series: number;
  active_series: number;
  completed_series: number;
  upcoming_series: number;
  total_unique_checkins: number;
  total_checkins: number;
  series_unique_checkins: number;
  series_total_checkins: number;
  direct_unique_checkins: number;
  direct_total_checkins: number;
  total_wristbands: number;
  active_wristbands: number;
  total_staff: number;
  total_gates: number;
  first_checkin?: string;
  last_checkin?: string;
  avg_checkins_per_series: number;
}

export interface SeriesComparison {
  series_id: string;
  series_name: string;
  main_event_id: string;
  sequence_number?: number;
  unique_checkins: number;
  total_checkins: number;
  assigned_wristbands: number;
  utilization_rate: number;
  total_revenue: number;
  avg_checkin_minutes_after_start?: number;
  peak_hour?: number;
  checkins_per_staff: number;
}

export interface CategoryAnalytics {
  series_id: string;
  series_name: string;
  category: string;
  assigned_wristbands: number;
  checked_in_wristbands: number;
  total_checkins: number;
  category_utilization: number;
  avg_checkins_per_wristband: number;
}

export interface HourlyAnalytics {
  series_id: string;
  series_name: string;
  hour_of_day: number;
  check_date: string;
  unique_checkins: number;
  total_checkins: number;
  percentage_of_day: number;
}

export interface RealtimeStats {
  series_id: string;
  series_name: string;
  current_checkins: number;
  capacity: number;
  utilization_percentage: number;
  active_gates: number;
  active_staff: number;
  last_checkin?: string;
  checkins_last_hour: number;
  checkins_last_15min: number;
  is_within_window: boolean;
  time_until_window_close: number;
}

class SeriesAnalyticsService {
  /**
   * Get detailed analytics for a specific series
   */
  async getSeriesAnalytics(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('series_analytics_detailed')
        .select('*')
        .eq('series_id', seriesId)
        .single();

      if (error) throw error;
      return { data: data as SeriesAnalyticsDetailed, error: null };
    } catch (error) {
      console.error('Error fetching series analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get analytics for all series in a main event
   */
  async getMainEventSeriesAnalytics(mainEventId: string) {
    try {
      const { data, error } = await supabase
        .from('series_analytics_detailed')
        .select('*')
        .eq('main_event_id', mainEventId)
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      return { data: data as SeriesAnalyticsDetailed[], error: null };
    } catch (error) {
      console.error('Error fetching main event series analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get aggregated analytics for main event
   */
  async getMainEventAnalytics(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('main_event_analytics_detailed')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) throw error;
      return { data: data as MainEventAnalyticsDetailed, error: null };
    } catch (error) {
      console.error('Error fetching main event analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get comparison data for series
   */
  async getSeriesComparison(mainEventId: string) {
    try {
      const { data, error } = await supabase
        .from('series_comparison')
        .select('*')
        .eq('main_event_id', mainEventId)
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      return { data: data as SeriesComparison[], error: null };
    } catch (error) {
      console.error('Error fetching series comparison:', error);
      return { data: null, error };
    }
  }

  /**
   * Get category analytics for a series
   */
  async getSeriesCategoryAnalytics(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('series_category_analytics')
        .select('*')
        .eq('series_id', seriesId)
        .order('assigned_wristbands', { ascending: false });

      if (error) throw error;
      return { data: data as CategoryAnalytics[], error: null };
    } catch (error) {
      console.error('Error fetching category analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get hourly analytics for a series
   */
  async getSeriesHourlyAnalytics(seriesId: string, date?: string) {
    try {
      let query = supabase
        .from('series_hourly_analytics')
        .select('*')
        .eq('series_id', seriesId);

      if (date) {
        query = query.eq('check_date', date);
      }

      query = query.order('hour_of_day', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as HourlyAnalytics[], error: null };
    } catch (error) {
      console.error('Error fetching hourly analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get series performance ranking
   */
  async getSeriesPerformanceRanking(mainEventId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_series_performance_ranking', {
          p_main_event_id: mainEventId
        });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching performance ranking:', error);
      return { data: null, error };
    }
  }

  /**
   * Get real-time series stats
   */
  async getRealtimeSeriesStats(seriesId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_realtime_series_stats', {
          p_series_id: seriesId
        });

      if (error) throw error;
      return { data: data as RealtimeStats, error: null };
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
      return { data: null, error };
    }
  }

  /**
   * Compare multiple series
   */
  async compareSeriesPerformance(seriesIds: string[]) {
    try {
      const { data, error } = await supabase
        .rpc('compare_series_performance', {
          p_series_ids: seriesIds
        });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error comparing series:', error);
      return { data: null, error };
    }
  }

  /**
   * Export series analytics to CSV
   */
  exportSeriesAnalyticsToCsv(data: SeriesAnalyticsDetailed[], filename = 'series_analytics.csv') {
    const headers = [
      'Series Name',
      'Sequence',
      'Unique Check-ins',
      'Total Check-ins',
      'Assigned Wristbands',
      'Utilization %',
      'Staff Count',
      'Gates Used',
      'First Check-in',
      'Last Check-in'
    ];

    const rows = data.map(series => [
      series.series_name,
      series.sequence_number || '',
      series.unique_checkins,
      series.total_checkins,
      series.assigned_wristbands,
      series.utilization_percentage,
      series.staff_count,
      series.gates_used,
      series.first_checkin ? new Date(series.first_checkin).toLocaleString() : '',
      series.last_checkin ? new Date(series.last_checkin).toLocaleString() : ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export comparison data to CSV
   */
  exportComparisonToCsv(data: SeriesComparison[], filename = 'series_comparison.csv') {
    const headers = [
      'Series Name',
      'Sequence',
      'Unique Check-ins',
      'Total Check-ins',
      'Assigned Wristbands',
      'Utilization Rate %',
      'Total Revenue',
      'Peak Hour',
      'Check-ins per Staff'
    ];

    const rows = data.map(series => [
      series.series_name,
      series.sequence_number || '',
      series.unique_checkins,
      series.total_checkins,
      series.assigned_wristbands,
      series.utilization_rate,
      series.total_revenue || 0,
      series.peak_hour || '',
      series.checkins_per_staff
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const seriesAnalyticsService = new SeriesAnalyticsService();
export default seriesAnalyticsService;
