import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Save, Plus, Trash2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

interface CategoryLimit {
  id?: string;
  event_id: string;
  category: string;
  max_wristbands: number;
  created_at?: string;
  updated_at?: string;
}

interface CategoryLimitsManagerProps {
  eventId: string;
}

export default function CategoryLimitsManager({ eventId }: CategoryLimitsManagerProps) {
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchCategoryLimits();
      fetchAvailableCategories();
    }
  }, [eventId]);

  // Fetch existing category limits
  async function fetchCategoryLimits() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_category_limits')
        .select('*')
        .eq('event_id', eventId)
        .order('category');

      if (error) {
        // Table might not exist yet if migration hasn't been run
        if (error.message?.includes('relation') || error.code === '42P01') {
          console.warn('event_category_limits table does not exist yet. Please run the migration.');
          setCategoryLimits([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setCategoryLimits(data || []);
    } catch (error) {
      console.error('Error fetching category limits:', error);
      setCategoryLimits([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch all available categories from wristbands
  async function fetchAvailableCategories() {
    try {
      const { data, error } = await supabase
        .from('wristbands')
        .select('category')
        .eq('event_id', eventId)
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        setAvailableCategories([]);
        return;
      }

      // Get unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map((w) => w.category).filter((c): c is string => c !== null))
      );

      setAvailableCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setAvailableCategories([]);
    }
  }

  // Add a new category limit
  function addCategoryLimit() {
    const unconfiguredCategories = availableCategories.filter(
      (cat) => !categoryLimits.some((limit) => limit.category === cat)
    );

    if (unconfiguredCategories.length === 0) {
      toast.warning('All categories are already configured');
      return;
    }

    const newLimit: CategoryLimit = {
      event_id: eventId,
      category: unconfiguredCategories[0],
      max_wristbands: 1,
    };

    setCategoryLimits([...categoryLimits, newLimit]);
  }

  // Update a category limit value
  function updateCategoryLimit(index: number, field: keyof CategoryLimit, value: any) {
    const updated = [...categoryLimits];
    updated[index] = { ...updated[index], [field]: value };
    setCategoryLimits(updated);
  }

  // Remove a category limit
  function removeCategoryLimit(index: number) {
    setCategoryLimits(categoryLimits.filter((_, i) => i !== index));
  }

  // Save all category limits
  async function saveCategoryLimits() {
    try {
      setSaving(true);

      // Validate
      const hasEmptyCategory = categoryLimits.some((limit) => !limit.category);
      if (hasEmptyCategory) {
        toast.error('Please select a category for all limits');
        return;
      }

      const hasInvalidLimit = categoryLimits.some(
        (limit) => !limit.max_wristbands || limit.max_wristbands < 1
      );
      if (hasInvalidLimit) {
        toast.error('Wristband limits must be at least 1');
        return;
      }

      // Delete all existing limits for this event
      const { error: deleteError } = await supabase
        .from('event_category_limits')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      // Insert new limits
      if (categoryLimits.length > 0) {
        const { error: insertError } = await supabase
          .from('event_category_limits')
          .insert(
            categoryLimits.map((limit) => ({
              event_id: eventId,
              category: limit.category,
              max_wristbands: limit.max_wristbands,
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success('Category limits saved successfully');
      await fetchCategoryLimits();
    } catch (error) {
      console.error('Error saving category limits:', error);
      toast.error('Failed to save category limits');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Wristband Category Limits</h3>
          <p className="text-sm text-gray-600 mt-1">
            Control how many wristbands of each category can be linked to a single ticket
          </p>
        </div>
        <button
          onClick={saveCategoryLimits}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Limits
            </>
          )}
        </button>
      </div>

      <div className="card-body">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How Category Limits Work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Each ticket can be linked to multiple wristbands</li>
                <li>The limit applies per wristband category, not total wristbands</li>
                <li>
                  Example: If VIP limit is 1 and TABLE limit is 5, a ticket can have 1 VIP
                  wristband AND 5 TABLE wristbands
                </li>
                <li>Categories are automatically detected from your uploaded wristbands</li>
              </ul>
            </div>
          </div>
        </div>

        {availableCategories.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No wristband categories found</p>
            <p className="text-sm text-gray-500">
              Upload wristbands first to configure category limits
            </p>
          </div>
        ) : (
          <>
            {/* Category Limits Table */}
            <div className="space-y-3 mb-4">
              {categoryLimits.map((limit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Wristband Category
                    </label>
                    <select
                      value={limit.category}
                      onChange={(e) =>
                        updateCategoryLimit(index, 'category', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Wristbands per Ticket
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={limit.max_wristbands}
                      onChange={(e) =>
                        updateCategoryLimit(
                          index,
                          'max_wristbands',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <button
                    onClick={() => removeCategoryLimit(index)}
                    className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Remove limit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {categoryLimits.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-2">No limits configured yet</p>
                  <p className="text-sm text-gray-400">
                    Click "Add Category Limit" to get started
                  </p>
                </div>
              )}
            </div>

            {/* Add Category Button */}
            {categoryLimits.length < availableCategories.length && (
              <button
                onClick={addCategoryLimit}
                className="btn btn-secondary w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category Limit
              </button>
            )}
          </>
        )}

        {/* Summary */}
        {categoryLimits.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categoryLimits.map((limit) => (
                <div
                  key={limit.category}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200"
                >
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {limit.category}
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {limit.max_wristbands}
                  </p>
                  <p className="text-xs text-gray-600">wristband{limit.max_wristbands !== 1 ? 's' : ''} max</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
