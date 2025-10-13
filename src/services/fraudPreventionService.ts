import { supabase } from './supabase';
import {
  FraudRule,
  FraudCase,
  WatchlistEntry,
  FraudRuleType,
  CreateFraudCaseRequest,
  WatchlistAddRequest,
  FraudCaseStatus
} from '../types/phase2';

// ============================================================================
// ADVANCED FRAUD PREVENTION SERVICE
// ============================================================================

export const fraudPreventionService = {
  // ==========================================================================
  // FRAUD RULES
  // ==========================================================================

  /**
   * Get all active fraud rules for an organization/event
   */
  async getActiveFraudRules(organizationId: string, eventId?: string): Promise<FraudRule[]> {
    let query = supabase
      .from('fraud_rules')
      .select('*')
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},event_id.eq.${eventId || 'null'}`);

    const { data, error } = await query;
    if (error) throw error;
    return data as FraudRule[];
  },

  /**
   * Create fraud rule
   */
  async createFraudRule(rule: Partial<FraudRule>): Promise<FraudRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('fraud_rules')
      .insert({
        ...rule,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as FraudRule;
  },

  /**
   * Update fraud rule
   */
  async updateFraudRule(ruleId: string, updates: Partial<FraudRule>): Promise<FraudRule> {
    const { data, error } = await supabase
      .from('fraud_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data as FraudRule;
  },

  /**
   * Delete fraud rule
   */
  async deleteFraudRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('fraud_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  },

  /**
   * Evaluate check-in against fraud rules
   */
  async evaluateCheckin(checkin: {
    wristband_id: string;
    event_id: string;
    gate_id: string;
    timestamp: string;
  }): Promise<{
    riskScore: number;
    triggeredRules: FraudRule[];
    shouldBlock: boolean;
    shouldAlert: boolean;
  }> {
    // Get active rules for this event
    const { data: event } = await supabase
      .from('events')
      .select('organization_id')
      .eq('id', checkin.event_id)
      .single();

    if (!event) throw new Error('Event not found');

    const rules = await this.getActiveFraudRules(event.organization_id, checkin.event_id);

    let totalRiskScore = 0;
    const triggeredRules: FraudRule[] = [];
    let shouldBlock = false;
    let shouldAlert = false;

    for (const rule of rules) {
      const triggered = await this.evaluateRule(rule, checkin);

      if (triggered) {
        triggeredRules.push(rule);
        totalRiskScore += rule.risk_score;

        if (rule.auto_block) shouldBlock = true;
        if (rule.auto_alert) shouldAlert = true;
      }
    }

    return {
      riskScore: Math.min(100, totalRiskScore),
      triggeredRules,
      shouldBlock,
      shouldAlert
    };
  },

  /**
   * Evaluate a single rule against check-in
   */
  async evaluateRule(rule: FraudRule, checkin: any): Promise<boolean> {
    switch (rule.rule_type) {
      case 'multiple_checkins':
        return this.checkMultipleCheckins(rule, checkin);

      case 'velocity_check':
        return this.checkVelocity(rule, checkin);

      case 'impossible_location':
        return this.checkImpossibleLocation(rule, checkin);

      case 'blacklist_check':
        return this.checkWatchlist(checkin.wristband_id);

      case 'time_pattern':
        return this.checkTimePattern(rule, checkin);

      default:
        return false;
    }
  },

  /**
   * Check for multiple check-ins in short time
   */
  async checkMultipleCheckins(rule: FraudRule, checkin: any): Promise<boolean> {
    const timeWindowMinutes = rule.config.time_window_minutes || 5;
    const threshold = rule.config.threshold || 2;

    const timeWindowStart = new Date(checkin.timestamp);
    timeWindowStart.setMinutes(timeWindowStart.getMinutes() - timeWindowMinutes);

    const { data: recentCheckins } = await supabase
      .from('checkin_logs')
      .select('id')
      .eq('wristband_id', checkin.wristband_id)
      .gte('created_at', timeWindowStart.toISOString());

    return (recentCheckins?.length || 0) >= threshold;
  },

  /**
   * Check for impossible velocity (too fast between locations)
   */
  async checkVelocity(rule: FraudRule, checkin: any): Promise<boolean> {
    const maxVelocityKmh = rule.config.max_velocity_kmh || 100;

    // Get previous check-in
    const { data: previousCheckin } = await supabase
      .from('checkin_logs')
      .select('gate_id, created_at')
      .eq('wristband_id', checkin.wristband_id)
      .lt('created_at', checkin.timestamp)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!previousCheckin || previousCheckin.gate_id === checkin.gate_id) {
      return false; // Same gate or no previous check-in
    }

    // Calculate time difference
    const timeDiffMs = new Date(checkin.timestamp).getTime() - new Date(previousCheckin.created_at).getTime();
    const timeDiffHours = timeDiffMs / 1000 / 60 / 60;

    // Get gate locations (simplified - would need actual coordinates)
    // For now, assume impossible if < 1 minute between different gates
    return timeDiffHours < 0.0167; // 1 minute
  },

  /**
   * Check for impossible location change
   */
  async checkImpossibleLocation(rule: FraudRule, checkin: any): Promise<boolean> {
    // Similar to velocity check but based on distance
    // Simplified implementation
    return this.checkVelocity(rule, checkin);
  },

  /**
   * Check time pattern anomalies
   */
  async checkTimePattern(rule: FraudRule, checkin: any): Promise<boolean> {
    const hour = new Date(checkin.timestamp).getHours();
    const suspiciousHours = rule.config.suspicious_hours || [0, 1, 2, 3, 4, 5]; // Late night

    return suspiciousHours.includes(hour);
  },

  // ==========================================================================
  // FRAUD CASES
  // ==========================================================================

  /**
   * Get all fraud cases for an event
   */
  async getFraudCases(eventId: string, status?: FraudCaseStatus): Promise<FraudCase[]> {
    let query = supabase
      .from('fraud_cases')
      .select(`
        *,
        assigned_user:profiles!fraud_cases_assigned_to_fkey(id, email, full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as FraudCase[];
  },

  /**
   * Get fraud case by ID
   */
  async getFraudCase(caseId: string): Promise<FraudCase> {
    const { data, error } = await supabase
      .from('fraud_cases')
      .select(`
        *,
        assigned_user:profiles!fraud_cases_assigned_to_fkey(id, email, full_name),
        resolved_by_user:profiles!fraud_cases_resolved_by_fkey(id, email, full_name)
      `)
      .eq('id', caseId)
      .single();

    if (error) throw error;
    return data as unknown as FraudCase;
  },

  /**
   * Create fraud case
   */
  async createFraudCase(request: CreateFraudCaseRequest): Promise<FraudCase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('fraud_cases')
      .insert({
        event_id: request.event_id,
        fraud_detection_id: request.fraud_detection_id || null,
        title: request.title,
        description: request.description || null,
        priority: request.priority,
        wristband_ids: request.wristband_ids || null,
        status: 'open',
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as FraudCase;
  },

  /**
   * Assign fraud case
   */
  async assignCase(caseId: string, userId: string): Promise<FraudCase> {
    const { data, error } = await supabase
      .from('fraud_cases')
      .update({
        assigned_to: userId,
        assigned_at: new Date().toISOString(),
        status: 'investigating'
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error) throw error;
    return data as FraudCase;
  },

  /**
   * Add evidence to case
   */
  async addEvidence(caseId: string, evidence: {
    type: string;
    description: string;
    data: any;
  }): Promise<FraudCase> {
    const fraudCase = await this.getFraudCase(caseId);

    const newEvidence = [
      ...fraudCase.evidence,
      {
        ...evidence,
        timestamp: new Date().toISOString()
      }
    ];

    const { data, error } = await supabase
      .from('fraud_cases')
      .update({ evidence: newEvidence })
      .eq('id', caseId)
      .select()
      .single();

    if (error) throw error;
    return data as FraudCase;
  },

  /**
   * Resolve fraud case
   */
  async resolveCase(caseId: string, resolution: {
    status: 'resolved' | 'false_positive';
    notes: string;
  }): Promise<FraudCase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('fraud_cases')
      .update({
        status: resolution.status,
        resolution_notes: resolution.notes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error) throw error;
    return data as FraudCase;
  },

  // ==========================================================================
  // WATCHLIST
  // ==========================================================================

  /**
   * Check if entity is on watchlist
   */
  async checkWatchlist(wristbandId: string): Promise<boolean> {
    // Get wristband details
    const { data: wristband } = await supabase
      .from('wristbands')
      .select('nfc_id, attendee_email, event_id')
      .eq('id', wristbandId)
      .single();

    if (!wristband) return false;

    // Get organization ID
    const { data: event } = await supabase
      .from('events')
      .select('organization_id')
      .eq('id', wristband.event_id)
      .single();

    if (!event) return false;

    // Check watchlist
    const { data: watchlistEntries } = await supabase
      .from('watchlist')
      .select('*')
      .eq('organization_id', event.organization_id)
      .eq('is_active', true)
      .or(`entity_value.eq.${wristband.nfc_id},entity_value.eq.${wristband.attendee_email}`);

    return (watchlistEntries?.length || 0) > 0;
  },

  /**
   * Get watchlist entries
   */
  async getWatchlist(organizationId: string): Promise<WatchlistEntry[]> {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as WatchlistEntry[];
  },

  /**
   * Add to watchlist
   */
  async addToWatchlist(request: WatchlistAddRequest): Promise<WatchlistEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        organization_id: request.organization_id,
        entity_type: request.entity_type,
        entity_value: request.entity_value,
        reason: request.reason,
        risk_level: request.risk_level,
        auto_block: request.auto_block || false,
        notes: request.notes || null,
        added_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as WatchlistEntry;
  },

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(watchlistId: string): Promise<void> {
    const { error } = await supabase
      .from('watchlist')
      .update({ is_active: false })
      .eq('id', watchlistId);

    if (error) throw error;
  },

  /**
   * Get fraud statistics for an event
   */
  async getFraudStatistics(eventId: string): Promise<{
    totalAlerts: number;
    criticalAlerts: number;
    openCases: number;
    resolvedCases: number;
    blockedWristbands: number;
    watchlistHits: number;
  }> {
    // Get fraud detections
    const { data: detections } = await supabase
      .from('fraud_detections')
      .select('id, severity')
      .eq('event_id', eventId);

    const totalAlerts = detections?.length || 0;
    const criticalAlerts = detections?.filter(d => d.severity === 'critical').length || 0;

    // Get fraud cases
    const { data: cases } = await supabase
      .from('fraud_cases')
      .select('status')
      .eq('event_id', eventId);

    const openCases = cases?.filter(c => ['open', 'investigating'].includes(c.status)).length || 0;
    const resolvedCases = cases?.filter(c => c.status === 'resolved').length || 0;

    // Get blocked wristbands
    const { data: blockedWristbands } = await supabase
      .from('wristband_blocks')
      .select('id')
      .eq('event_id', eventId);

    const blockedCount = blockedWristbands?.length || 0;

    return {
      totalAlerts,
      criticalAlerts,
      openCases,
      resolvedCases,
      blockedWristbands: blockedCount,
      watchlistHits: 0 // Would need to track this separately
    };
  }
};

export default fraudPreventionService;
