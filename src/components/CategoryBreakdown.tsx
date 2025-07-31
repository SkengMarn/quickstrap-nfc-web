import React from 'react'
import StatProgressBar from './StatProgressBar'

interface CategoryStat {
  category: string;
  totalWristbands: number;
  checkedInWristbands: number;
}

interface CategoryBreakdownProps {
  stats: CategoryStat[];
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ stats }) => {
  // Sort by check-in percentage (highest first)
  const sortedStats = [...stats].sort((a, b) => {
    const percentA =
      a.totalWristbands > 0 ? a.checkedInWristbands / a.totalWristbands : 0
    const percentB =
      b.totalWristbands > 0 ? b.checkedInWristbands / b.totalWristbands : 0
    return percentB - percentA
  })
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="p-6">
        <div className="flex items-center mb-6">
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <h2 className="ml-3 text-xl font-bold text-gray-800">
            Category Breakdown
          </h2>
        </div>
        {stats.length === 0 ? (
          <div className="text-center py-10">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-600">
              No categories found
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedStats.map((stat, index) => {
              const percentage =
                stat.totalWristbands > 0
                  ? (stat.checkedInWristbands / stat.totalWristbands) * 100
                  : 0
              return (
                <div
                  key={stat.category}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {stat.category}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {stat.checkedInWristbands} of {stat.totalWristbands}{' '}
                        checked in
                      </p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                  <StatProgressBar percentage={percentage} index={index} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
export default CategoryBreakdown
