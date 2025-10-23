// Event Activation Service
// Automatically handles event activation in the frontend

import { supabase } from './supabase';

export interface ActivationResult {
  totalChecked: number;
  newlyActivated: number;
  activeEvents: number;
}

class EventActivationService {
  private lastCheck: Date | null = null;
  private checkInterval = 60000; // Check every minute

  /**
   * Refresh event activations - call this periodically or before important operations
   */
  async refreshActivations(): Promise<ActivationResult> {
    try {
      const { data, error } = await supabase
        .rpc('refresh_event_activations');

      if (error) {
        console.error('Error refreshing event activations:', error);
        throw error;
      }

      const result = data?.[0] || { total_checked: 0, newly_activated: 0, active_events: 0 };
      
      if (result.newly_activated > 0) {
        console.log(`✅ Auto-activated ${result.newly_activated} events`);
      }

      this.lastCheck = new Date();
      return {
        totalChecked: result.total_checked,
        newlyActivated: result.newly_activated,
        activeEvents: result.active_events
      };
    } catch (error) {
      console.error('Failed to refresh event activations:', error);
      throw error;
    }
  }

  /**
   * Check if a specific event should be activated
   */
  async checkEventActivation(eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_event_activation', { event_id: eventId });

      if (error) {
        console.error('Error checking event activation:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Failed to check event activation:', error);
      return false;
    }
  }

  /**
   * Get all active events (automatically activates scheduled events)
   */
  async getActiveEvents() {
    try {
      // First refresh activations
      await this.autoRefreshIfNeeded();
      
      // Then get active events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching active events:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch active events:', error);
      throw error;
    }
  }

  /**
   * Auto-refresh activations if enough time has passed
   */
  async autoRefreshIfNeeded(): Promise<void> {
    const now = new Date();
    
    if (!this.lastCheck || (now.getTime() - this.lastCheck.getTime()) > this.checkInterval) {
      try {
        await this.refreshActivations();
      } catch (error) {
        // Don't throw - this is a background operation
        console.warn('Background activation refresh failed:', error);
      }
    }
  }

  /**
   * Start automatic background checking
   */
  startAutoRefresh(): void {
    // Refresh immediately
    this.autoRefreshIfNeeded();

    // Set up interval for background refreshing
    setInterval(() => {
      this.autoRefreshIfNeeded();
    }, this.checkInterval);

    console.log('🔄 Event activation auto-refresh started');
  }

  /**
   * Enhanced event fetching with automatic activation
   */
  async getEventsWithAutoActivation() {
    try {
      // Use the database function that handles activation automatically
      const { data, error } = await supabase
        .rpc('get_events_with_activation');

      if (error) {
        console.error('Error fetching events with activation:', error);
        // Fallback to manual refresh + regular query
        await this.autoRefreshIfNeeded();
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (fallbackError) {
          throw fallbackError;
        }
        
        return fallbackData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch events with activation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const eventActivationService = new EventActivationService();

// Auto-start the service when imported
if (typeof window !== 'undefined') {
  // Only start in browser environment
  eventActivationService.startAutoRefresh();
}
