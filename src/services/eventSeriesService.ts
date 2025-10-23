import { supabase } from './supabase';
import { validateSeriesEvent, validateEventDates } from '../utils/validationSchemas';
import { SeriesConfig } from '../types/portal';

export interface EventSeries {
  id: string;
  main_event_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  checkin_window_start_offset?: string; // PostgreSQL interval as string
  checkin_window_end_offset?: string;
  sequence_number?: number;
  series_type?: 'standard' | 'knockout' | 'group_stage' | 'custom';
  config?: SeriesConfig; // Series-specific configuration including ticket linking
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization_id?: string;
}

export interface ScannableItem {
  item_id: string;
  item_type: 'event' | 'series';
  item_name: string;
  main_event_name: string;
  start_date: string;
  end_date: string;
  window_start: string;
  window_end: string;
}

export interface WristbandVerification {
  valid: boolean;
  message: string;
  reason?: string;
  wristband?: {
    id: string;
    nfc_id: string;
    category: string;
  };
}

class EventSeriesService {
  /**
   * Validate and create a new event series with automatic parent event extension
   */
  async createSeriesWithValidation(series: Omit<EventSeries, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // 1. Validate the series dates according to the specification
      const dateValidation = validateEventDates(series.start_date, series.end_date, false);
      if (!dateValidation.valid) {
        return {
          data: null,
          error: new Error(dateValidation.errors.join(', '))
        };
      }

      // 2. Get the main event to validate against
      const { data: mainEvent, error: mainEventError } = await supabase
        .from('events')
        .select('id, start_date, end_date')
        .eq('id', series.main_event_id)
        .single();

      if (mainEventError || !mainEvent) {
        return {
          data: null,
          error: new Error('Main event not found or cannot be accessed')
        };
      }

      // 3. Get other series events for this main event to check for overlaps
      const { data: otherSeries, error: otherSeriesError } = await supabase
        .from('event_series')
        .select('start_date, end_date')
        .eq('main_event_id', series.main_event_id);

      if (otherSeriesError) {
        console.error('Error fetching other series:', otherSeriesError);
        // Continue anyway - we can still validate against main event
      }

      // 4. Validate the series against the main event and other series
      const seriesValidation = validateSeriesEvent(
        { start_date: series.start_date, end_date: series.end_date },
        { start_date: mainEvent.start_date, end_date: mainEvent.end_date },
        otherSeries || []
      );

      if (!seriesValidation.valid) {
        return {
          data: null,
          error: new Error(seriesValidation.errors.join(', ')),
          validationResult: seriesValidation
        };
      }

      // 5. If auto-extension is needed, update the main event
      if (seriesValidation.autoExtendMainEvent && seriesValidation.newMainEventEndDate) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ end_date: seriesValidation.newMainEventEndDate })
          .eq('id', series.main_event_id);

        if (updateError) {
          console.error('Error auto-extending main event:', updateError);
          return {
            data: null,
            error: new Error('Failed to auto-extend main event: ' + updateError.message)
          };
        }
      }

      // 6. Create the series
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('event_series')
        .insert([{
          ...series,
          created_by: user.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        validationResult: seriesValidation,
        mainEventExtended: seriesValidation.autoExtendMainEvent || false
      };
    } catch (error) {
      console.error('Error creating series with validation:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new event series (legacy method without validation)
   * @deprecated Use createSeriesWithValidation instead
   */
  async createSeries(series: Omit<EventSeries, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const insertData = {
        ...series,
        created_by: user.user?.id,
      };

      const { data, error } = await supabase
        .from('event_series')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get all series for a main event
   */
  async getSeriesForEvent(mainEventId: string) {
    try {
      const { data, error } = await supabase
        .from('event_series')
        .select('*')
        .eq('main_event_id', mainEventId)
        .order('sequence_number', { ascending: true })
        .order('start_date', { ascending: true });

      if (error) throw error;
      return { data: data as EventSeries[], error: null };
    } catch (error) {
      console.error('Error fetching series:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single series by ID
   */
  async getSeriesById(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('event_series')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (error) throw error;
      return { data: data as EventSeries, error: null };
    } catch (error) {
      console.error('Error fetching series:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing series
   */
  async updateSeries(seriesId: string, updates: Partial<EventSeries>) {
    try {
      const { data, error } = await supabase
        .from('event_series')
        .update(updates)
        .eq('id', seriesId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating series:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a series
   */
  async deleteSeries(seriesId: string) {
    try {
      const { error } = await supabase
        .from('event_series')
        .delete()
        .eq('id', seriesId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting series:', error);
      return { error };
    }
  }

  /**
   * Bulk create series from CSV data
   */
  async bulkCreateSeries(mainEventId: string, seriesData: Array<Omit<EventSeries, 'id' | 'main_event_id' | 'created_at' | 'updated_at' | 'created_by'>>) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const seriesToInsert = seriesData.map(series => ({
        ...series,
        main_event_id: mainEventId,
        created_by: user.user?.id,
      }));

      const { data, error } = await supabase
        .from('event_series')
        .insert(seriesToInsert)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error bulk creating series:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all currently scannable items (events and series within check-in window)
   */
  async getScannableItems(organizationId?: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_scannable_items', {
          p_organization_id: organizationId || null
        });

      if (error) throw error;
      return { data: data as ScannableItem[], error: null };
    } catch (error) {
      console.error('Error fetching scannable items:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if an event or series is within its check-in window
   */
  async isWithinCheckinWindow(eventId?: string, seriesId?: string) {
    try {
      const { data, error } = await supabase
        .rpc('is_within_checkin_window', {
          p_event_id: eventId || null,
          p_series_id: seriesId || null
        });

      if (error) throw error;
      return { data: data as boolean, error: null };
    } catch (error) {
      console.error('Error checking check-in window:', error);
      return { data: false, error };
    }
  }

  /**
   * Verify wristband access for an event or series
   */
  async verifyWristbandAccess(wristbandId: string, eventId?: string, seriesId?: string) {
    try {
      const { data, error } = await supabase
        .rpc('verify_wristband_access', {
          p_wristband_id: wristbandId,
          p_event_id: eventId || null,
          p_series_id: seriesId || null
        });

      if (error) throw error;
      return { data: data as WristbandVerification, error: null };
    } catch (error) {
      console.error('Error verifying wristband:', error);
      return { data: null, error };
    }
  }

  /**
   * Assign wristbands to a series
   */
  async assignWristbandsToSeries(seriesId: string, wristbandIds: string[]) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const assignments = wristbandIds.map(wristbandId => ({
        series_id: seriesId,
        wristband_id: wristbandId,
        assigned_by: user.user?.id,
      }));

      const { data, error } = await supabase
        .from('series_wristband_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error assigning wristbands to series:', error);
      return { data: null, error };
    }
  }

  /**
   * Get wristbands assigned to a series
   */
  async getSeriesWristbands(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('series_wristband_assignments')
        .select(`
          id,
          assigned_at,
          is_active,
          wristband:wristband_id (
            id,
            nfc_id,
            category,
            is_active,
            status
          )
        `)
        .eq('series_id', seriesId)
        .eq('is_active', true);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching series wristbands:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk assign wristbands by category
   */
  async bulkAssignByCategory(seriesId: string, eventId: string, categories: string[]) {
    try {
      // First, get all wristbands matching the categories for the event
      const { data: wristbands, error: fetchError } = await supabase
        .from('wristbands')
        .select('id')
        .eq('event_id', eventId)
        .in('category', categories)
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      if (!wristbands || wristbands.length === 0) {
        return { data: [], error: null, message: 'No wristbands found matching criteria' };
      }

      const wristbandIds = wristbands.map(w => w.id);
      return await this.assignWristbandsToSeries(seriesId, wristbandIds);
    } catch (error) {
      console.error('Error bulk assigning by category:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk assign wristbands by ticket numbers
   */
  async bulkAssignByTickets(seriesId: string, eventId: string, ticketNumbers: string[]) {
    try {
      // Get tickets matching the numbers
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('linked_wristband_id')
        .eq('event_id', eventId)
        .in('ticket_number', ticketNumbers)
        .not('linked_wristband_id', 'is', null);

      if (ticketsError) throw ticketsError;
      if (!tickets || tickets.length === 0) {
        return { data: [], error: null, message: 'No linked wristbands found for specified tickets' };
      }

      const wristbandIds = tickets
        .map(t => t.linked_wristband_id)
        .filter(id => id !== null) as string[];

      if (wristbandIds.length === 0) {
        return { data: [], error: null, message: 'No linked wristbands found' };
      }

      return await this.assignWristbandsToSeries(seriesId, wristbandIds);
    } catch (error) {
      console.error('Error bulk assigning by tickets:', error);
      return { data: null, error };
    }
  }

  /**
   * Get series analytics
   */
  async getSeriesAnalytics(seriesId: string) {
    try {
      const { data, error } = await supabase
        .from('series_analytics')
        .select('*')
        .eq('series_id', seriesId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching series analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get main event analytics (including all series)
   */
  async getMainEventAnalytics(mainEventId: string) {
    try {
      const { data, error } = await supabase
        .from('main_event_analytics')
        .select('*')
        .eq('event_id', mainEventId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching main event analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Parse and validate CSV data for series bulk upload
   */
  parseCsvForSeries(csvText: string): Array<Omit<EventSeries, 'id' | 'main_event_id' | 'created_at' | 'updated_at' | 'created_by'>> {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const series: Array<any> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const seriesItem: any = {};

      headers.forEach((header, index) => {
        const value = values[index];

        switch (header) {
          case 'name':
            seriesItem.name = value;
            break;
          case 'description':
            seriesItem.description = value;
            break;
          case 'start_date':
          case 'startdate':
            seriesItem.start_date = new Date(value).toISOString();
            break;
          case 'end_date':
          case 'enddate':
            seriesItem.end_date = new Date(value).toISOString();
            break;
          case 'sequence_number':
          case 'sequence':
          case 'matchday':
            seriesItem.sequence_number = parseInt(value);
            break;
          case 'series_type':
          case 'type':
            seriesItem.series_type = value || 'standard';
            break;
        }
      });

      // Validate required fields
      if (!seriesItem.name) {
        throw new Error(`Row ${i + 1}: Missing required field 'name'`);
      }
      if (!seriesItem.start_date || !seriesItem.end_date) {
        throw new Error(`Row ${i + 1}: Missing required date fields`);
      }

      series.push(seriesItem);
    }

    return series;
  }
}

export const eventSeriesService = new EventSeriesService();
export default eventSeriesService;
