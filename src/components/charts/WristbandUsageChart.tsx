import React from 'react';
import { WristbandUsage } from '../../services/dashboardService';

interface WristbandUsageChartProps {
  data: WristbandUsage[];
  title: string;
}

export const WristbandUsageChart: React.FC<WristbandUsageChartProps> = ({ data, title }) => {
  return (
    <div className="h-[300px] w-full bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <div className="text-gray-400 text-lg mb-2">📊</div>
        <h3 className="text-gray-600 font-medium">{title}</h3>
        <p className="text-gray-500 text-sm">Chart temporarily disabled</p>
        <p className="text-gray-400 text-xs mt-1">{data.length} categories available</p>
      </div>
    </div>
  );
};
