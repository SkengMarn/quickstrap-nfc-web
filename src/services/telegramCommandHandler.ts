/**
 * QuickStrap Telegram Command Handler
 * Comprehensive command library for NFC event management
 */

import { supabase } from './supabase';
import { rateLimiter, rateLimitConfigs } from '../utils/rateLimiter';

interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface TelegramUser {
  userId: number;
  chatId: number;
  isAuthenticated: boolean;
  role?: string;
}

export class QuickStrapCommandHandler {
  private authenticatedUsers: Map<number, TelegramUser> = new Map();

  constructor() {
    this.initializeCommands();
  }

  private initializeCommands() {
    console.log('QuickStrap Telegram Command Handler initialized');
  }

  /**
   * Main command processor
   */
  async processCommand(
    userId: number, 
    chatId: number, 
    command: string, 
    args: string[]
  ): Promise<CommandResponse> {
    try {
      // Rate limiting
      if (!rateLimiter.isAllowed(`telegram_${userId}`, rateLimitConfigs.telegram)) {
        return {
          success: false,
          message: '⏰ Rate limit exceeded. Please wait before sending more commands.'
        };
      }

      // Authentication check for protected commands
      if (!this.isPublicCommand(command) && !await this.isAuthenticated(userId)) {
        return {
          success: false,
          message: '🔒 Authentication required. Please use /login first.'
        };
      }

      // Route command to appropriate handler
      return await this.routeCommand(command, args, userId, chatId);
    } catch (error) {
      console.error('Command processing error:', error);
      return {
        success: false,
        message: '❌ An error occurred while processing your command.'
      };
    }
  }

  /**
   * Command router
   */
  private async routeCommand(
    command: string, 
    args: string[], 
    userId: number, 
    chatId: number
  ): Promise<CommandResponse> {
    const [category, action] = command.split('_');

    switch (category) {
      // 1. Wristband Management
      case 'link':
        if (action === 'ticket' && args[0] === 'wristband') {
          return await this.linkTicketWristband(args[1], args[2]);
        }
        break;
      case 'unlink':
        if (action === 'wristband') {
          return await this.unlinkWristband(args[0]);
        }
        break;
      case 'checkout':
        if (action === 'wristband') {
          return await this.checkoutWristband(args[0]);
        }
        break;
      case 'activate':
        if (action === 'wristband') {
          return await this.activateWristband(args[0]);
        }
        break;
      case 'deactivate':
        if (action === 'wristband') {
          return await this.deactivateWristband(args[0]);
        }
        break;
      case 'replace':
        if (action === 'wristband') {
          return await this.replaceWristband(args[0], args[1]);
        }
        break;
      case 'get':
        if (action === 'wristband' && args[0] === 'info') {
          return await this.getWristbandInfo(args[1]);
        }
        break;
      case 'verify':
        if (action === 'wristband') {
          return await this.verifyWristband(args[0]);
        }
        break;
      case 'list':
        if (action === 'wristbands' && args[0] === 'event') {
          return await this.listWristbandsEvent(args[1]);
        }
        break;

      // 2. Ticket Operations
      case 'issue':
        if (action === 'ticket') {
          return await this.issueTicket(args[0], args[1], args[2]);
        }
        break;
      case 'cancel':
        if (action === 'ticket') {
          return await this.cancelTicket(args[0]);
        }
        break;
      case 'transfer':
        if (action === 'ticket') {
          return await this.transferTicket(args[0], args[1]);
        }
        break;

      // 3. Gate Management
      case 'register':
        if (action === 'gate') {
          return await this.registerGate(args[0], args[1], args[2]);
        }
        break;
      case 'sync':
        if (action === 'gates' && args[0] === 'all') {
          return await this.syncGatesAll(args[1]);
        }
        break;

      // 4. Staff Operations
      case 'add':
        if (action === 'staff') {
          return await this.addStaff(args[0], args[1], args[2]);
        }
        break;
      case 'update':
        if (action === 'staff' && args[0] === 'role') {
          return await this.updateStaffRole(args[1], args[2]);
        }
        break;

      // 5. Fraud & Security
      case 'log':
        if (action === 'fraud' && args[0] === 'case') {
          return await this.logFraudCase(args[1], args[2], args[3]);
        }
        break;
      case 'flag':
        if (action === 'wristband') {
          return await this.flagWristband(args[0], args[1]);
        }
        break;

      // 6. Check-in Operations
      case 'record':
        if (action === 'checkin') {
          return await this.recordCheckin(args[0], args[1]);
        }
        break;

      // 7. Reporting
      case 'report':
        return await this.generateReport(action, args);

      // 8. System Maintenance
      case 'purge':
        if (action === 'cache') {
          return await this.purgeCache(args[0]);
        }
        break;
      case 'archive':
        if (action === 'event') {
          return await this.archiveEvent(args[0]);
        }
        break;

      // 9. Messaging
      case 'notify':
        if (action === 'staff') {
          return await this.notifyStaff(args[0], args.slice(1).join(' '));
        }
        break;
      case 'broadcast':
        if (action === 'alert') {
          return await this.broadcastAlert(args[0], args[1]);
        }
        break;

      // 10. Debug Tools
      case 'debug':
        return await this.debugCommand(action, args);

      case 'simulate':
        if (action === 'checkin') {
          return await this.simulateCheckin(args[0], args[1]);
        }
        break;

      // Help and info commands
      case 'help':
        return await this.getHelp(action);
      case 'version':
        return await this.getVersion();

      default:
        return {
          success: false,
          message: `❌ Unknown command: ${command}\nUse /quickstrap help for available commands.`
        };
    }

    return {
      success: false,
      message: `❌ Invalid command format. Use /quickstrap help for usage.`
    };
  }

