import { supabase } from './supabase';
// @ts-ignore - Optional dependency
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.warn('xlsx not installed - Excel exports will not be available');
}
import jsPDF from 'jspdf';
import * as Papa from 'papaparse';
import type {
  ExportJob,
  ScheduledReport,
  ApiResponse,
  PaginatedResponse,
} from '../types/portal';

/**
 * Export & Reporting Service
 * Handles data export, PDF generation, and scheduled reports
 */

// ============================================================================
// EXPORT JOB MANAGEMENT
// ============================================================================

/**
 * Create a new export job
 */
export const createExportJob = async (
  exportType: string,
  format: 'csv' | 'pdf' | 'excel',
  eventId?: string,
  filters?: any
): Promise<ApiResponse<ExportJob>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('export_jobs')
      .insert({
        event_id: eventId,
        user_id: user.id,
        export_type: exportType,
        format,
        filters,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger export processing
    processExportJob(data.id, exportType, format, eventId, filters);

    return {
      success: true,
      data: data as ExportJob,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'EXPORT_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create export job',
      },
    };
  }
};

/**
 * Process export job
 */
const processExportJob = async (
  jobId: string,
  exportType: string,
  format: string,
  eventId?: string,
  filters?: any
) => {
  try {
    // Update status to processing
    await supabase
      .from('export_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    let fileContent: Blob | null = null;
    let fileName = '';

    // Generate export based on type
    switch (exportType) {
      case 'checkin-log':
        fileContent = await exportCheckinLog(eventId!, format, filters);
        fileName = `checkin-log-${eventId}.${format}`;
        break;

      case 'gate-summary':
        fileContent = await exportGateSummary(eventId!, format);
        fileName = `gate-summary-${eventId}.${format}`;
        break;

      case 'staff-performance':
        fileContent = await exportStaffPerformance(eventId!, format);
        fileName = `staff-performance-${eventId}.${format}`;
        break;

      case 'category-breakdown':
        fileContent = await exportCategoryBreakdown(eventId!, format);
        fileName = `category-breakdown-${eventId}.${format}`;
        break;

      default:
        throw new Error('Unknown export type');
    }

    if (!fileContent) {
      throw new Error('Failed to generate export file');
    }

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(`${jobId}/${fileName}`, fileContent, {
        contentType: getContentType(format),
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('exports')
      .getPublicUrl(`${jobId}/${fileName}`);

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Update job as completed
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        file_url: urlData.publicUrl,
        expires_at: expiresAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

  } catch (error) {
    // Update job as failed
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Export failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
};

/**
 * Get export jobs for user
 */
export const getExportJobs = async (
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<PaginatedResponse<ExportJob>>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('export_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      data: {
        items: data as ExportJob[],
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'EXPORT_JOBS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch export jobs',
      },
    };
  }
};

/**
 * Delete export job
 */
export const deleteExportJob = async (jobId: string): Promise<ApiResponse<void>> => {
  try {
    // Delete file from storage
    const { data: job } = await supabase
      .from('export_jobs')
      .select('file_url')
      .eq('id', jobId)
      .single();

    if (job?.file_url) {
      const filePath = job.file_url.split('/').slice(-2).join('/');
      await supabase.storage.from('exports').remove([filePath]);
    }

    // Delete job record
    const { error } = await supabase
      .from('export_jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete export job',
      },
    };
  }
};

// ============================================================================
// EXPORT GENERATORS
// ============================================================================

/**
 * Export check-in log
 */
const exportCheckinLog = async (
  eventId: string,
  format: string,
  filters?: any
): Promise<Blob> => {
  // Fetch check-in data
  let query = supabase
    .from('checkin_logs')
    .select(`
      id,
      timestamp,
      location,
      wristband_id,
      status,
      processing_time_ms,
      wristbands(nfc_id, category, attendee_name, attendee_email)
    `)
    .eq('event_id', eventId)
    .eq('is_test_data', false)
    .order('timestamp', { ascending: true });

  // Apply filters
  if (filters?.date_range) {
    query = query
      .gte('timestamp', filters.date_range.start)
      .lte('timestamp', filters.date_range.end);
  }
  if (filters?.gates?.length > 0) {
    query = query.in('location', filters.gates);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Transform data
  const exportData = data?.map((checkin: any) => ({
    'Check-in ID': checkin.id,
    'Timestamp': new Date(checkin.timestamp).toLocaleString(),
    'Gate': checkin.location,
    'Wristband ID': checkin.wristbands?.nfc_id || checkin.wristband_id,
    'Category': checkin.wristbands?.category || 'N/A',
    'Attendee Name': checkin.wristbands?.attendee_name || '',
    'Attendee Email': checkin.wristbands?.attendee_email || '',
    'Status': checkin.status,
    'Processing Time (ms)': checkin.processing_time_ms,
  })) || [];

  return generateExport(exportData, format, 'Check-in Log');
};

/**
 * Export gate summary
 */
const exportGateSummary = async (
  eventId: string,
  format: string
): Promise<Blob> => {
  // Fetch gate data
  const { data: gates } = await supabase
    .from('gates')
    .select('*')
    .eq('event_id', eventId);

  const gateData = await Promise.all(
    (gates || []).map(async (gate) => {
      // Get check-in count for this gate
      const { count } = await supabase
        .from('checkin_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('location', gate.name)
        .eq('is_test_data', false);

      // Get average processing time
      const { data: checkins } = await supabase
        .from('checkin_logs')
        .select('processing_time_ms')
        .eq('event_id', eventId)
        .eq('location', gate.name)
        .eq('is_test_data', false);

      const avgTime = checkins && checkins.length > 0
        ? checkins.reduce((sum, c) => sum + (c.processing_time_ms || 0), 0) / checkins.length
        : 0;

      return {
        'Gate Name': gate.name,
        'Status': gate.status,
        'Total Check-ins': count || 0,
        'Avg Processing Time (ms)': avgTime.toFixed(2),
        'Health Score': gate.health_score || 0,
        'Location': gate.location_description || 'N/A',
        'Created At': new Date(gate.created_at).toLocaleString(),
      };
    })
  );

  return generateExport(gateData, format, 'Gate Summary');
};

/**
 * Export staff performance
 */
const exportStaffPerformance = async (
  eventId: string,
  format: string
): Promise<Blob> => {
  const { data: performance } = await supabase
    .from('staff_performance')
    .select(`
      *,
      staff:staff_id(email, full_name)
    `)
    .eq('event_id', eventId);

  const exportData = performance?.map((perf: any) => ({
    'Staff Name': perf.staff?.full_name || perf.staff?.email || 'Unknown',
    'Email': perf.staff?.email || '',
    'Total Scans': perf.total_scans,
    'Scans per Hour': perf.scans_per_hour?.toFixed(2),
    'Error Count': perf.error_count,
    'Avg Scan Time (ms)': perf.avg_scan_time_ms,
    'Efficiency Score': perf.efficiency_score,
    'Break Time (min)': perf.break_time_minutes,
    'Shift Start': perf.shift_start ? new Date(perf.shift_start).toLocaleString() : 'N/A',
    'Shift End': perf.shift_end ? new Date(perf.shift_end).toLocaleString() : 'N/A',
  })) || [];

  return generateExport(exportData, format, 'Staff Performance');
};

/**
 * Export category breakdown
 */
const exportCategoryBreakdown = async (
  eventId: string,
  format: string
): Promise<Blob> => {
  const { data: wristbands } = await supabase
    .from('wristbands')
    .select('category, status')
    .eq('event_id', eventId);

  // Group by category
  const categoryMap = new Map<string, any>();

  wristbands?.forEach((wb) => {
    const category = wb.category || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        total: 0,
        activated: 0,
        checked_in: 0,
        deactivated: 0,
      });
    }
    const stats = categoryMap.get(category)!;
    stats.total++;
    if (wb.status === 'activated') stats.activated++;
    if (wb.status === 'checked-in') stats.checked_in++;
    if (wb.status === 'deactivated') stats.deactivated++;
  });

  const exportData = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    'Category': category,
    'Total Wristbands': stats.total,
    'Activated': stats.activated,
    'Checked In': stats.checked_in,
    'Deactivated': stats.deactivated,
    'Check-in Rate (%)': ((stats.checked_in / stats.total) * 100).toFixed(2),
  }));

  return generateExport(exportData, format, 'Category Breakdown');
};

