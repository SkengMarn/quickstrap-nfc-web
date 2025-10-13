import { supabase } from './supabase';
import {
  LifecycleStatus,
  EventStateTransition,
  EventWithLifecycle,
  LifecycleTransitionRequest
} from '../types/phase1';

// ============================================================================
// EVENT LIFECYCLE SERVICE
// ============================================================================

export const lifecycleService = {
  /**
   * Get valid next states for current lifecycle status
   */
  getValidNextStates(currentStatus: LifecycleStatus): LifecycleStatus[] {
    const transitions: Record<LifecycleStatus, LifecycleStatus[]> = {
      draft: ['published', 'archived'],
      published: ['pre_event', 'archived'],
      pre_event: ['live', 'published'],
      live: ['closing'],
      closing: ['closed'],
      closed: ['archived'],
      archived: []
    };

    return transitions[currentStatus] || [];
  },

  /**
   * Check if transition is valid
   */
  isValidTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
    const validNextStates = this.getValidNextStates(from);
    return validNextStates.includes(to);
  },

  /**
   * Get event with lifecycle info
   */
  async getEventWithLifecycle(eventId: string): Promise<EventWithLifecycle> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organization:organizations(*),
        state_transitions:event_state_transitions(*)
      `)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data as unknown as EventWithLifecycle;
  },

  /**
   * Transition event to new lifecycle status
   */
  async transitionEvent(request: LifecycleTransitionRequest): Promise<EventWithLifecycle> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current event
    const event = await this.getEventWithLifecycle(request.event_id);

    // Validate transition
    if (!this.isValidTransition(event.lifecycle_status, request.to_status)) {
      throw new Error(
        `Invalid transition from ${event.lifecycle_status} to ${request.to_status}`
      );
    }

    // Update event status
    const { data, error } = await supabase
      .from('events')
      .update({
        lifecycle_status: request.to_status,
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString()
      })
      .eq('id', request.event_id)
      .select()
      .single();

    if (error) throw error;

    return data as EventWithLifecycle;
  },

  /**
   * Get state transition history for an event
   */
  async getTransitionHistory(eventId: string): Promise<EventStateTransition[]> {
    const { data, error } = await supabase
      .from('event_state_transitions')
      .select(`
        *,
        changed_by_user:profiles!event_state_transitions_changed_by_fkey(id, email, full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as unknown as EventStateTransition[];
  },

  /**
   * Auto-transition events based on dates
   * This should be called by a cron job/N8N workflow
   */
  async autoTransitionEvents(): Promise<{
    toPreEvent: number;
    toLive: number;
    toClosing: number;
  }> {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get events that need transitions
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('auto_transition_enabled', true)
      .in('lifecycle_status', ['published', 'pre_event', 'live']);

    if (error) throw error;
    if (!events) return { toPreEvent: 0, toLive: 0, toClosing: 0 };

    let toPreEventCount = 0;
    let toLiveCount = 0;
    let toClosingCount = 0;

    for (const event of events) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      try {
        // Transition to pre_event (24h before start)
        if (
          event.lifecycle_status === 'published' &&
          startDate <= twentyFourHoursFromNow &&
          startDate > now
        ) {
          await this.transitionEvent({
            event_id: event.id,
            to_status: 'pre_event',
            reason: 'Automatic transition: 24 hours before event start'
          });
          toPreEventCount++;
        }

        // Transition to live (at start time)
        if (event.lifecycle_status === 'pre_event' && startDate <= now) {
          await this.transitionEvent({
            event_id: event.id,
            to_status: 'live',
            reason: 'Automatic transition: Event started'
          });
          toLiveCount++;
        }

        // Transition to closing (at end time)
        if (event.lifecycle_status === 'live' && endDate <= now) {
          await this.transitionEvent({
            event_id: event.id,
            to_status: 'closing',
            reason: 'Automatic transition: Event ended'
          });
          toClosingCount++;
        }
      } catch (error) {
        console.error(`Failed to auto-transition event ${event.id}:`, error);
      }
    }

    return {
      toPreEvent: toPreEventCount,
      toLive: toLiveCount,
      toClosing: toClosingCount
    };
  },

  /**
   * Get lifecycle status badge info
   */
  getStatusBadge(status: LifecycleStatus): {
    label: string;
    color: string;
    icon: string;
  } {
    const badges: Record<LifecycleStatus, { label: string; color: string; icon: string }> = {
      draft: {
        label: 'Draft',
        color: 'gray',
        icon: '📝'
      },
      published: {
        label: 'Published',
        color: 'blue',
        icon: '📢'
      },
      pre_event: {
        label: 'Pre-Event',
        color: 'yellow',
        icon: '⏰'
      },
      live: {
        label: 'Live',
        color: 'green',
        icon: '🟢'
      },
      closing: {
        label: 'Closing',
        color: 'orange',
        icon: '🔄'
      },
      closed: {
        label: 'Closed',
        color: 'red',
        icon: '🔒'
      },
      archived: {
        label: 'Archived',
        color: 'gray',
        icon: '📦'
      }
    };

    return badges[status];
  },

  /**
   * Get allowed operations for current lifecycle state
   */
  getAllowedOperations(status: LifecycleStatus): {
    canEdit: boolean;
    canDelete: boolean;
    canAddWristbands: boolean;
    canCheckIn: boolean;
    canViewReports: boolean;
  } {
    return {
      canEdit: ['draft', 'published', 'pre_event'].includes(status),
      canDelete: ['draft'].includes(status),
      canAddWristbands: ['draft', 'published', 'pre_event'].includes(status),
      canCheckIn: ['live'].includes(status),
      canViewReports: ['live', 'closing', 'closed', 'archived'].includes(status)
    };
  },

  /**
   * Publish draft event
   */
  async publishEvent(eventId: string): Promise<EventWithLifecycle> {
    return this.transitionEvent({
      event_id: eventId,
      to_status: 'published',
      reason: 'Event published'
    });
  },

  /**
   * Start event (manual override)
   */
  async startEvent(eventId: string): Promise<EventWithLifecycle> {
    const event = await this.getEventWithLifecycle(eventId);

    if (event.lifecycle_status === 'published') {
      // Go through pre_event first
      await this.transitionEvent({
        event_id: eventId,
        to_status: 'pre_event',
        reason: 'Manual pre-event activation'
      });
    }

    return this.transitionEvent({
      event_id: eventId,
      to_status: 'live',
      reason: 'Manual event start'
    });
  },

  /**
   * End event (manual override)
   */
  async endEvent(eventId: string): Promise<EventWithLifecycle> {
    return this.transitionEvent({
      event_id: eventId,
      to_status: 'closing',
      reason: 'Manual event end'
    });
  },

  /**
   * Close event
   */
  async closeEvent(eventId: string): Promise<EventWithLifecycle> {
    return this.transitionEvent({
      event_id: eventId,
      to_status: 'closed',
      reason: 'Event closed'
    });
  },

  /**
   * Archive event
   */
  async archiveEvent(eventId: string): Promise<EventWithLifecycle> {
    const event = await this.getEventWithLifecycle(eventId);

    // Can archive from multiple states
    if (!['published', 'closed'].includes(event.lifecycle_status)) {
      throw new Error('Event must be published or closed to archive');
    }

    return this.transitionEvent({
      event_id: eventId,
      to_status: 'archived',
      reason: 'Event archived'
    });
  }
};

export default lifecycleService;
