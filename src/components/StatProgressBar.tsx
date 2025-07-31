import React, { useEffect, useState } from 'react'

interface StatProgressBarProps {
  percentage: number;
  index: number;
}

const StatProgressBar: React.FC<StatProgressBarProps> = ({ percentage, index }) => {
  const [width, setWidth] = useState(0)
  // Colors based on percentage
  const getColor = (percent: number): string => {
    if (percent >= 75) return 'from-green-500 to-green-600'
    if (percent >= 50) return 'from-blue-500 to-blue-600'
    if (percent >= 25) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }
  // Animate on mount with delay based on index
  useEffect(() => {
    const timer = setTimeout(
      () => {
        setWidth(percentage)
      },
      300 + index * 100,
    )
    return () => clearTimeout(timer)
  }, [percentage, index])
  return (
    <div className="relative mt-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor(percentage)} transition-all duration-1000 ease-out`}
          style={{
            width: `${Math.min(100, Math.max(0, width))}%`,
          }}
        />
      </div>
    </div>
  )
}
export default StatProgressBar