/**
 * Generate export file based on format
 */
const generateExport = (data: any[], format: string, title: string): Blob => {
  switch (format) {
    case 'csv':
      return new Blob([Papa.unparse(data)], { type: 'text/csv' });

    case 'excel':
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    case 'pdf':
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 20, 20);
      doc.setFontSize(10);

      // Add table (simplified - use jsPDF-AutoTable for better tables)
      let y = 40;
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        doc.text(headers.join(' | '), 20, y);
        y += 10;

        data.slice(0, 30).forEach((row) => { // Limit to 30 rows for PDF
          const values = Object.values(row).join(' | ');
          doc.text(values, 20, y);
          y += 7;
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
        });
      }

      return doc.output('blob');

    default:
      throw new Error('Unsupported format');
  }
};

/**
 * Get content type for format
 */
const getContentType = (format: string): string => {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

/**
 * Create scheduled report
 */
export const createScheduledReport = async (
  reportConfig: Partial<ScheduledReport>
): Promise<ApiResponse<ScheduledReport>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        ...reportConfig,
        user_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as ScheduledReport,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SCHEDULED_REPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create scheduled report',
      },
    };
  }
};

/**
 * Get scheduled reports
 */
export const getScheduledReports = async (): Promise<ApiResponse<ScheduledReport[]>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data as ScheduledReport[],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_REPORTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch scheduled reports',
      },
    };
  }
};

/**
 * Delete scheduled report
 */
export const deleteScheduledReport = async (reportId: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DELETE_REPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete scheduled report',
      },
    };
  }
};
