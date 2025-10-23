// ============================================================================
// ENHANCED EVENT SERIES SERVICE
// ============================================================================
// Comprehensive service for managing event series with full functionality

import { supabase } from './supabase';
import type {
  EventSeries,
  CreateSeriesRequest,
  UpdateSeriesRequest,
  SeriesFilters,
  SeriesQueryOptions,
  SeriesServiceResponse,
  BulkSeriesResponse,
  SeriesGate,
  SeriesCategoryLimit,
  SeriesWristbandAssignment,
  SeriesTicket,
  SeriesMetricsCache,
  SeriesTemplate,
  SeriesOverview,
  SeriesWithMetrics,
  ScannableItem,
  WristbandVerification,
  AssignWristbandsToSeriesRequest,
  BulkAssignByCategoryRequest,
  BulkAssignByTicketsRequest,
  CreateRecurringSeriesRequest,
  SeriesLifecycleStatus,
} from '../types/series';

class EnhancedSeriesService {
  // ============================================================================
  // 1. SERIES CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new event series
   */
  async createSeries(request: CreateSeriesRequest): Promise<SeriesServiceResponse<EventSeries>> {
    try {
      const { data: user } = await supabase.auth.getUser();

      // Get organization_id from main event
      const { data: mainEvent, error: eventError } = await supabase
        .from('events')
        .select('organization_id')
        .eq('id', request.main_event_id)
        .single();

      if (eventError || !mainEvent) {
        return {
          data: null,
          error: new Error('Main event not found or access denied'),
        };
      }

      const insertData = {
        ...request,
        organization_id: mainEvent.organization_id,
        created_by: user.user?.id,
        lifecycle_status: 'draft' as SeriesLifecycleStatus,
      };

      const { data, error } = await supabase
        .from('event_series')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      return { data: data as EventSeries, error: null };
    } catch (error) {
      console.error('Error creating series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get series by ID
   */
  async getSeriesById(seriesId: string): Promise<SeriesServiceResponse<EventSeries>> {
    try {
      const { data, error } = await supabase
        .from('event_series')
        .select(`
          *,
          main_event:main_event_id (
            id,
            name,
            organization_id
          ),
          venue:venue_id (
            id,
            name,
            venue_type
          ),
          parent_series:parent_series_id (
            id,
            name
          )
        `)
        .eq('id', seriesId)
        .single();

      if (error) throw error;
      return { data: data as EventSeries, error: null };
    } catch (error) {
      console.error('Error fetching series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get all series for a main event
   */
  async getSeriesForEvent(
    mainEventId: string,
    filters?: Partial<SeriesFilters>,
    options?: SeriesQueryOptions
  ): Promise<SeriesServiceResponse<EventSeries[]>> {
    try {
      let query = supabase
        .from('event_series')
        .select('*')
        .eq('main_event_id', mainEventId);

      // Apply filters
      if (filters?.lifecycle_status) {
        if (Array.isArray(filters.lifecycle_status)) {
          query = query.in('lifecycle_status', filters.lifecycle_status);
        } else {
          query = query.eq('lifecycle_status', filters.lifecycle_status);
        }
      }

      if (filters?.series_type) {
        if (Array.isArray(filters.series_type)) {
          query = query.in('series_type', filters.series_type);
        } else {
          query = query.eq('series_type', filters.series_type);
        }
      }

      if (filters?.is_recurring !== undefined) {
        query = query.eq('is_recurring', filters.is_recurring);
      }

      if (filters?.start_date_from) {
        query = query.gte('start_date', filters.start_date_from);
      }

      if (filters?.start_date_to) {
        query = query.lte('start_date', filters.start_date_to);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const orderBy = options?.order_by || 'sequence_number';
      const orderDirection = options?.order_direction || 'asc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      query = query.order('start_date', { ascending: true });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as EventSeries[], error: null };
    } catch (error) {
      console.error('Error fetching series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update a series
   */
  async updateSeries(
    seriesId: string,
    updates: UpdateSeriesRequest
  ): Promise<SeriesServiceResponse<EventSeries>> {
    try {
      const { data, error } = await supabase
        .from('event_series')
        .update(updates)
        .eq('id', seriesId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as EventSeries, error: null };
    } catch (error) {
      console.error('Error updating series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a series
   */
  async deleteSeries(seriesId: string): Promise<SeriesServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('event_series')
        .delete()
        .eq('id', seriesId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Change series lifecycle status
   */
  async changeSeriesStatus(
    seriesId: string,
    newStatus: SeriesLifecycleStatus,
    reason?: string
  ): Promise<SeriesServiceResponse<EventSeries>> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('event_series')
        .update({
          lifecycle_status: newStatus,
          status_changed_at: new Date().toISOString(),
          status_changed_by: user.user?.id,
        })
        .eq('id', seriesId)
        .select()
        .single();

      if (error) throw error;

      // The trigger will automatically log the state transition
      return { data: data as EventSeries, error: null };
    } catch (error) {
      console.error('Error changing series status:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 2. SERIES GATES MANAGEMENT
  // ============================================================================

  /**
   * Assign gates to a series
   */
  async assignGatesToSeries(
    seriesId: string,
    gateIds: string[]
  ): Promise<SeriesServiceResponse<SeriesGate[]>> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const assignments = gateIds.map((gateId) => ({
        series_id: seriesId,
        gate_id: gateId,
        assigned_by: user.user?.id,
      }));

      const { data, error } = await supabase
        .from('series_gates')
        .insert(assignments)
        .select(`
          *,
          gate:gate_id (
            id,
            name,
            latitude,
            longitude,
            status
          )
        `);

      if (error) throw error;
      return { data: data as SeriesGate[], error: null };
    } catch (error) {
      console.error('Error assigning gates to series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get gates assigned to a series
   */
  async getSeriesGates(seriesId: string): Promise<SeriesServiceResponse<SeriesGate[]>> {
    try {
      const { data, error } = await supabase
        .from('series_gates')
        .select(`
          *,
          gate:gate_id (
            id,
            name,
            latitude,
            longitude,
            status,
            health_score,
            location_description
          )
        `)
        .eq('series_id', seriesId)
        .eq('is_active', true);

      if (error) throw error;
      return { data: data as SeriesGate[], error: null };
    } catch (error) {
      console.error('Error fetching series gates:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove gate from series
   */
  async removeGateFromSeries(
    seriesId: string,
    gateId: string
  ): Promise<SeriesServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('series_gates')
        .update({ is_active: false })
        .eq('series_id', seriesId)
        .eq('gate_id', gateId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error removing gate from series:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 3. SERIES CATEGORIES MANAGEMENT
  // ============================================================================

  /**
   * Set category limits for a series
   */
  async setSeriesCategoryLimits(
    seriesId: string,
    categories: Array<{
      category: string;
      max_wristbands: number;
      max_capacity?: number;
      requires_ticket?: boolean;
      price?: number;
    }>
  ): Promise<SeriesServiceResponse<SeriesCategoryLimit[]>> {
    try {
      const categoriesWithSeries = categories.map((cat) => ({
        series_id: seriesId,
        ...cat,
      }));

      const { data, error } = await supabase
        .from('series_category_limits')
        .upsert(categoriesWithSeries, {
          onConflict: 'series_id,category',
        })
        .select();

      if (error) throw error;
      return { data: data as SeriesCategoryLimit[], error: null };
    } catch (error) {
      console.error('Error setting series category limits:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get category limits for a series
   */
  async getSeriesCategoryLimits(
    seriesId: string
  ): Promise<SeriesServiceResponse<SeriesCategoryLimit[]>> {
    try {
      const { data, error } = await supabase
        .from('series_category_limits')
        .select('*')
        .eq('series_id', seriesId);

      if (error) throw error;
      return { data: data as SeriesCategoryLimit[], error: null };
    } catch (error) {
      console.error('Error fetching series category limits:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 4. WRISTBAND ASSIGNMENTS
  // ============================================================================

  /**
   * Assign wristbands to a series
   */
  async assignWristbandsToSeries(
    request: AssignWristbandsToSeriesRequest
  ): Promise<SeriesServiceResponse<SeriesWristbandAssignment[]>> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const assignments = request.wristband_ids.map((wristbandId) => ({
        series_id: request.series_id,
        wristband_id: wristbandId,
        assigned_by: user.user?.id,
      }));

      const { data, error } = await supabase
        .from('series_wristband_assignments')
        .insert(assignments)
        .select(`
          *,
          wristband:wristband_id (
            id,
            nfc_id,
            category,
            is_active,
            attendee_name,
            attendee_email
          )
        `);

      if (error) throw error;
      return { data: data as SeriesWristbandAssignment[], error: null };
    } catch (error) {
      console.error('Error assigning wristbands to series:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Bulk assign wristbands by category
   */
  async bulkAssignByCategory(
    request: BulkAssignByCategoryRequest
  ): Promise<SeriesServiceResponse<SeriesWristbandAssignment[]>> {
    try {
      // Get wristbands matching the categories
      const { data: wristbands, error: fetchError } = await supabase
        .from('wristbands')
        .select('id')
        .eq('event_id', request.event_id)
        .in('category', request.categories)
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      if (!wristbands || wristbands.length === 0) {
        return {
          data: [],
          error: null,
          message: 'No wristbands found matching criteria',
        };
      }

      const wristbandIds = wristbands.map((w) => w.id);
      return await this.assignWristbandsToSeries({
        series_id: request.series_id,
        wristband_ids: wristbandIds,
      });
    } catch (error) {
      console.error('Error bulk assigning by category:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Bulk assign wristbands by ticket numbers
   */
  async bulkAssignByTickets(
    request: BulkAssignByTicketsRequest
  ): Promise<SeriesServiceResponse<SeriesWristbandAssignment[]>> {
    try {
      // Get tickets matching the numbers
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('linked_wristband_id')
        .eq('event_id', request.event_id)
        .in('ticket_number', request.ticket_numbers)
        .not('linked_wristband_id', 'is', null);

      if (ticketsError) throw ticketsError;
      if (!tickets || tickets.length === 0) {
        return {
          data: [],
          error: null,
          message: 'No linked wristbands found for specified tickets',
        };
      }

      const wristbandIds = tickets
        .map((t) => t.linked_wristband_id)
        .filter((id) => id !== null) as string[];

      if (wristbandIds.length === 0) {
        return { data: [], error: null, message: 'No linked wristbands found' };
      }

      return await this.assignWristbandsToSeries({
        series_id: request.series_id,
        wristband_ids: wristbandIds,
      });
    } catch (error) {
      console.error('Error bulk assigning by tickets:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get wristbands assigned to a series
   */
  async getSeriesWristbands(
    seriesId: string
  ): Promise<SeriesServiceResponse<SeriesWristbandAssignment[]>> {
    try {
      const { data, error } = await supabase
        .from('series_wristband_assignments')
        .select(`
          *,
          wristband:wristband_id (
            id,
            nfc_id,
            category,
            is_active,
            attendee_name,
            attendee_email,
            status
          )
        `)
        .eq('series_id', seriesId)
        .eq('is_active', true);

      if (error) throw error;
      return { data: data as SeriesWristbandAssignment[], error: null };
    } catch (error) {
      console.error('Error fetching series wristbands:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove wristband from series
   */
  async removeWristbandFromSeries(
    seriesId: string,
    wristbandId: string
  ): Promise<SeriesServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('series_wristband_assignments')
        .update({ is_active: false })
        .eq('series_id', seriesId)
        .eq('wristband_id', wristbandId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error removing wristband from series:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 5. RECURRING SERIES
  // ============================================================================

  /**
   * Create recurring series instances
   */
  async createRecurringInstances(
    request: CreateRecurringSeriesRequest
  ): Promise<BulkSeriesResponse> {
    try {
      const { data, error } = await supabase.rpc('create_recurring_series_instances', {
        p_parent_series_id: request.parent_series_id,
        p_occurrences: request.occurrences,
      });

      if (error) throw error;

      // Fetch the created series
      const createdIds = data.map((item: any) => item.created_series_id);
      const { data: series, error: fetchError } = await supabase
        .from('event_series')
        .select('*')
        .in('id', createdIds);

      if (fetchError) throw fetchError;

      return {
        data: series as EventSeries[],
        error: null,
        successful_count: series?.length || 0,
        failed_count: 0,
      };
    } catch (error) {
      console.error('Error creating recurring instances:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 6. ANALYTICS & METRICS
  // ============================================================================

  /**
   * Get series metrics
   */
  async getSeriesMetrics(seriesId: string): Promise<SeriesServiceResponse<SeriesMetricsCache>> {
    try {
      const { data, error } = await supabase
        .from('series_metrics_cache')
        .select('*')
        .eq('series_id', seriesId)
        .single();

      if (error) throw error;
      return { data: data as SeriesMetricsCache, error: null };
    } catch (error) {
      console.error('Error fetching series metrics:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Compute and update series metrics
   */
  async computeSeriesMetrics(seriesId: string): Promise<SeriesServiceResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('compute_series_metrics', {
        p_series_id: seriesId,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error computing series metrics:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get series overview with metrics
   */
  async getSeriesOverview(
    mainEventId?: string,
    organizationId?: string
  ): Promise<SeriesServiceResponse<SeriesOverview[]>> {
    try {
      let query = supabase.from('series_overview').select('*');

      if (mainEventId) {
        query = query.eq('main_event_id', mainEventId);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as SeriesOverview[], error: null };
    } catch (error) {
      console.error('Error fetching series overview:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get series with metrics
   */
  async getSeriesWithMetrics(seriesId: string): Promise<SeriesServiceResponse<SeriesWithMetrics>> {
    try {
      const { data, error } = await supabase
        .from('series_with_metrics')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (error) throw error;
      return { data: data as SeriesWithMetrics, error: null };
    } catch (error) {
      console.error('Error fetching series with metrics:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 7. TEMPLATES
  // ============================================================================

  /**
   * Get all series templates for an organization
   */
  async getTemplates(organizationId: string): Promise<SeriesServiceResponse<SeriesTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('series_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return { data: data as SeriesTemplate[], error: null };
    } catch (error) {
      console.error('Error fetching templates:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create series from template
   */
  async createFromTemplate(
    templateId: string,
    overrides: Partial<CreateSeriesRequest>
  ): Promise<SeriesServiceResponse<EventSeries>> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('series_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        return { data: null, error: new Error('Template not found') };
      }

      // Merge template with overrides
      const seriesData: CreateSeriesRequest = {
        main_event_id: overrides.main_event_id!,
        name: overrides.name || template.name,
        description: overrides.description || template.description,
        start_date: overrides.start_date!,
        end_date: overrides.end_date!,
        series_type: overrides.series_type || template.default_series_type,
        capacity: overrides.capacity || template.default_capacity,
        checkin_window_start_offset: template.default_checkin_window_start,
        checkin_window_end_offset: template.default_checkin_window_end,
        recurrence_pattern: template.recurrence_pattern,
        ...overrides,
      };

      // Create series
      const result = await this.createSeries(seriesData);

      if (result.data) {
        // Apply category limits from template
        if (template.categories && template.categories.length > 0) {
          await this.setSeriesCategoryLimits(
            result.data.id,
            template.categories.map((cat: any) => ({
              category: cat.name,
              max_wristbands: cat.max || 1,
              max_capacity: cat.max_capacity,
              requires_ticket: cat.requires_ticket || false,
              price: cat.price,
            }))
          );
        }

        // Update template usage count
        await supabase
          .from('series_templates')
          .update({ usage_count: template.usage_count + 1 })
          .eq('id', templateId);
      }

      return result;
    } catch (error) {
      console.error('Error creating from template:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================================================
  // 8. HELPER FUNCTIONS
  // ============================================================================

  /**
   * Check if series is within check-in window
   */
  async isWithinCheckinWindow(seriesId: string): Promise<SeriesServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase.rpc('is_series_within_checkin_window', {
        p_series_id: seriesId,
      });

      if (error) throw error;
      return { data: data as boolean, error: null };
    } catch (error) {
      console.error('Error checking check-in window:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Get scannable items (events and series)
   */
  async getScannableItems(organizationId?: string): Promise<SeriesServiceResponse<ScannableItem[]>> {
    try {
      const { data, error } = await supabase.rpc('get_scannable_items', {
        p_organization_id: organizationId || null,
      });

      if (error) throw error;
      return { data: data as ScannableItem[], error: null };
    } catch (error) {
      console.error('Error fetching scannable items:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Verify wristband access for series
   */
  async verifyWristbandAccess(
    wristbandId: string,
    seriesId: string
  ): Promise<SeriesServiceResponse<WristbandVerification>> {
    try {
      const { data, error } = await supabase.rpc('verify_wristband_access', {
        p_wristband_id: wristbandId,
        p_series_id: seriesId,
        p_event_id: null,
      });

      if (error) throw error;
      return { data: data as WristbandVerification, error: null };
    } catch (error) {
      console.error('Error verifying wristband:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get active series for event
   */
  async getActiveSeriesForEvent(eventId: string): Promise<SeriesServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase.rpc('get_active_series_for_event', {
        p_event_id: eventId,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching active series:', error);
      return { data: null, error: error as Error };
    }
  }
}

export const enhancedSeriesService = new EnhancedSeriesService();
export default enhancedSeriesService;
