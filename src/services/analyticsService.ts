import { supabase } from './supabase';
import {
  EventAnalytics,
  TimeSeriesData,
  GatePerformanceComparison,
  CategoryInsights,
  ApiResponse,
} from '../types/portal';

/**
 * Analytics Service
 * Provides comprehensive post-event analysis and reporting
 */

// ============================================================================
// EVENT SUMMARY ANALYTICS
// ============================================================================

/**
 * Fetch comprehensive event analytics
 */
export const fetchEventAnalytics = async (
  eventId: string
): Promise<ApiResponse<EventAnalytics>> => {
  try {
    // Use materialized view for performance
    const { data: analytics, error } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) throw error;

    // If materialized view doesn't exist or is empty, compute on the fly
    if (!analytics) {
      return {
        success: true,
        data: await computeEventAnalytics(eventId),
      };
    }

    return {
      success: true,
      data: analytics as EventAnalytics,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ANALYTICS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
    };
  }
};

/**
 * Compute event analytics on the fly
 */
const computeEventAnalytics = async (eventId: string): Promise<EventAnalytics> => {
  // Fetch event details
  const { data: event } = await supabase
    .from('events')
    .select('name, start_date, end_date')
    .eq('id', eventId)
    .single();

  // Fetch check-in logs (excluding test data)
  const { data: checkins } = await supabase
    .from('checkin_logs')
    .select('*, wristbands(category)')
    .eq('event_id', eventId)
    .eq('is_test_data', false);

  // Fetch gates
  const { data: gates } = await supabase
    .from('gates')
    .select('id')
    .eq('event_id', eventId);

  // Fetch staff assignments (with error handling for missing table)
  let staffAssignments: any[] = [];
  try {
    const { data, error } = await supabase
      .from('event_access')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('is_active', true);
    
    if (error) {
      console.warn('event_access table not available:', error.message);
    } else {
      staffAssignments = data || [];
    }
  } catch (error) {
    console.warn('Error fetching staff assignments:', error);
  }

  const uniqueAttendees = new Set(checkins?.map((c) => c.wristband_id) || []).size;
  const totalCheckins = checkins?.length || 0;

  // Calculate average processing time
  const avgProcessingTime =
    checkins?.reduce((sum, c) => sum + (c.processing_time_ms || 0), 0) / totalCheckins || 0;

  // Calculate category distribution
  const categoryDistribution: Record<string, number> = {};
  checkins?.forEach((checkin) => {
    const category = (checkin.wristbands as any)?.category || 'unknown';
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
  });

  // Find peak attendance time
  const hourlyBreakdown: Record<string, number> = {};
  checkins?.forEach((checkin) => {
    const hour = new Date(checkin.timestamp).toISOString().substring(0, 13);
    hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourlyBreakdown).sort((a, b) => b[1] - a[1])[0];

  return {
    event_id: eventId,
    event_name: event?.name || '',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    unique_attendees: uniqueAttendees,
    total_checkins: totalCheckins,
    last_checkin: checkins?.[checkins.length - 1]?.timestamp,
    avg_processing_time: avgProcessingTime,
    gates_used: gates?.length || 0,
    staff_worked: staffAssignments?.length || 0,
    category_distribution: categoryDistribution,
    peak_attendance_time: peakHour?.[0],
    capacity_utilization: 0, // Computed separately with event capacity
  };
};

// ============================================================================
// TIME SERIES ANALYTICS
// ============================================================================

/**
 * Fetch time series check-in data
 */
export const fetchTimeSeriesData = async (
  eventId: string,
  interval: 'hour' | 'day' = 'hour'
): Promise<ApiResponse<TimeSeriesData[]>> => {
  try {
    const { data: checkins, error } = await supabase
      .from('checkin_logs')
      .select('timestamp')
      .eq('event_id', eventId)
      .eq('is_test_data', false)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Group by interval
    const timeSeries: Map<string, number> = new Map();
    let cumulative = 0;

    checkins?.forEach((checkin) => {
      const date = new Date(checkin.timestamp);
      let key: string;

      if (interval === 'hour') {
        key = date.toISOString().substring(0, 13) + ':00:00'; // Round to hour
      } else {
        key = date.toISOString().substring(0, 10) + 'T00:00:00'; // Round to day
      }

      timeSeries.set(key, (timeSeries.get(key) || 0) + 1);
    });

    // Convert to array with cumulative counts
    const result: TimeSeriesData[] = Array.from(timeSeries.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([timestamp, checkins]) => {
        cumulative += checkins;
        return {
          timestamp,
          checkins,
          cumulative_checkins: cumulative,
        };
      });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'TIME_SERIES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch time series data',
      },
    };
  }
};

