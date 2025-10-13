import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Download, FileText, Calendar, BarChart3, Clock } from 'lucide-react';
import * as Papa from 'papaparse';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'csv' | 'pdf' | 'excel' | 'json';
  fields: string[];
  filters: any;
  schedule?: 'daily' | 'weekly' | 'monthly' | null;
}

interface ExportJob {
  id: string;
  template_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  download_url?: string;
  error_message?: string;
}

interface ExportReportingSystemProps {
  eventId: string;
  eventName: string;
}

const ExportReportingSystem: React.FC<ExportReportingSystemProps> = ({ eventId, eventName }) => {
  const [reportTemplates] = useState<ReportTemplate[]>([
    {
      id: 'checkin_log',
      name: 'Complete Check-in Log',
      description: 'All check-in records with timestamps, staff, and locations',
      type: 'csv',
      fields: ['timestamp', 'wristband_id', 'location', 'staff_name', 'status', 'category'],
      filters: {}
    },
    {
      id: 'attendance_summary',
      name: 'Attendance Summary',
      description: 'High-level attendance metrics and statistics',
      type: 'pdf',
      fields: ['total_attendance', 'unique_attendees', 'peak_times', 'category_breakdown'],
      filters: {}
    },
    {
      id: 'gate_performance',
      name: 'Gate Performance Report',
      description: 'Detailed analysis of gate efficiency and throughput',
      type: 'excel',
      fields: ['gate_name', 'total_checkins', 'avg_processing_time', 'peak_hours', 'staff_assignments'],
      filters: {}
    },
    {
      id: 'staff_performance',
      name: 'Staff Performance Review',
      description: 'Individual staff metrics and efficiency scores',
      type: 'excel',
      fields: ['staff_name', 'total_scans', 'hours_worked', 'efficiency_score', 'error_rate'],
      filters: {}
    },
    {
      id: 'security_incidents',
      name: 'Security & Fraud Report',
      description: 'All security incidents and fraud detection events',
      type: 'csv',
      fields: ['incident_type', 'timestamp', 'wristband_id', 'location', 'resolution'],
      filters: {}
    },
    {
      id: 'compliance_audit',
      name: 'Compliance Audit Trail',
      description: 'Complete audit log for compliance requirements',
      type: 'json',
      fields: ['action', 'user', 'timestamp', 'table_name', 'old_values', 'new_values'],
      filters: {}
    }
  ]);

  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customFilters, setCustomFilters] = useState<any>({});
  const [emailRecipients, setEmailRecipients] = useState('');
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExportJobs();
    fetchScheduledReports();
  }, [eventId]);

  const fetchExportJobs = async () => {
    try {
      // In a real implementation, this would fetch from a jobs table
      // For now, we'll simulate with localStorage
      const jobs = JSON.parse(localStorage.getItem(`export_jobs_${eventId}`) || '[]');
      setExportJobs(jobs);
    } catch (error) {
      console.error('Error fetching export jobs:', error);
    }
  };

  const fetchScheduledReports = async () => {
    try {
      // Fetch scheduled reports from database
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      setScheduledReports(data || []);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
    }
  };

  const generateReport = async (template: ReportTemplate) => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = '';

      switch (template.id) {
        case 'checkin_log':
          data = await generateCheckinLog();
          filename = `checkin-log-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'attendance_summary':
          data = await generateAttendanceSummary();
          filename = `attendance-summary-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'gate_performance':
          data = await generateGatePerformance();
          filename = `gate-performance-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'staff_performance':
          data = await generateStaffPerformance();
          filename = `staff-performance-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'security_incidents':
          data = await generateSecurityReport();
          filename = `security-report-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'compliance_audit':
          data = await generateComplianceAudit();
          filename = `audit-trail-${eventId}-${new Date().toISOString().split('T')[0]}`;
          break;
      }

      downloadReport(data, template.type, filename);
      
      // Log the export job
      const job: ExportJob = {
        id: Date.now().toString(),
        template_id: template.id,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      const existingJobs = JSON.parse(localStorage.getItem(`export_jobs_${eventId}`) || '[]');
      existingJobs.unshift(job);
      localStorage.setItem(`export_jobs_${eventId}`, JSON.stringify(existingJobs.slice(0, 20)));
      
      setExportJobs(existingJobs);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const generateCheckinLog = async () => {
    const { data: checkins, error } = await supabase
      .from('checkin_logs')
      .select(`
        timestamp,
        wristband_id,
        location,
        status,
        staff_id,
        wristbands(category),
        profiles:staff_id(full_name)
      `)
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (checkins || []).map(checkin => ({
      'Timestamp': new Date(checkin.timestamp).toLocaleString(),
      'Wristband ID': checkin.wristband_id,
      'Location': checkin.location || 'Unknown',
      'Staff Name': (checkin.profiles as any)?.full_name || 'System',
      'Status': checkin.status,
      'Category': (checkin.wristbands as any)?.category || 'Unknown'
    }));
  };

  const generateAttendanceSummary = async () => {
    const { data: checkins } = await supabase
      .from('checkin_logs')
      .select('wristband_id, timestamp, status')
      .eq('event_id', eventId);

    const { data: event } = await supabase
      .from('events')
      .select('name, start_date, end_date, config')
      .eq('id', eventId)
      .single();

    const successfulCheckins = checkins?.filter(c => c.status === 'success') || [];
    const uniqueAttendees = new Set(successfulCheckins.map(c => c.wristband_id)).size;

    // Calculate hourly breakdown
    const hourlyData = successfulCheckins.reduce((acc: any, checkin) => {
      const hour = new Date(checkin.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHour = Object.entries(hourlyData).reduce((max: any, [hour, count]: any) => 
      count > max.count ? { hour, count } : max, { hour: '0', count: 0 });

    return [{
      'Event Name': event?.name || eventName,
      'Event Date': event?.start_date ? new Date(event.start_date).toLocaleDateString() : 'Unknown',
      'Total Check-ins': successfulCheckins.length,
      'Unique Attendees': uniqueAttendees,
      'Peak Hour': `${peakHour.hour}:00 (${peakHour.count} check-ins)`,
      'Capacity Utilization': event?.config?.capacity_settings?.max_capacity 
        ? `${((uniqueAttendees / event.config.capacity_settings.max_capacity) * 100).toFixed(1)}%`
        : 'N/A',
      'Generated At': new Date().toLocaleString()
    }];
  };

  const generateGatePerformance = async () => {
    const { data: gates } = await supabase
      .from('gates')
      .select('id, name')
      .eq('event_id', eventId);

    const gatePerformance = await Promise.all(
      (gates || []).map(async (gate) => {
        const { data: checkins } = await supabase
          .from('checkin_logs')
          .select('timestamp, status')
          .eq('event_id', eventId)
          .eq('location', gate.name);

        const successfulCheckins = checkins?.filter(c => c.status === 'success') || [];
        const totalCheckins = checkins?.length || 0;
        const errorRate = totalCheckins > 0 ? ((totalCheckins - successfulCheckins.length) / totalCheckins) * 100 : 0;

        return {
          'Gate Name': gate.name,
          'Total Check-ins': totalCheckins,
          'Successful Check-ins': successfulCheckins.length,
          'Error Rate': `${errorRate.toFixed(1)}%`,
          'Efficiency Score': `${Math.max(0, 100 - errorRate).toFixed(0)}%`,
          'First Check-in': successfulCheckins.length > 0 
            ? new Date(Math.min(...successfulCheckins.map(c => new Date(c.timestamp).getTime()))).toLocaleString()
            : 'N/A',
          'Last Check-in': successfulCheckins.length > 0
            ? new Date(Math.max(...successfulCheckins.map(c => new Date(c.timestamp).getTime()))).toLocaleString()
            : 'N/A'
        };
      })
    );

    return gatePerformance.sort((a, b) => b['Total Check-ins'] - a['Total Check-ins']);
  };

  const generateStaffPerformance = async () => {
    const { data: performance } = await supabase
      .from('staff_performance_cache')
      .select(`
        user_id,
        total_scans,
        successful_scans,
        error_rate,
        scans_per_hour,
        efficiency_score,
        hours_worked,
        profiles:user_id(full_name, email)
      `)
      .eq('event_id', eventId);

    return (performance || []).map(p => ({
      'Staff Name': (p.profiles as any)?.full_name || 'Unknown',
      'Email': (p.profiles as any)?.email || 'N/A',
      'Total Scans': p.total_scans,
      'Successful Scans': p.successful_scans,
      'Error Rate': `${p.error_rate}%`,
      'Scans per Hour': p.scans_per_hour,
      'Efficiency Score': `${p.efficiency_score}%`,
      'Hours Worked': p.hours_worked
    })).sort((a, b) => b['Efficiency Score'].localeCompare(a['Efficiency Score']));
  };

  const generateSecurityReport = async () => {
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    return (alerts || []).map(alert => ({
      'Incident Type': alert.alert_type,
      'Severity': alert.severity,
      'Message': alert.message,
      'Timestamp': new Date(alert.created_at).toLocaleString(),
      'Status': alert.resolved ? 'Resolved' : 'Open',
      'Resolution Time': alert.resolved_at 
        ? new Date(alert.resolved_at).toLocaleString()
        : 'N/A',
      'Data': JSON.stringify(alert.data || {})
    }));
  };

  const generateComplianceAudit = async () => {
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    return (auditLogs || []).map(log => ({
      action: log.action,
      user_id: log.user_id,
      timestamp: log.created_at,
      table_name: log.table_name,
      record_id: log.record_id,
      old_values: log.old_values,
      new_values: log.new_values,
      ip_address: log.ip_address,
      user_agent: log.user_agent
    }));
  };

  const downloadReport = (data: any[], type: string, filename: string) => {
    let blob: Blob;
    let extension: string;

    switch (type) {
      case 'csv':
        const csv = Papa.unparse(data);
        blob = new Blob([csv], { type: 'text/csv' });
        extension = 'csv';
        break;
      case 'json':
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        extension = 'json';
        break;
      case 'excel':
        // For Excel, we'll use CSV format for now
        const excelCsv = Papa.unparse(data);
        blob = new Blob([excelCsv], { type: 'text/csv' });
        extension = 'csv';
        break;
      default:
        const defaultCsv = Papa.unparse(data);
        blob = new Blob([defaultCsv], { type: 'text/csv' });
        extension = 'csv';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scheduleReport = async (template: ReportTemplate, schedule: string, recipients: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          event_id: eventId,
          template_id: template.id,
          template_name: template.name,
          schedule,
          recipients: recipients.split(',').map(email => email.trim()),
          is_active: true
        });

      if (error) throw error;
      
      await fetchScheduledReports();
      alert('Report scheduled successfully');
    } catch (error) {
      console.error('Error scheduling report:', error);
      alert('Error scheduling report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'csv': return FileText;
      case 'pdf': return FileText;
      case 'excel': return BarChart3;
      case 'json': return FileText;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export & Reporting</h3>
          <p className="text-sm text-gray-600">Generate and schedule comprehensive reports</p>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map(template => {
          const Icon = getTemplateIcon(template.type);
          return (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Icon className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600 uppercase">{template.type}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="space-y-2">
                <button
                  onClick={() => generateReport(template)}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Now
                </button>
                
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full flex items-center justify-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Export History</h4>
        
        {exportJobs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No exports generated yet</p>
        ) : (
          <div className="space-y-3">
            {exportJobs.slice(0, 10).map(job => {
              const template = reportTemplates.find(t => t.id === job.template_id);
              return (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {template?.name || 'Unknown Report'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Generated: {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    
                    {job.status === 'completed' && (
                      <button
                        onClick={() => generateReport(template!)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Re-download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Scheduled Reports</h4>
        
        {scheduledReports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No scheduled reports</p>
        ) : (
          <div className="space-y-3">
            {scheduledReports.map(report => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.template_name}</p>
                    <p className="text-xs text-gray-500">
                      {report.schedule} • {report.recipients?.length || 0} recipients
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {report.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Report Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Report</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report: {selectedTemplate.name}
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setCustomFilters({...customFilters, schedule: e.target.value})}
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Recipients (comma-separated)
                </label>
                <textarea
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="admin@company.com, manager@company.com"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customFilters.schedule && emailRecipients) {
                    scheduleReport(selectedTemplate, customFilters.schedule, emailRecipients);
                    setSelectedTemplate(null);
                    setEmailRecipients('');
                    setCustomFilters({});
                  }
                }}
                disabled={!customFilters.schedule || !emailRecipients}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportReportingSystem;
