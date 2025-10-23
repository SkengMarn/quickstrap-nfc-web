/**
 * Event Validation Service
 * Implements comprehensive validation rules for events and series
 *
 * VALIDATION RULES:
 *
 * Main Event Validations:
 * - start_date and end_date are mandatory
 * - Valid date format (ISO standard YYYY-MM-DD HH:mm)
 * - End date can be before or after start date (flexible)
 * - Start date cannot be in the past
 *
 * Series Event Validations:
 * - All main event validations apply to series
 * - Series must fall within or adjust the main event range
 * - If series starts before main event → REJECT
 * - If series ends after main event → AUTO-EXTEND main event
 * - Series events cannot overlap in time
 */

import { validateEventDates, validateSeriesEvent, SeriesValidationResult } from '../utils/validationSchemas';
import { supabase } from './supabase';

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SeriesEventValidationResult extends EventValidationResult {
  autoExtendMainEvent?: boolean;
  newMainEventEndDate?: string;
  mainEventUpdated?: boolean;
}

class EventValidationService {
  /**
   * Validate a main event's dates
   */
  validateMainEvent(
    startDate: string,
    endDate: string,
    isEdit: boolean = false
  ): EventValidationResult {
    const result = validateEventDates(startDate, endDate, isEdit);

    return {
      valid: result.valid,
      errors: result.errors,
      warnings: []
    };
  }

  /**
   * Validate a series event against its parent event
   * This method fetches the parent event and validates the series event
   */
  async validateSeriesEventAgainstParent(
    seriesStartDate: string,
    seriesEndDate: string,
    mainEventId: string
  ): Promise<SeriesEventValidationResult> {
    try {
      // 1. Validate the series dates themselves
      const dateValidation = validateEventDates(seriesStartDate, seriesEndDate, false);
      if (!dateValidation.valid) {
        return {
          valid: false,
          errors: dateValidation.errors,
          warnings: []
        };
      }

      // 2. Get the main event
      const { data: mainEvent, error: mainEventError } = await supabase
        .from('events')
        .select('id, start_date, end_date')
        .eq('id', mainEventId)
        .single();

      if (mainEventError || !mainEvent) {
        return {
          valid: false,
          errors: ['Main event not found or cannot be accessed'],
          warnings: []
        };
      }

      // 3. Get other series for overlap checking
      const { data: otherSeries } = await supabase
        .from('event_series')
        .select('start_date, end_date')
        .eq('main_event_id', mainEventId);

      // 4. Validate series against main event
      const validationResult = validateSeriesEvent(
        { start_date: seriesStartDate, end_date: seriesEndDate },
        { start_date: mainEvent.start_date, end_date: mainEvent.end_date },
        otherSeries || []
      );

      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        autoExtendMainEvent: validationResult.autoExtendMainEvent,
        newMainEventEndDate: validationResult.newMainEventEndDate
      };
    } catch (error) {
      console.error('Error validating series event:', error);
      return {
        valid: false,
        errors: ['An error occurred while validating the series event'],
        warnings: []
      };
    }
  }

  /**
   * Validate check-in window dates
   * Check-in windows should fall within the event's start/end dates
   */
  validateCheckinWindow(
    checkinStartTime: string,
    checkinEndTime: string,
    eventStartDate: string,
    eventEndDate: string
  ): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const checkinStart = new Date(checkinStartTime);
    const checkinEnd = new Date(checkinEndTime);
    const eventStart = new Date(eventStartDate);
    const eventEnd = new Date(eventEndDate);

    // Validate date formats
    if (isNaN(checkinStart.getTime())) {
      errors.push('Invalid check-in start time format');
    }
    if (isNaN(checkinEnd.getTime())) {
      errors.push('Invalid check-in end time format');
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Check-in end must be after check-in start
    if (checkinEnd <= checkinStart) {
      errors.push('Check-in window end time must be after start time');
    }

    // Check-in window should be within event dates
    if (checkinStart < eventStart) {
      warnings.push('Check-in window starts before the event start date');
    }

    if (checkinEnd > eventEnd) {
      warnings.push('Check-in window ends after the event end date');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Batch validate multiple series events for a main event
   * Useful for bulk uploads
   */
  async batchValidateSeriesEvents(
    seriesEvents: Array<{ start_date: string; end_date: string; name?: string }>,
    mainEventId: string
  ): Promise<{
    valid: boolean;
    results: Array<{ index: number; name?: string; result: SeriesEventValidationResult }>;
    overallErrors: string[];
    overallWarnings: string[];
  }> {
    const results: Array<{ index: number; name?: string; result: SeriesEventValidationResult }> = [];
    const overallErrors: string[] = [];
    const overallWarnings: string[] = [];

    // Get main event once
    const { data: mainEvent, error: mainEventError } = await supabase
      .from('events')
      .select('id, start_date, end_date')
      .eq('id', mainEventId)
      .single();

    if (mainEventError || !mainEvent) {
      return {
        valid: false,
        results: [],
        overallErrors: ['Main event not found or cannot be accessed'],
        overallWarnings: []
      };
    }

    // Get existing series for overlap checking
    const { data: existingSeries } = await supabase
      .from('event_series')
      .select('start_date, end_date')
      .eq('main_event_id', mainEventId);

    let currentMainEventEndDate = mainEvent.end_date;
    const allSeriesEvents = [...(existingSeries || [])];

    // Validate each series event
    for (let i = 0; i < seriesEvents.length; i++) {
      const series = seriesEvents[i];

      // Validate dates
      const dateValidation = validateEventDates(series.start_date, series.end_date, false);
      if (!dateValidation.valid) {
        results.push({
          index: i,
          name: series.name,
          result: {
            valid: false,
            errors: dateValidation.errors,
            warnings: []
          }
        });
        continue;
      }

      // Validate against current main event state
      const validationResult = validateSeriesEvent(
        { start_date: series.start_date, end_date: series.end_date },
        { start_date: mainEvent.start_date, end_date: currentMainEventEndDate },
        allSeriesEvents
      );

      // If this series extends the main event, update our tracking
      if (validationResult.autoExtendMainEvent && validationResult.newMainEventEndDate) {
        currentMainEventEndDate = validationResult.newMainEventEndDate;
        overallWarnings.push(
          `Series ${i + 1}${series.name ? ` (${series.name})` : ''} will extend the main event end date`
        );
      }

      // Add this series to our tracking for overlap checks
      allSeriesEvents.push({
        start_date: series.start_date,
        end_date: series.end_date
      });

      results.push({
        index: i,
        name: series.name,
        result: {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          autoExtendMainEvent: validationResult.autoExtendMainEvent,
          newMainEventEndDate: validationResult.newMainEventEndDate
        }
      });

      if (!validationResult.valid) {
        overallErrors.push(
          `Series ${i + 1}${series.name ? ` (${series.name})` : ''}: ${validationResult.errors.join(', ')}`
        );
      }
    }

    return {
      valid: overallErrors.length === 0,
      results,
      overallErrors,
      overallWarnings
    };
  }
}

export const eventValidationService = new EventValidationService();
export default eventValidationService;
