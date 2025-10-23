import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Upload, Download, Search, Filter, Trash2, Edit, Eye, AlertTriangle, CheckCircle, X } from 'lucide-react';
import * as Papa from 'papaparse';
import AddToSeriesBulkAction from './AddToSeriesBulkAction';

interface Wristband {
  id: string;
  nfc_id: string;
  category: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  checked_in_at?: string;
  event_id?: string;
  metadata?: any;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface CSVValidationResult {
  valid: Wristband[];
  invalid: any[];
  duplicates: any[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

interface EnhancedWristbandManagerProps {
  eventId: string;
  isSeries?: boolean;
  seriesId?: string;
}

const EnhancedWristbandManager: React.FC<EnhancedWristbandManagerProps> = ({ eventId, isSeries = false, seriesId }) => {
  const [wristbands, setWristbands] = useState<Wristband[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedWristbands, setSelectedWristbands] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvValidation, setCsvValidation] = useState<CSVValidationResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddToSeries, setShowAddToSeries] = useState(false);

  useEffect(() => {
    fetchWristbands();
    fetchCategories();
  }, [eventId]);

  const fetchWristbands = async () => {
    try {
      let query = supabase
        .from('wristbands')
        .select('*');
      
      if (isSeries && seriesId) {
        // For series: get wristbands with this series_id
        query = query.eq('series_id', seriesId);
      } else {
        // For parent event: get wristbands with this event_id but NO series_id
        query = query.eq('event_id', eventId).is('series_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setWristbands(data || []);
    } catch (error) {
      console.error('Error fetching wristbands:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Extract unique categories from existing wristbands (like WristbandsPage does)
      let query = supabase
        .from('wristbands')
        .select('category');
      
      if (isSeries && seriesId) {
        query = query.eq('series_id', seriesId);
      } else {
        query = query.eq('event_id', eventId).is('series_id', null);
      }
      
      const { data, error } = await query.order('category');

      if (error) throw error;
      
      // Extract unique categories and convert to Category objects
      const uniqueCategories = [...new Set(data?.map((w) => w.category) || [])];
      const categoryObjects = uniqueCategories.map((name, index) => ({
        id: `cat-${index}`,
        name,
        color: getDefaultCategoryColor(name),
        description: `${name} wristbands`,
        is_active: true,
        sort_order: index
      }));
      
      setCategories(categoryObjects);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const getDefaultCategoryColor = (categoryName: string): string => {
    const colorMap: Record<string, string> = {
      'General': '#10B981',
      'VIP': '#F59E0B', 
      'Staff': '#3B82F6',
      'Press': '#8B5CF6',
      'Vendor': '#EF4444'
    };
    return colorMap[categoryName] || '#6B7280';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        validateCSVData(results.data);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
      }
    });
  };

  const validateCSVData = (data: any[]) => {
    const valid: Wristband[] = [];
    const invalid: any[] = [];
    const duplicates: any[] = [];
    const existingNfcIds = new Set(wristbands.map(w => w.nfc_id));
    const csvNfcIds = new Set<string>();

    data.forEach((row, index) => {
      const validation = validateRow(row, index);
      
      if (validation.isValid) {
        const nfcId = validation.wristband!.nfc_id;
        
        // Check for duplicates within CSV
        if (csvNfcIds.has(nfcId)) {
          duplicates.push({ ...row, _index: index, _error: 'Duplicate within CSV' });
          return;
        }
        
        // Check for existing wristbands
        if (existingNfcIds.has(nfcId)) {
          duplicates.push({ ...row, _index: index, _error: 'Already exists in database' });
          return;
        }
        
        csvNfcIds.add(nfcId);
        valid.push(validation.wristband!);
      } else {
        invalid.push({ ...row, _index: index, _error: validation.error });
      }
    });

    setCsvValidation({
      valid,
      invalid,
      duplicates,
      stats: {
        total: data.length,
        valid: valid.length,
        invalid: invalid.length,
        duplicates: duplicates.length
      }
    });
  };

  const validateRow = (row: any, index: number): { isValid: boolean; wristband?: Wristband; error?: string } => {
    // Smart field mapping for different CSV formats
    const nfcId = row['Ticket Number'] || row['Ticket Barcode'] || row['NFC ID'] || row['ID'] || row['ticket_id'];
    const category = row['Ticket Type'] || row['UBL Vibe Pass'] || row['Category'] || row['Type'] || 'General';

    if (!nfcId || nfcId.toString().trim() === '') {
      return { isValid: false, error: 'Missing NFC ID/Ticket Number' };
    }

    // Validate category exists
    const validCategory = categories.find(c => c.name.toLowerCase() === category.toLowerCase()) || 
                         categories.find(c => c.name === 'General');

    if (!validCategory) {
      return { isValid: false, error: `Invalid category: ${category}` };
    }

    return {
      isValid: true,
      wristband: {
        id: '', // Will be generated by database
        nfc_id: nfcId.toString().trim(),
        category: validCategory.name,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        event_id: eventId,
        metadata: {
          purchaser_email: row['Purchaser Email'],
          price_paid: row['Price Paid'],
          order_number: row['Order Number'],
          purchase_date: row['Purchase Date'],
          seat_number: row['Seat Number'],
          team_name: row['Team Name'],
          csv_import: true,
          import_date: new Date().toISOString()
        }
      }
    };
  };

  const importValidWristbands = async () => {
    if (!csvValidation?.valid.length) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('wristbands')
        .insert(csvValidation.valid);

      if (error) throw error;

      await fetchWristbands();
      setShowUpload(false);
      setCsvData([]);
      setCsvValidation(null);
      alert(`Successfully imported ${csvValidation.valid.length} wristbands`);
    } catch (error) {
      console.error('Error importing wristbands:', error);
      alert('Error importing wristbands');
    } finally {
      setUploading(false);
    }
  };

  const bulkUpdateStatus = async (status: 'active' | 'inactive' | 'blocked') => {
    if (selectedWristbands.size === 0) return;

    try {
      const { error } = await supabase
        .from('wristbands')
        .update({ status })
        .in('id', Array.from(selectedWristbands));

      if (error) throw error;

      await fetchWristbands();
      setSelectedWristbands(new Set());
      alert(`Updated ${selectedWristbands.size} wristbands to ${status}`);
    } catch (error) {
      console.error('Error updating wristbands:', error);
      alert('Error updating wristbands');
    }
  };

  const bulkDelete = async () => {
    if (selectedWristbands.size === 0) return;
    
    if (!confirm(`Delete ${selectedWristbands.size} wristbands? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('wristbands')
        .delete()
        .in('id', Array.from(selectedWristbands));

      if (error) throw error;

      await fetchWristbands();
      setSelectedWristbands(new Set());
      alert(`Deleted ${selectedWristbands.size} wristbands`);
    } catch (error) {
      console.error('Error deleting wristbands:', error);
      alert('Error deleting wristbands');
    }
  };

  const exportWristbands = () => {
    const filteredWristbands = getFilteredWristbands();
    const csvData = filteredWristbands.map(w => ({
      'NFC ID': w.nfc_id,
      'Category': w.category,
      'Status': w.status,
      'Created': new Date(w.created_at).toLocaleDateString(),
      'Checked In': w.checked_in_at ? new Date(w.checked_in_at).toLocaleDateString() : 'No',
      'Purchaser Email': w.metadata?.purchaser_email || '',
      'Price Paid': w.metadata?.price_paid || '',
      'Order Number': w.metadata?.order_number || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wristbands-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredWristbands = () => {
    return wristbands.filter(w => {
      const matchesSearch = w.nfc_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           w.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || w.category === filterCategory;
      const matchesStatus = !filterStatus || w.status === filterStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };

  const toggleWristbandSelection = (id: string) => {
    const newSelection = new Set(selectedWristbands);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWristbands(newSelection);
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredWristbands();
    setSelectedWristbands(new Set(filtered.map(w => w.id)));
  };

  const clearSelection = () => {
    setSelectedWristbands(new Set());
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#10B981';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWristbands = getFilteredWristbands();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Wristband Management</h3>
          <p className="text-sm text-gray-600">
            {wristbands.length} total • {filteredWristbands.length} filtered • {selectedWristbands.size} selected
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={exportWristbands}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by NFC ID or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedWristbands.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedWristbands.size} wristbands selected
            </span>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddToSeries(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
              >
                Add to Series
              </button>
              <button
                onClick={() => bulkUpdateStatus('active')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => bulkUpdateStatus('inactive')}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => bulkUpdateStatus('blocked')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Block
              </button>
              <button
                onClick={bulkDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={selectAllFiltered}
            className="text-blue-600 hover:text-blue-800"
          >
            Select All Filtered ({filteredWristbands.length})
          </button>
          <button
            onClick={clearSelection}
            className="text-gray-600 hover:text-gray-800"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Wristbands Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedWristbands.size === filteredWristbands.length && filteredWristbands.length > 0}
                    onChange={selectedWristbands.size === filteredWristbands.length ? clearSelection : selectAllFiltered}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NFC ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWristbands.map((wristband) => (
                <tr key={wristband.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedWristbands.has(wristband.id)}
                      onChange={() => toggleWristbandSelection(wristband.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{wristband.nfc_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getCategoryColor(wristband.category) }}
                    >
                      {wristband.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wristband.status)}`}>
                      {wristband.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(wristband.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {wristband.checked_in_at ? (
                      <span className="text-green-600">
                        {new Date(wristband.checked_in_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not checked in</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Import Wristbands from CSV</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!csvValidation ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Upload CSV File</p>
                    <p className="text-sm text-gray-600">
                      Supports Quicket, Eventbrite, and custom formats
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Supported Fields:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Required:</strong> Ticket Number, Ticket Barcode, NFC ID, or ID</p>
                    <p><strong>Optional:</strong> Ticket Type, Category, Purchaser Email, Price Paid, Order Number</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Validation Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{csvValidation.stats.total}</div>
                    <div className="text-sm text-blue-600">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{csvValidation.stats.valid}</div>
                    <div className="text-sm text-green-600">Valid</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{csvValidation.stats.invalid}</div>
                    <div className="text-sm text-red-600">Invalid</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{csvValidation.stats.duplicates}</div>
                    <div className="text-sm text-yellow-600">Duplicates</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCsvValidation(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Upload Different File
                  </button>
                  
                  {csvValidation.stats.valid > 0 && (
                    <button
                      onClick={importValidWristbands}
                      disabled={uploading}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Import {csvValidation.stats.valid} Valid Wristbands
                    </button>
                  )}
                </div>

                {/* Error Details */}
                {(csvValidation.invalid.length > 0 || csvValidation.duplicates.length > 0) && (
                  <div className="space-y-3">
                    {csvValidation.invalid.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Invalid Rows ({csvValidation.invalid.length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {csvValidation.invalid.slice(0, 5).map((row, i) => (
                            <div key={i} className="text-red-700">
                              Row {row._index + 2}: {row._error}
                            </div>
                          ))}
                          {csvValidation.invalid.length > 5 && (
                            <div className="text-red-600 italic">
                              ... and {csvValidation.invalid.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {csvValidation.duplicates.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Duplicate Rows ({csvValidation.duplicates.length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {csvValidation.duplicates.slice(0, 5).map((row, i) => (
                            <div key={i} className="text-yellow-700">
                              Row {row._index + 2}: {row._error}
                            </div>
                          ))}
                          {csvValidation.duplicates.length > 5 && (
                            <div className="text-yellow-600 italic">
                              ... and {csvValidation.duplicates.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to Series Modal */}
      <AddToSeriesBulkAction
        isOpen={showAddToSeries}
        onClose={() => setShowAddToSeries(false)}
        eventId={eventId}
        selectedWristbandIds={Array.from(selectedWristbands)}
        onSuccess={() => {
          fetchWristbands();
          setSelectedWristbands(new Set());
        }}
      />
    </div>
  );
};

export default EnhancedWristbandManager;