// ============================================================================
// GATE PERFORMANCE ANALYTICS
// ============================================================================

/**
 * Fetch gate performance comparison
 */
export const fetchGatePerformance = async (
  eventId: string
): Promise<ApiResponse<GatePerformanceComparison[]>> => {
  try {
    const { data: gates, error: gatesError } = await supabase
      .from('gates')
      .select('id, name')
      .eq('event_id', eventId);

    if (gatesError) throw gatesError;

    const gatePerformance: GatePerformanceComparison[] = await Promise.all(
      (gates || []).map(async (gate) => {
        // Get check-ins for this gate
        const { data: checkins } = await supabase
          .from('checkin_logs')
          .select('processing_time_ms, timestamp')
          .eq('event_id', eventId)
          .eq('location', gate.name)
          .eq('is_test_data', false);

        const totalCheckins = checkins?.length || 0;
        const avgProcessingTime = totalCheckins > 0
          ? (checkins?.reduce((sum, c) => sum + (c.processing_time_ms || 0), 0) || 0) / totalCheckins
          : 0;

        // Calculate utilization (active time vs idle time)
        const eventDuration = await getEventDuration(eventId);
        const activeTime = totalCheckins * (avgProcessingTime / 1000); // Convert ms to seconds
        const utilizationPercentage = eventDuration > 0 ? (activeTime / eventDuration) * 100 : 0;

        // Calculate staff efficiency
        const { data: staffAssignments } = await supabase
          .from('staff_gate_assignments')
          .select('staff_id')
          .eq('gate_id', gate.id)
          .eq('status', 'completed');

        const staffCount = staffAssignments?.length || 1;
        const staffEfficiency = staffCount > 0 ? totalCheckins / staffCount : 0;

        // Calculate bottleneck score (higher = more bottleneck)
        const bottleneckScore = avgProcessingTime > 2000 ? Math.min(avgProcessingTime / 100, 100) : 0;

        return {
          gate_id: gate.id,
          gate_name: gate.name,
          total_checkins: totalCheckins,
          avg_processing_time_ms: avgProcessingTime,
          utilization_percentage: utilizationPercentage,
          staff_efficiency: staffEfficiency,
          bottleneck_score: bottleneckScore,
        };
      })
    );

    // Sort by total check-ins (busiest first)
    gatePerformance.sort((a, b) => b.total_checkins - a.total_checkins);

    return {
      success: true,
      data: gatePerformance,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GATE_PERFORMANCE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch gate performance',
      },
    };
  }
};

/**
 * Get event duration in seconds
 */
const getEventDuration = async (eventId: string): Promise<number> => {
  const { data: event } = await supabase
    .from('events')
    .select('start_date, end_date')
    .eq('id', eventId)
    .single();

  if (!event) return 0;

  const start = new Date(event.start_date).getTime();
  const end = new Date(event.end_date || event.start_date).getTime();
  return (end - start) / 1000; // Convert to seconds
};

// ============================================================================
// CATEGORY INSIGHTS
// ============================================================================

/**
 * Fetch category insights
 */
