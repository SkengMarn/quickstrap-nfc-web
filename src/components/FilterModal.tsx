import React, { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategories: Set<string>;
  onApplyFilter: (selected: Set<string>) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategories,
  onApplyFilter,
}) => {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  // Sync with parent selected categories when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(new Set(selectedCategories))
    }
  }, [isOpen, selectedCategories])
  
  if (!isOpen) return null
  
  const toggleCategory = (category: string): void => {
    const newSelected = new Set(localSelected)
    if (newSelected.has(category)) {
      newSelected.delete(category)
    } else {
      newSelected.add(category)
    }
    setLocalSelected(newSelected)
  }
  // Apply the selected filters and close the modal
  onApplyFilter(localSelected)
  onClose()
  const toggleAll = (): void => {
    if (localSelected.size === categories.length) {
      setLocalSelected(new Set())
    } else {
      setLocalSelected(new Set(categories))
    }
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>
        <div className="relative inline-block w-full max-w-md p-6 my-8 bg-white rounded-2xl shadow-xl transform transition-all">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-bold text-gray-800">
                Filter Categories
              </h3>
            </div>
            <p className="text-sm text-gray-500">
              Select which ticket categories to include in the statistics.
            </p>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {/* Select All option */}
            <div
              onClick={toggleAll}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border ${localSelected.size === categories.length && categories.length > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded border ${localSelected.size === categories.length && categories.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}
                >
                  {localSelected.size === categories.length &&
                    categories.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                </div>
                <span className="ml-3 font-medium">Select All</span>
              </div>
            </div>
            {/* Category list */}
            {categories.map((category) => (
              <div
                key={category}
                onClick={() => toggleCategory(category)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border ${localSelected.has(category) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 flex items-center justify-center rounded border ${localSelected.has(category) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}
                  >
                    {localSelected.has(category) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="ml-3">{category}</span>
                </div>
                {localSelected.has(category) && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyFilter(localSelected)
                onClose()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default FilterModal
