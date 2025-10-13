import { supabase } from './supabase';

interface LinkResult {
  success: boolean;
  error?: string;
  details?: any;
}

interface CategoryLimitInfo {
  category: string;
  current_count: number;
  max_allowed: number;
  remaining: number;
}

/**
 * Check if a ticket can accept more wristbands of a specific category
 */
export async function checkCategoryLimit(
  ticketId: string,
  wristbandId: string
): Promise<LinkResult> {
  try {
    // 1. Get wristband details (category and event)
    const { data: wristband, error: wristbandError } = await supabase
      .from('wristbands')
      .select('id, category, event_id')
      .eq('id', wristbandId)
      .single();

    if (wristbandError || !wristband) {
      return {
        success: false,
        error: 'Wristband not found',
      };
    }

    // 2. Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, event_id, ticket_number')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found',
      };
    }

    // 3. Verify ticket and wristband belong to same event
    if (ticket.event_id !== wristband.event_id) {
      return {
        success: false,
        error: 'Ticket and wristband must belong to the same event',
      };
    }

    // 4. Get the category limit for this event + category
    const { data: limitData, error: limitError } = await supabase
      .from('event_category_limits')
      .select('max_wristbands')
      .eq('event_id', wristband.event_id)
      .eq('category', wristband.category)
      .single();

    const maxAllowed = limitData?.max_wristbands || 1; // Default to 1 if not set

    // 5. Count existing links for this ticket + category
    const { data: existingLinks, error: linksError } = await supabase
      .from('ticket_wristband_links')
      .select('id, wristband:wristbands!ticket_wristband_links_wristband_id_fkey(id, category)')
      .eq('ticket_id', ticketId);

    if (linksError) {
      return {
        success: false,
        error: 'Failed to check existing links',
      };
    }

    // Count wristbands of the same category
    const currentCount = existingLinks?.filter(
      (link: any) => link.wristband?.category === wristband.category
    ).length || 0;

    // 6. Check if limit is reached
    if (currentCount >= maxAllowed) {
      return {
        success: false,
        error: `Ticket already has maximum allowed wristbands (${maxAllowed}) for category "${wristband.category}"`,
        details: {
          category: wristband.category,
          current_count: currentCount,
          max_allowed: maxAllowed,
          remaining: 0,
        },
      };
    }

    return {
      success: true,
      details: {
        category: wristband.category,
        current_count: currentCount,
        max_allowed: maxAllowed,
        remaining: maxAllowed - currentCount,
      },
    };
  } catch (error) {
    console.error('Error checking category limit:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while checking limits',
    };
  }
}

/**
 * Link a wristband to a ticket with category limit validation
 */