export const fetchCategoryInsights = async (
  eventId: string
): Promise<ApiResponse<CategoryInsights[]>> => {
  try {
    // Get all wristbands for this event with their check-in status
    const { data: wristbands, error } = await supabase
      .from('wristbands')
      .select('id, category, status, checkin_logs(timestamp, location)')
      .eq('event_id', eventId);

    if (error) throw error;

    // Group by category
    const categoryMap = new Map<string, CategoryInsights>();

    wristbands?.forEach((wristband: any) => {
      const category = wristband.category || 'Uncategorized';

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          total_wristbands: 0,
          total_checkins: 0,
          no_show_count: 0,
          no_show_rate: 0,
          avg_checkin_time: '',
          preferred_gates: [],
        });
      }

      const insight = categoryMap.get(category)!;
      insight.total_wristbands++;

      // Check if this wristband checked in
      const checkins = wristband.checkin_logs || [];
      if (checkins.length > 0) {
        insight.total_checkins += checkins.length;
      } else {
        insight.no_show_count++;
      }
    });

    // Calculate no-show rates and get preferred gates
    const insights: CategoryInsights[] = await Promise.all(
      Array.from(categoryMap.values()).map(async (insight) => {
        insight.no_show_rate =
          insight.total_wristbands > 0 ? (insight.no_show_count / insight.total_wristbands) * 100 : 0;

        // Get check-in times for this category
        const { data: checkins } = await supabase
          .from('checkin_logs')
          .select('timestamp, location')
          .eq('event_id', eventId)
          .in(
            'wristband_id',
            wristbands
              ?.filter((w: any) => w.category === insight.category)
              .map((w: any) => w.id) || []
          );

        if (checkins && checkins.length > 0) {
          // Calculate average check-in time
          const avgTimestamp =
            checkins.reduce((sum, c) => sum + new Date(c.timestamp).getTime(), 0) / checkins.length;
          insight.avg_checkin_time = new Date(avgTimestamp).toISOString();

          // Find preferred gates (most used)
          const gateCount = new Map<string, number>();
          checkins.forEach((c) => {
            gateCount.set(c.location, (gateCount.get(c.location) || 0) + 1);
          });
          insight.preferred_gates = Array.from(gateCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map((e) => e[0]);
        }

        return insight;
      })
    );

    // Sort by total wristbands
    insights.sort((a, b) => b.total_wristbands - a.total_wristbands);

    return {
      success: true,
      data: insights,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CATEGORY_INSIGHTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch category insights',
      },
    };
  }
};

// ============================================================================
// COMPARISON ANALYTICS
// ============================================================================

/**
 * Compare multiple events
 */
export const compareEvents = async (
  eventIds: string[]
): Promise<ApiResponse<EventAnalytics[]>> => {
  try {
    const comparisons = await Promise.all(
      eventIds.map(async (id) => {
        const result = await fetchEventAnalytics(id);
        return result.data;
      })
    );

    return {
      success: true,
      data: comparisons.filter((c) => c !== undefined) as EventAnalytics[],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'COMPARISON_ERROR',
        message: error instanceof Error ? error.message : 'Failed to compare events',
      },
    };
  }
};

// ============================================================================
// REFRESH ANALYTICS
// ============================================================================

/**
 * Refresh materialized view (admin only)
 */
export const refreshAnalyticsView = async (): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.rpc('refresh_event_analytics');

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to refresh analytics',
      },
    };
  }
};

// ============================================================================
// REVENUE ANALYTICS (if ticketing is integrated)
// ============================================================================

/**
 * Calculate revenue metrics (requires ticket pricing data)
 */
export const fetchRevenueMetrics = async (
  eventId: string
): Promise<
  ApiResponse<{
    total_revenue: number;
    revenue_by_category: Record<string, number>;
    average_ticket_price: number;
  }>
> => {
  try {
    // Fetch tickets with pricing information if available
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('ticket_category, status')
      .eq('event_id', eventId);

    if (error) throw error;

    // Note: This is a basic implementation. For real revenue tracking,
    // you would need a pricing table or pricing field in tickets/wristbands
    // For now, we can only track counts by category

    const revenueByCategory: Record<string, number> = {};
    let totalRevenue = 0;

    // If tickets have a price field (not in current schema), we would calculate here
    // For now, just return structure with zero values
    tickets?.forEach((ticket: any) => {
      const category = ticket.ticket_category || 'General';
      // If ticket.price existed, we would do:
      // const price = ticket.price || 0;
      // revenueByCategory[category] = (revenueByCategory[category] || 0) + price;
      // totalRevenue += price;

      // Placeholder: track category presence
      if (!revenueByCategory[category]) {
        revenueByCategory[category] = 0;
      }
    });

    const ticketCount = tickets?.length || 0;
    const avgPrice = ticketCount > 0 ? totalRevenue / ticketCount : 0;

    return {
      success: true,
      data: {
        total_revenue: totalRevenue,
        revenue_by_category: revenueByCategory,
        average_ticket_price: avgPrice,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REVENUE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch revenue metrics',
      },
    };
  }
};