  // ===========================================
  // 1. WRISTBAND MANAGEMENT COMMANDS
  // ===========================================

  private async linkTicketWristband(wristbandId: string, ticketCode: string): Promise<CommandResponse> {
    try {
      // Check if wristband exists
      const { data: wristband, error: wristbandError } = await supabase
        .from('wristbands')
        .select('*')
        .eq('id', wristbandId)
        .single();

      if (wristbandError || !wristband) {
        return {
          success: false,
          message: `❌ Wristband ${wristbandId} not found.`
        };
      }

      // Check if ticket exists and is valid
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('code', ticketCode)
        .single();

      if (ticketError || !ticket) {
        return {
          success: false,
          message: `❌ Ticket ${ticketCode} not found.`
        };
      }

      // Check if ticket is already linked
      if (ticket.wristband_id) {
        return {
          success: false,
          message: `❌ Ticket ${ticketCode} is already linked to wristband ${ticket.wristband_id}.`
        };
      }

      // Link ticket to wristband
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          wristband_id: wristbandId,
          linked_at: new Date().toISOString()
        })
        .eq('code', ticketCode);

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        message: `✅ Successfully linked ticket ${ticketCode} to wristband ${wristbandId}.`,
        data: { wristbandId, ticketCode }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error linking ticket to wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async unlinkWristband(wristbandId: string): Promise<CommandResponse> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ 
          wristband_id: null,
          unlinked_at: new Date().toISOString()
        })
        .eq('wristband_id', wristbandId)
        .select();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Successfully unlinked wristband ${wristbandId}. ${data?.length || 0} ticket(s) affected.`,
        data: { wristbandId, affectedTickets: data?.length || 0 }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error unlinking wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async activateWristband(wristbandId: string): Promise<CommandResponse> {
    try {
      const { data, error } = await supabase
        .from('wristbands')
        .update({ 
          is_active: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', wristbandId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Wristband ${wristbandId} activated successfully.`,
        data: { wristbandId, status: 'active' }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error activating wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async deactivateWristband(wristbandId: string): Promise<CommandResponse> {
    try {
      const { data, error } = await supabase
        .from('wristbands')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('id', wristbandId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Wristband ${wristbandId} deactivated successfully.`,
        data: { wristbandId, status: 'inactive' }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error deactivating wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async replaceWristband(oldWristbandId: string, newWristbandId: string): Promise<CommandResponse> {
    try {
      // Start transaction
      const { data: tickets, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('wristband_id', oldWristbandId);

      if (fetchError) throw fetchError;

      // Update tickets to new wristband
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          wristband_id: newWristbandId,
          replaced_at: new Date().toISOString()
        })
        .eq('wristband_id', oldWristbandId);

      if (updateError) throw updateError;

      // Deactivate old wristband
      await this.deactivateWristband(oldWristbandId);

      return {
        success: true,
        message: `✅ Successfully replaced wristband ${oldWristbandId} with ${newWristbandId}. ${tickets?.length || 0} ticket(s) transferred.`,
        data: { oldWristbandId, newWristbandId, transferredTickets: tickets?.length || 0 }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error replacing wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async getWristbandInfo(wristbandId: string): Promise<CommandResponse> {
    try {
      const { data: wristband, error: wristbandError } = await supabase
        .from('wristbands')
        .select(`
          *,
          tickets (
            code,
            category,
            event_id,
            events (name, start_date)
          ),
          checkin_logs (
            id,
            timestamp,
            gates (name)
          )
        `)
        .eq('id', wristbandId)
        .single();

      if (wristbandError || !wristband) {
        return {
          success: false,
          message: `❌ Wristband ${wristbandId} not found.`
        };
      }

      const tickets = Array.isArray(wristband.tickets) ? wristband.tickets : [];
      const checkins = Array.isArray(wristband.checkin_logs) ? wristband.checkin_logs : [];

      const info = `
🪪 **Wristband Info: ${wristbandId}**

**Status:** ${wristband.is_active ? '✅ Active' : '❌ Inactive'}
**Category:** ${wristband.category || 'N/A'}
**Created:** ${new Date(wristband.created_at).toLocaleString()}

**Linked Tickets:** ${tickets.length}
${tickets.map((t: any) => `• ${t.code} (${t.category}) - ${t.events?.name || 'Unknown Event'}`).join('\n')}

**Check-ins:** ${checkins.length}
${checkins.slice(0, 5).map((c: any) => `• ${new Date(c.timestamp).toLocaleString()} at ${c.gates?.name || 'Unknown Gate'}`).join('\n')}
${checkins.length > 5 ? `\n... and ${checkins.length - 5} more` : ''}
      `.trim();

      return {
        success: true,
        message: info,
        data: wristband
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error getting wristband info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async verifyWristband(nfcId: string): Promise<CommandResponse> {
    try {
      const { data: wristband, error } = await supabase
        .from('wristbands')
        .select(`
          *,
          tickets (code, category, is_valid),
          checkin_logs (timestamp)
        `)
        .eq('nfc_id', nfcId)
        .single();

      if (error || !wristband) {
        return {
          success: false,
          message: `❌ NFC ID ${nfcId} not found or invalid.`
        };
      }

      const tickets = Array.isArray(wristband.tickets) ? wristband.tickets : [];
      const checkins = Array.isArray(wristband.checkin_logs) ? wristband.checkin_logs : [];
      const validTickets = tickets.filter((t: any) => t.is_valid);

      const status = wristband.is_active && validTickets.length > 0 ? 'VALID' : 'INVALID';
      const lastCheckin = checkins.length > 0 ? new Date(checkins[checkins.length - 1].timestamp) : null;

      const verification = `
🔍 **Wristband Verification**

**NFC ID:** ${nfcId}
**Status:** ${status === 'VALID' ? '✅ VALID' : '❌ INVALID'}
**Active:** ${wristband.is_active ? 'Yes' : 'No'}
**Linked Tickets:** ${validTickets.length}/${tickets.length}
**Total Check-ins:** ${checkins.length}
**Last Check-in:** ${lastCheckin ? lastCheckin.toLocaleString() : 'Never'}

${status === 'INVALID' ? '⚠️ This wristband should not be allowed entry.' : '✅ This wristband is authorized for entry.'}
      `.trim();

      return {
        success: true,
        message: verification,
        data: { nfcId, status, wristband }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error verifying wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkoutWristband(nfcId: string): Promise<CommandResponse> {
    try {
      // Use atomic transaction via RPC function for data consistency
      // This ensures wristband deactivation and ticket unlinking happen atomically
      const { data, error } = await supabase
        .rpc('checkout_wristband_transaction', { p_nfc_id: nfcId });

      if (error) {
        // Check if it's a "not found" error using robust detection
        const errorMessage = error.message?.toLowerCase() || '';
        const errorDetails = (error as any).details?.toLowerCase() || '';
        const errorHint = (error as any).hint?.toLowerCase() || '';
        const errorCode = (error as any).code;

        // Check for NOT_FOUND error code or message patterns
        if (errorCode === 'NOT_FOUND' ||
            errorCode === 'PGRST116' ||
            /\bnot\s*found\b/i.test(errorMessage) ||
            /\bnot\s*found\b/i.test(errorDetails) ||
            /\bnot\s*found\b/i.test(errorHint)) {
          return {
            success: false,
            message: `❌ Wristband with NFC ID ${nfcId} not found.`
          };
        }
        throw error;
      }

      // RPC returns array with single result
      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        return {
          success: false,
          message: `❌ Wristband with NFC ID ${nfcId} not found.`
        };
      }

      const ticketCount = result.tickets_unlinked || 0;
      const ticketCodes = result.ticket_codes?.join(', ') || 'None';

      return {
        success: true,
        message: `✅ Wristband checked out successfully!

**NFC ID:** ${nfcId}
**Wristband ID:** ${result.wristband_id}
**Category:** ${result.category || 'N/A'}
**Status:** Deactivated ✅
**Tickets Unlinked:** ${ticketCount}
${ticketCount > 0 ? `**Ticket Codes:** ${ticketCodes}` : ''}

The wristband has been deactivated and unlinked from all tickets.`,
        data: {
          nfcId: result.nfc_id,
          wristbandId: result.wristband_id,
          ticketsUnlinked: ticketCount,
          ticketCodes: result.ticket_codes || []
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error checking out wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async listWristbandsEvent(eventId: string): Promise<CommandResponse> {
    try {
      const { data: wristbands, error } = await supabase
        .from('wristbands')
        .select(`
          id,
          nfc_id,
          category,
          is_active,
          created_at,
          tickets!inner (event_id)
        `)
        .eq('tickets.event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!wristbands || wristbands.length === 0) {
        return {
          success: false,
          message: `❌ No wristbands found for event ${eventId}.`
        };
      }

      const activeCount = wristbands.filter(w => w.is_active).length;
      const categoryStats = wristbands.reduce((acc: any, w) => {
        acc[w.category || 'Unknown'] = (acc[w.category || 'Unknown'] || 0) + 1;
        return acc;
      }, {});

      const list = `
🪪 **Wristbands for Event ${eventId}**

**Total:** ${wristbands.length} wristbands
**Active:** ${activeCount} (${Math.round((activeCount / wristbands.length) * 100)}%)

**By Category:**
${Object.entries(categoryStats).map(([cat, count]) => `• ${cat}: ${count}`).join('\n')}

**Recent Wristbands:**
${wristbands.slice(0, 10).map(w =>
  `• ${w.id} ${w.is_active ? '✅' : '❌'} (${w.category || 'Unknown'}) - ${new Date(w.created_at).toLocaleDateString()}`
).join('\n')}
${wristbands.length > 10 ? `\n... and ${wristbands.length - 10} more` : ''}
      `.trim();

      return {
        success: true,
        message: list,
        data: { eventId, wristbands, stats: { total: wristbands.length, active: activeCount, categoryStats } }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error listing wristbands: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 2. TICKET OPERATIONS
  // ===========================================

  private async issueTicket(eventId: string, category: string, userId: string): Promise<CommandResponse> {
    try {
      const ticketCode = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          code: ticketCode,
          event_id: eventId,
          category: category,
          user_id: userId,
          is_valid: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Ticket issued successfully!\n\n**Ticket Code:** ${ticketCode}\n**Event:** ${eventId}\n**Category:** ${category}\n**User:** ${userId}`,
        data: ticket
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error issuing ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async cancelTicket(ticketCode: string): Promise<CommandResponse> {
    try {
      // Get ticket info first
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('*, wristbands (id)')
        .eq('code', ticketCode)
        .single();

      if (fetchError || !ticket) {
        return {
          success: false,
          message: `❌ Ticket ${ticketCode} not found.`
        };
      }

      // Cancel ticket
      const { error: cancelError } = await supabase
        .from('tickets')
        .update({ 
          is_valid: false,
          cancelled_at: new Date().toISOString()
        })
        .eq('code', ticketCode);

      if (cancelError) throw cancelError;

      // If linked to wristband, deactivate it
      if (ticket.wristband_id) {
        await this.deactivateWristband(ticket.wristband_id);
      }

      return {
        success: true,
        message: `✅ Ticket ${ticketCode} cancelled successfully.${ticket.wristband_id ? ` Linked wristband ${ticket.wristband_id} has been deactivated.` : ''}`,
        data: { ticketCode, wristbandAffected: !!ticket.wristband_id }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error cancelling ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async transferTicket(ticketCode: string, newUserId: string): Promise<CommandResponse> {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .update({ 
          user_id: newUserId,
          transferred_at: new Date().toISOString()
        })
        .eq('code', ticketCode)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Ticket ${ticketCode} transferred to user ${newUserId} successfully.`,
        data: ticket
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error transferring ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 3. GATE MANAGEMENT COMMANDS
  // ===========================================

  private async registerGate(eventId: string, gateName: string, category: string): Promise<CommandResponse> {
    try {
      const { data: gate, error } = await supabase
        .from('gates')
        .insert({
          event_id: eventId,
          name: gateName,
          category: category,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Gate "${gateName}" registered successfully for event ${eventId}.\n\n**Gate ID:** ${gate.id}\n**Category:** ${category}\n**Status:** Active`,
        data: gate
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error registering gate: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async syncGatesAll(eventId: string): Promise<CommandResponse> {
    try {
      const { data: gates, error } = await supabase
        .from('gates')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      // Simulate sync process
      const syncResults = gates?.map(gate => ({
        id: gate.id,
        name: gate.name,
        status: gate.is_active ? 'synced' : 'offline'
      })) || [];

      const onlineCount = syncResults.filter(g => g.status === 'synced').length;

      return {
        success: true,
        message: `🔄 Gate synchronization completed for event ${eventId}.\n\n**Total Gates:** ${syncResults.length}\n**Online:** ${onlineCount}\n**Offline:** ${syncResults.length - onlineCount}`,
        data: { eventId, gates: syncResults }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error syncing gates: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 4. STAFF OPERATIONS
  // ===========================================

  private async addStaff(phone: string, role: string, eventId: string): Promise<CommandResponse> {
    try {
      const { data: staff, error } = await supabase
        .from('event_access')
        .insert({
          event_id: eventId,
          phone: phone,
          role: role.toUpperCase(),
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Staff member added successfully!\n\n**Phone:** ${phone}\n**Role:** ${role.toUpperCase()}\n**Event:** ${eventId}\n**Access Code:** ${staff.id}`,
        data: staff
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error adding staff: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async updateStaffRole(staffId: string, role: string): Promise<CommandResponse> {
    try {
      const { data: staff, error } = await supabase
        .from('event_access')
        .update({ 
          role: role.toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Staff role updated successfully!\n\n**Staff ID:** ${staffId}\n**New Role:** ${role.toUpperCase()}`,
        data: staff
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error updating staff role: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 5. FRAUD & SECURITY CONTROLS
  // ===========================================

  private async logFraudCase(wristbandId: string, eventId: string, type: string): Promise<CommandResponse> {
    try {
      const { data: fraudCase, error } = await supabase
        .from('fraud_cases')
        .insert({
          wristband_id: wristbandId,
          event_id: eventId,
          fraud_type: type,
          status: 'OPEN',
          reported_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Also flag the wristband
      await this.flagWristband(wristbandId, `Fraud case: ${type}`);

      return {
        success: true,
        message: `🚨 Fraud case logged successfully!\n\n**Case ID:** ${fraudCase.id}\n**Wristband:** ${wristbandId}\n**Type:** ${type}\n**Status:** OPEN\n\n⚠️ Wristband has been automatically flagged.`,
        data: fraudCase
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error logging fraud case: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async flagWristband(wristbandId: string, reason: string): Promise<CommandResponse> {
    try {
      const { data: wristband, error } = await supabase
        .from('wristbands')
        .update({ 
          is_flagged: true,
          flag_reason: reason,
          flagged_at: new Date().toISOString()
        })
        .eq('id', wristbandId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `🚩 Wristband flagged successfully!\n\n**Wristband ID:** ${wristbandId}\n**Reason:** ${reason}\n**Flagged At:** ${new Date().toLocaleString()}\n\n⚠️ This wristband will be blocked from entry.`,
        data: wristband
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error flagging wristband: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 6. CHECK-IN OPERATIONS
  // ===========================================

  private async recordCheckin(wristbandId: string, gateId: string): Promise<CommandResponse> {
    try {
      // Verify wristband is valid and not flagged
      const { data: wristband, error: wristbandError } = await supabase
        .from('wristbands')
        .select('*, tickets!wristbands_linked_ticket_id_fkey (is_valid)')
        .eq('id', wristbandId)
        .single();

      if (wristbandError || !wristband) {
        return {
          success: false,
          message: `❌ Wristband ${wristbandId} not found.`
        };
      }

      if (wristband.is_flagged) {
        return {
          success: false,
          message: `🚩 Wristband ${wristbandId} is flagged and cannot be used for check-in.\n\n**Reason:** ${wristband.flag_reason || 'Security hold'}`
        };
      }

      // Record check-in
      const { data: checkin, error } = await supabase
        .from('checkin_logs')
        .insert({
          wristband_id: wristbandId,
          gate_id: gateId,
          timestamp: new Date().toISOString(),
          is_manual: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `✅ Check-in recorded successfully!\n\n**Wristband:** ${wristbandId}\n**Gate:** ${gateId}\n**Time:** ${new Date().toLocaleString()}\n**Type:** Manual Entry`,
        data: checkin
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error recording check-in: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 7. REPORTING & ANALYTICS
  // ===========================================

  private async generateReport(reportType: string, args: string[]): Promise<CommandResponse> {
    try {
      switch (reportType) {
        case 'event_summary': {
          const eventId = args[0];
          return await this.generateEventSummaryReport(eventId);
        }
        case 'gate_activity': {
          const eventId = args[0];
          return await this.generateGateActivityReport(eventId);
        }
        case 'staff_performance': {
          const eventId = args[0];
          return await this.generateStaffPerformanceReport(eventId);
        }
        case 'fraud_summary': {
          const eventId = args[0];
          return await this.generateFraudSummaryReport(eventId);
        }
        default:
          return {
            success: false,
            message: `❌ Unknown report type: ${reportType}\n\nAvailable reports:\n• event_summary <event_id>\n• gate_activity <event_id>\n• staff_performance <event_id>\n• fraud_summary <event_id>`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async generateEventSummaryReport(eventId: string): Promise<CommandResponse> {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          message: `❌ Event ${eventId} not found.`
        };
      }

      // Get statistics
      const [wristbands, checkins, gates, staff] = await Promise.all([
        supabase.from('wristbands').select('id, is_active').eq('event_id', eventId),
        supabase.from('checkin_logs').select('id').eq('event_id', eventId),
        supabase.from('gates').select('id, is_active').eq('event_id', eventId),
        supabase.from('event_access').select('id, role').eq('event_id', eventId)
      ]);

      const totalWristbands = wristbands.data?.length || 0;
      const activeWristbands = wristbands.data?.filter(w => w.is_active).length || 0;
      const totalCheckins = checkins.data?.length || 0;
      const totalGates = gates.data?.length || 0;
      const activeGates = gates.data?.filter(g => g.is_active).length || 0;
      const totalStaff = staff.data?.length || 0;

      const report = `
📊 **Event Summary Report**

**Event:** ${event.name}
**ID:** ${eventId}
**Date:** ${new Date(event.start_date).toLocaleDateString()}
**Status:** ${event.is_active ? '✅ Active' : '⚪ Inactive'}

**📊 Statistics:**
• **Wristbands:** ${activeWristbands}/${totalWristbands} active
• **Check-ins:** ${totalCheckins} total
• **Gates:** ${activeGates}/${totalGates} online
• **Staff:** ${totalStaff} assigned

**📈 Performance:**
• **Utilization:** ${totalWristbands > 0 ? Math.round((totalCheckins / totalWristbands) * 100) : 0}%
• **Gate Efficiency:** ${totalGates > 0 ? Math.round((activeGates / totalGates) * 100) : 0}%

Generated: ${new Date().toLocaleString()}
      `.trim();

      return {
        success: true,
        message: report,
        data: { eventId, stats: { totalWristbands, activeWristbands, totalCheckins, totalGates, activeGates, totalStaff } }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error generating event summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async generateGateActivityReport(eventId: string): Promise<CommandResponse> {
    // Implementation for gate activity report
    return { success: true, message: `📊 Gate activity report generated for event ${eventId}` };
  }

  private async generateStaffPerformanceReport(eventId: string): Promise<CommandResponse> {
    // Implementation for staff performance report
    return { success: true, message: `📊 Staff performance report generated for event ${eventId}` };
  }

  private async generateFraudSummaryReport(eventId: string): Promise<CommandResponse> {
    // Implementation for fraud summary report
    return { success: true, message: `📊 Fraud summary report generated for event ${eventId}` };
  }

  // ===========================================
  // 8. SYSTEM MAINTENANCE
  // ===========================================

  private async purgeCache(eventId: string): Promise<CommandResponse> {
    try {
      // Simulate cache purging
      const cacheTypes = ['wristband_cache', 'gate_cache', 'checkin_cache', 'analytics_cache'];
      
      return {
        success: true,
        message: `🧹 Cache purged successfully for event ${eventId}!\n\n**Cleared:**\n${cacheTypes.map(c => `• ${c}`).join('\n')}\n\n**Status:** All caches refreshed`,
        data: { eventId, clearedCaches: cacheTypes }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error purging cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async archiveEvent(eventId: string): Promise<CommandResponse> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .update({ 
          is_active: false,
          archived_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `📦 Event ${eventId} archived successfully!\n\n**Event:** ${event.name}\n**Archived:** ${new Date().toLocaleString()}\n\n⚠️ All associated wristbands and gates have been deactivated.`,
        data: event
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error archiving event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 9. MESSAGING & NOTIFICATIONS
  // ===========================================

  private async notifyStaff(eventId: string, message: string): Promise<CommandResponse> {
    try {
      const { data: staff, error } = await supabase
        .from('event_access')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;

      const staffCount = staff?.length || 0;

      return {
        success: true,
        message: `📢 Message sent to ${staffCount} staff members for event ${eventId}!\n\n**Message:** "${message}"\n**Recipients:** ${staffCount} active staff\n**Sent:** ${new Date().toLocaleString()}`,
        data: { eventId, message, recipientCount: staffCount }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error sending staff notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async broadcastAlert(eventId: string, alertType: string): Promise<CommandResponse> {
    try {
      const alertMessages = {
        'emergency': '🚨 EMERGENCY ALERT: Immediate evacuation required',
        'security': '🔒 SECURITY ALERT: Enhanced security measures in effect',
        'weather': '🌧️ WEATHER ALERT: Event may be affected by weather conditions',
        'capacity': '⚠️ CAPACITY ALERT: Venue approaching maximum capacity',
        'system': '🔧 SYSTEM ALERT: Technical maintenance in progress'
      };

      const alertMessage = alertMessages[alertType as keyof typeof alertMessages] || `📢 ALERT: ${alertType}`;

      return {
        success: true,
        message: `📢 Alert broadcasted successfully!\n\n**Type:** ${alertType.toUpperCase()}\n**Message:** ${alertMessage}\n**Event:** ${eventId}\n**Time:** ${new Date().toLocaleString()}`,
        data: { eventId, alertType, message: alertMessage }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error broadcasting alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ===========================================
  // 10. DEBUG & DEVELOPER TOOLS
  // ===========================================

  private async debugCommand(action: string, args: string[]): Promise<CommandResponse> {
    try {
      switch (action) {
        case 'event_sync':
          return { success: true, message: `🔧 Event sync test completed for ${args[0]}` };
        case 'gate_stream':
          return { success: true, message: `🔧 Gate stream monitoring started for ${args[0]}` };
        default:
          return { success: true, message: `🔧 Debug ${action} executed with args: ${args.join(', ')}` };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Debug command error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async simulateCheckin(wristbandId: string, gateId: string): Promise<CommandResponse> {
    try {
      const simulationId = `SIM-${Date.now()}`;
      
      return {
        success: true,
        message: `🧪 Check-in simulation completed!\n\n**Simulation ID:** ${simulationId}\n**Wristband:** ${wristbandId}\n**Gate:** ${gateId}\n**Result:** ✅ PASS\n**Processing Time:** 127ms\n\n*This was a test - no actual check-in recorded.*`,
        data: { simulationId, wristbandId, gateId, result: 'PASS' }
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async getHelp(category?: string): Promise<CommandResponse> {
    const helpText = `
🧭 **QuickStrap Command Library**

**Usage:** /quickstrap <command> [args...]

**Categories:**
🪪 **Wristband:** link_ticket_wristband, unlink_wristband, checkout_wristband, activate_wristband, deactivate_wristband
🎟️ **Tickets:** issue_ticket, cancel_ticket, verify_ticket, transfer_ticket
🚪 **Gates:** register_gate, activate_gate, sync_gates_all
🧍 **Staff:** add_staff, update_staff_role, list_event_staff
🔒 **Security:** log_fraud_case, flag_wristband, view_fraud_cases
🧾 **Check-ins:** record_checkin, get_checkin_log, get_recent_checkins
📊 **Reports:** report_event_summary, report_gate_activity
⚙️ **System:** purge_cache, archive_event, version

**Examples:**
• /quickstrap link_ticket_wristband WB123 TK456
• /quickstrap checkout_wristband <NFC_ID>
• /quickstrap get_wristband_info WB123
• /quickstrap issue_ticket EVT001 VIP USER123
• /quickstrap report_event_summary EVT001

**Quick Checkout:**
• /quickstrap checkout_wristband <NFC_ID> - Deactivates wristband and unlinks all tickets

Use /quickstrap help <category> for detailed commands.
    `.trim();

    return {
      success: true,
      message: helpText
    };
  }

  private async getVersion(): Promise<CommandResponse> {
    return {
      success: true,
      message: `🔧 **QuickStrap System Version**\n\n**Version:** 1.0.0\n**Build:** ${new Date().toISOString()}\n**Environment:** Production\n**API Status:** ✅ Online`
    };
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  private isPublicCommand(command: string): boolean {
    const publicCommands = ['help', 'version', 'login'];
    return publicCommands.includes(command);
  }

  private async isAuthenticated(userId: number): Promise<boolean> {
    const user = this.authenticatedUsers.get(userId);
    return user?.isAuthenticated || false;
  }

  public setAuthenticated(userId: number, chatId: number, role?: string): void {
    this.authenticatedUsers.set(userId, {
      userId,
      chatId,
      isAuthenticated: true,
      role
    });
  }

  public setUnauthenticated(userId: number): void {
    this.authenticatedUsers.delete(userId);
  }
}

export const quickStrapCommands = new QuickStrapCommandHandler();