export async function linkWristbandToTicket(
  ticketId: string,
  wristbandId: string,
  userId?: string
): Promise<LinkResult> {
  try {
    // 1. Check if wristband is already linked
    const { data: existingLink, error: checkError } = await supabase
      .from('ticket_wristband_links')
      .select('id, ticket:tickets(ticket_number)')
      .eq('wristband_id', wristbandId)
      .maybeSingle();

    if (checkError) {
      return {
        success: false,
        error: 'Failed to check existing links',
      };
    }

    if (existingLink) {
      const ticket = existingLink.ticket as any;
      return {
        success: false,
        error: `Wristband is already linked to ticket ${ticket?.ticket_number || 'another ticket'}`,
      };
    }

    // 2. Check category limit
    const limitCheck = await checkCategoryLimit(ticketId, wristbandId);
    if (!limitCheck.success) {
      return limitCheck;
    }

    // 3. Create the link
    const { data: newLink, error: insertError } = await supabase
      .from('ticket_wristband_links')
      .insert({
        ticket_id: ticketId,
        wristband_id: wristbandId,
        linked_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      // Check if error is from the trigger
      if (insertError.message.includes('already has maximum allowed wristbands')) {
        return {
          success: false,
          error: insertError.message,
        };
      }

      return {
        success: false,
        error: 'Failed to create link',
        details: insertError,
      };
    }

    // 4. Refresh category counts after insert to get up-to-date information
    // This prevents returning stale counts to the client
    const { data: wristband } = await supabase
      .from('wristbands')
      .select('category, event_id')
      .eq('id', wristbandId)
      .single();

    if (wristband) {
      // Recalculate current count for this category after the insert
      const { data: updatedLinks } = await supabase
        .from('ticket_wristband_links')
        .select('id, wristband:wristbands!ticket_wristband_links_wristband_id_fkey(id, category)')
        .eq('ticket_id', ticketId);

      const updatedCount = updatedLinks?.filter(
        (link: any) => link.wristband?.category === wristband.category
      ).length || 0;

      // Get the max allowed again to ensure freshness
      const { data: limitData } = await supabase
        .from('event_category_limits')
        .select('max_wristbands')
        .eq('event_id', wristband.event_id)
        .eq('category', wristband.category)
        .single();

      const maxAllowed = limitData?.max_wristbands || 1;

      return {
        success: true,
        details: {
          link_id: newLink.id,
          category: wristband.category,
          current_count: updatedCount,
          max_allowed: maxAllowed,
          remaining: maxAllowed - updatedCount,
        },
      };
    }

    // Fallback if we couldn't refresh (shouldn't happen)
    return {
      success: true,
      details: {
        link_id: newLink.id,
        ...limitCheck.details,
      },
    };
  } catch (error) {
    console.error('Error linking wristband to ticket:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while linking',
    };
  }
}

/**
 * Unlink a wristband from a ticket
 */
export async function unlinkWristbandFromTicket(
  ticketId: string,
  wristbandId: string
): Promise<LinkResult> {
  try {
    const { error } = await supabase
      .from('ticket_wristband_links')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('wristband_id', wristbandId);

    if (error) {
      return {
        success: false,
        error: 'Failed to unlink wristband',
        details: error,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error unlinking wristband:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while unlinking',
    };
  }
}

/**
 * Get all category limits for a ticket
 */
export async function getTicketCategoryStatus(ticketId: string): Promise<{
  success: boolean;
  categories?: CategoryLimitInfo[];
  error?: string;
}> {
  try {
    // 1. Get ticket and event
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, event_id')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found',
      };
    }

    // 2. Get all category limits for this event
    const { data: limits, error: limitsError } = await supabase
      .from('event_category_limits')
      .select('category, max_wristbands')
      .eq('event_id', ticket.event_id);

    if (limitsError) {
      return {
        success: false,
        error: 'Failed to fetch category limits',
      };
    }

    // 3. Get current links for this ticket
    const { data: links, error: linksError } = await supabase
      .from('ticket_wristband_links')
      .select('id, wristband:wristbands!ticket_wristband_links_wristband_id_fkey(id, category)')
      .eq('ticket_id', ticketId);

    if (linksError) {
      return {
        success: false,
        error: 'Failed to fetch current links',
      };
    }

    // 4. Calculate status for each category
    const categoryStatus: CategoryLimitInfo[] = (limits || []).map((limit) => {
      const currentCount = links?.filter(
        (link: any) => link.wristband?.category === limit.category
      ).length || 0;

      return {
        category: limit.category,
        current_count: currentCount,
        max_allowed: limit.max_wristbands,
        remaining: limit.max_wristbands - currentCount,
      };
    });

    return {
      success: true,
      categories: categoryStatus,
    };
  } catch (error) {
    console.error('Error getting ticket category status:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get all wristbands linked to a ticket
 */
export async function getTicketWristbands(ticketId: string): Promise<{
  success: boolean;
  wristbands?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('ticket_wristband_links')
      .select(`
        id,
        linked_at,
        wristband:wristbands!ticket_wristband_links_wristband_id_fkey(
          id,
          nfc_id,
          category,
          status,
          attendee_name,
          attendee_email
        )
      `)
      .eq('ticket_id', ticketId)
      .order('linked_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch wristbands',
      };
    }

    return {
      success: true,
      wristbands: data || [],
    };
  } catch (error) {
    console.error('Error getting ticket wristbands:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Bulk link multiple wristbands to tickets (with validation)
 */
export async function bulkLinkWristbands(
  links: Array<{ ticketId: string; wristbandId: string }>,
  userId?: string
): Promise<{
  success: boolean;
  results: Array<{ ticketId: string; wristbandId: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ ticketId: string; wristbandId: string; success: boolean; error?: string }> = [];

  for (const link of links) {
    const result = await linkWristbandToTicket(link.ticketId, link.wristbandId, userId);
    results.push({
      ticketId: link.ticketId,
      wristbandId: link.wristbandId,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return {
    success: failureCount === 0,
    results,
  };
}
