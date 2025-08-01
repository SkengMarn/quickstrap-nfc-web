import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, RefreshCw, Filter } from 'lucide-react';
import SummaryCard from './SummaryCard';
import CategoryBreakdown from './CategoryBreakdown';
import FilterModal from './FilterModal';
// Mock data for demo purposes
const mockCategories = ['VIP', 'General Admission', 'Staff', 'Media', 'Artist']
const mockStats = [
  {
    category: 'VIP',
    totalWristbands: 250,
    checkedInWristbands: 187,
  },
  {
    category: 'General Admission',
    totalWristbands: 1500,
    checkedInWristbands: 1023,
  },
  {
    category: 'Staff',
    totalWristbands: 100,
    checkedInWristbands: 95,
  },
  {
    category: 'Media',
    totalWristbands: 50,
    checkedInWristbands: 34,
  },
  {
    category: 'Artist',
    totalWristbands: 75,
    checkedInWristbands: 68,
  },
]

interface CategoryStat {
  category: string;
  totalWristbands: number;
  checkedInWristbands: number;
}

interface EventStatsScreenProps {
  eventId: string;
}

const EventStatsScreen: React.FC<EventStatsScreenProps> = ({ eventId }) => {
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [, setFilterCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate summary data based on selected filters
  const filteredStats: CategoryStat[] =
    selectedCategories.size > 0
      ? stats.filter((stat) => selectedCategories.has(stat.category))
      : stats

  const totalWristbands = filteredStats.reduce(
    (sum, stat) => sum + stat.totalWristbands,
    0,
  )
  const checkedInWristbands = filteredStats.reduce(
    (sum, stat) => sum + stat.checkedInWristbands,
    0,
  )
  const checkinPercentage =
    totalWristbands > 0 ? (checkedInWristbands / totalWristbands) * 100 : 0

  // Load data function
  const loadData = useCallback(
    async (isManual = false): Promise<void> => {
      if (isManual) {
        setIsRefreshing(true)
      }
      try {
        // In a real app, this would be an API call
        // Simulating API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCategories(mockCategories)
        setStats(mockStats)
        setError(null)
        setLastRefresh(new Date())
      } catch (err) {
        setError('Failed to load stats data. Please try again.')
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [eventId],
  )

  // Initial data load
  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData()
    }, 30000)
    return () => clearInterval(refreshInterval)
  }, [loadData])

  // Export to CSV function
  const exportToCsv = (): void => {
    if (stats.length === 0) {
      showToast('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Category', 'Total Wristbands', 'Checked In', 'Check-in %'];
    const rows = stats.map(stat => {
      const percentage = stat.totalWristbands > 0 
        ? (stat.checkedInWristbands / stat.totalWristbands * 100).toFixed(2) + '%'
        : '0%';
      return [
        stat.category,
        stat.totalWristbands.toString(),
        stat.checkedInWristbands.toString(),
        percentage
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `event-stats-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showToast = (message: string): void => {
    // In a real app, you'd use a toast library
    alert(message)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Event Statistics</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => exportToCsv()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Export to CSV"
          >
            <ArrowDownToLine className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${selectedCategories.size > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
            title="Filter Categories"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={() => loadData(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Refresh Data"
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </header>
      {isLoading && stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      ) : error && stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <svg
              className="h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <SummaryCard
              totalWristbands={totalWristbands}
              checkedInWristbands={checkedInWristbands}
              checkinPercentage={checkinPercentage}
              isFiltered={selectedCategories.size > 0}
              filterCount={selectedCategories.size}
            />
            <CategoryBreakdown stats={filteredStats} />
          </div>
          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-6 text-center">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        selectedCategories={selectedCategories}
        onApplyFilter={(selected: Set<string>) => {
          setSelectedCategories(selected);
          setFilterCount(selected.size);
        }}
      />
    </div>
  );
};

export default EventStatsScreen;
