import { supabase } from './supabase';
import {
  EventTemplate,
  TemplateGate,
  TemplateWristbandCategory,
  EventClone,
  CloneEventRequest,
  CreateTemplateRequest
} from '../types/phase2';

// ============================================================================
// EVENT TEMPLATES & CLONING SERVICE
// ============================================================================

export const templateService = {
  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Get all templates (public + org's templates)
   */
  async getTemplates(organizationId?: string): Promise<EventTemplate[]> {
    let query = supabase
      .from('event_templates')
      .select(`
        *,
        gates:template_gates(*),
        categories:template_categories(*)
      `)
      .order('usage_count', { ascending: false });

    if (organizationId) {
      query = query.or(`is_public.eq.true,organization_id.eq.${organizationId}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as EventTemplate[];
  },

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<EventTemplate> {
    const { data, error } = await supabase
      .from('event_templates')
      .select(`
        *,
        gates:template_gates(*),
        categories:template_categories(*)
      `)
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as unknown as EventTemplate;
  },

  /**
   * Create template from scratch
   */
  async createTemplate(request: CreateTemplateRequest): Promise<EventTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('event_templates')
      .insert({
        organization_id: request.organization_id,
        name: request.name,
        description: request.description || null,
        category: request.category || null,
        template_data: {},
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as EventTemplate;
  },

  /**
   * Create template from existing event
   */
  async createTemplateFromEvent(eventId: string, templateData: {
    name: string;
    description?: string;
    category?: string;
    is_public?: boolean;
  }): Promise<EventTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        gates(*),
        wristbands(category)
      `)
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('event_templates')
      .insert({
        organization_id: event.organization_id,
        name: templateData.name,
        description: templateData.description || null,
        category: templateData.category || null,
        is_public: templateData.is_public || false,
        template_data: {
          name: event.name,
          location: event.location,
          capacity: event.capacity,
          config: event.config
        },
        created_by: user.id
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Clone gates
    if (event.gates && event.gates.length > 0) {
      const templateGates = event.gates.map((gate: any, index: number) => ({
        template_id: template.id,
        name: gate.name,
        gate_type: gate.gate_type,
        location_description: gate.location_description,
        category_bindings: gate.category_bindings || [],
        sort_order: index
      }));

      await supabase
        .from('template_gates')
        .insert(templateGates);
    }

    // Clone categories
    if (event.wristbands) {
      const uniqueCategories = [...new Set(event.wristbands.map((w: any) => w.category))];
      const templateCategories = uniqueCategories.map((category, index) => ({
        template_id: template.id,
        name: category,
        sort_order: index
      }));

      await supabase
        .from('template_categories')
        .insert(templateCategories);
    }

    return template as EventTemplate;
  },

  /**
   * Update template
   */
  async updateTemplate(templateId: string, updates: Partial<EventTemplate>): Promise<EventTemplate> {
    const { data, error } = await supabase
      .from('event_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data as EventTemplate;
  },

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('event_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
  },

  // ==========================================================================
  // CLONING
  // ==========================================================================

  /**
   * Clone event from existing event
   */
  async cloneEvent(request: CloneEventRequest): Promise<{ event: any; clone: EventClone }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let sourceEvent = null;
    let sourceTemplate = null;

    // Get source (either event or template)
    if (request.source_event_id) {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          gates(*),
          wristbands(*)
        `)
        .eq('id', request.source_event_id)
        .single();

      if (error) throw error;
      sourceEvent = data;
    } else if (request.source_template_id) {
      const template = await this.getTemplate(request.source_template_id);
      sourceTemplate = template;

      // Increment usage count
      await supabase
        .from('event_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);
    } else {
      throw new Error('Must provide either source_event_id or source_template_id');
    }

    // Create new event
    const eventData: any = {
      ...request.new_event_data,
      organization_id: sourceEvent?.organization_id || user.id,
      lifecycle_status: 'draft',
      created_by: user.id
    };

    // Copy settings if requested
    if (request.clone_options.clone_settings && sourceEvent) {
      eventData.config = sourceEvent.config;
      eventData.capacity = sourceEvent.capacity;
    } else if (sourceTemplate) {
      eventData.config = sourceTemplate.template_data.config;
      eventData.capacity = sourceTemplate.template_data.capacity;
    }

    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) throw eventError;

    // Clone gates if requested
    if (request.clone_options.clone_gates) {
      if (sourceEvent?.gates && sourceEvent.gates.length > 0) {
        const newGates = sourceEvent.gates.map((gate: any) => ({
          event_id: newEvent.id,
          name: gate.name,
          gate_type: gate.gate_type,
          location_description: gate.location_description,
          category_bindings: gate.category_bindings,
          status: 'inactive'
        }));

        await supabase.from('gates').insert(newGates);
      } else if (sourceTemplate?.gates && sourceTemplate.gates.length > 0) {
        const newGates = sourceTemplate.gates.map((gate) => ({
          event_id: newEvent.id,
          name: gate.name,
          gate_type: gate.gate_type,
          location_description: gate.location_description,
          category_bindings: gate.category_bindings,
          status: 'inactive'
        }));

        await supabase.from('gates').insert(newGates);
      }
    }

    // Clone wristbands if requested
    if (request.clone_options.clone_wristbands && sourceEvent?.wristbands) {
      const newWristbands = sourceEvent.wristbands.map((wb: any) => ({
        event_id: newEvent.id,
        // Don't copy NFC ID to avoid duplicates - let system assign new ones
        category: wb.category,
        attendee_name: wb.attendee_name,
        attendee_email: wb.attendee_email,
        status: 'pending'
      }));

      await supabase.from('wristbands').insert(newWristbands);
    }

    // Record the clone
    const { data: cloneRecord, error: cloneError } = await supabase
      .from('event_clones')
      .insert({
        source_event_id: request.source_event_id || null,
        source_template_id: request.source_template_id || null,
        cloned_event_id: newEvent.id,
        cloned_settings: request.clone_options.clone_settings || false,
        cloned_gates: request.clone_options.clone_gates || false,
        cloned_categories: request.clone_options.clone_categories || false,
        cloned_wristbands: request.clone_options.clone_wristbands || false,
        cloned_by: user.id
      })
      .select()
      .single();

    if (cloneError) throw cloneError;

    return {
      event: newEvent,
      clone: cloneRecord as EventClone
    };
  },

  /**
   * Get clone history for an event
   */
  async getCloneHistory(eventId: string): Promise<EventClone[]> {
    const { data, error } = await supabase
      .from('event_clones')
      .select('*')
      .or(`source_event_id.eq.${eventId},cloned_event_id.eq.${eventId}`)
      .order('cloned_at', { ascending: false });

    if (error) throw error;
    return data as EventClone[];
  },

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<EventTemplate[]> {
    const { data, error } = await supabase
      .from('event_templates')
      .select(`
        *,
        gates:template_gates(*),
        categories:template_categories(*)
      `)
      .eq('is_featured', true)
      .eq('is_public', true)
      .order('usage_count', { ascending: false })
      .limit(6);

    if (error) throw error;
    return data as unknown as EventTemplate[];
  },

  /**
   * Search templates
   */
  async searchTemplates(query: string, category?: string): Promise<EventTemplate[]> {
    let searchQuery = supabase
      .from('event_templates')
      .select('*')
      .eq('is_public', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    if (category) {
      searchQuery = searchQuery.eq('category', category);
    }

    const { data, error } = await searchQuery
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data as EventTemplate[];
  }
};

export default templateService;
