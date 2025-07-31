import React from 'react'

interface SummaryCardProps {
  totalWristbands: number;
  checkedInWristbands: number;
  checkinPercentage: number;
  isFiltered: boolean;
  filterCount: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  totalWristbands,
  checkedInWristbands,
  checkinPercentage,
  isFiltered,
  filterCount,
}) => {
  const percentageFormatted = checkinPercentage.toFixed(1)
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-blue-50 p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="ml-3 text-xl font-bold text-gray-800">
              Check-in Summary
            </h2>
          </div>
          {isFiltered && (
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filter Applied ({filterCount})
            </span>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div>
            <div className="text-5xl font-extrabold text-gray-900 tracking-tight">
              {checkedInWristbands}
              <span className="text-gray-400 text-3xl font-bold">
                /{totalWristbands}
              </span>
            </div>
            <p className="mt-1 text-gray-600">attendees checked in</p>
          </div>
          <div className="md:ml-auto text-center md:text-right">
            <div className="text-4xl font-extrabold text-blue-600">
              {percentageFormatted}%
            </div>
            <p className="mt-1 text-gray-600">check-in rate</p>
          </div>
        </div>
        <div className="mt-8 relative">
          <div className="h-3 bg-gray-100 rounded-full">
            <div
              className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, checkinPercentage))}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default SummaryCard
