import React from 'react';
import { CheckinTrend } from '../../services/dashboardService';

interface ActivityChartProps {
  data: CheckinTrend[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  return (
    <div className="h-[300px] w-full bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <div className="text-gray-400 text-lg mb-2">📊</div>
        <h3 className="text-gray-600 font-medium">Activity Chart</h3>
        <p className="text-gray-500 text-sm">Chart temporarily disabled</p>
        <p className="text-gray-400 text-xs mt-1">{data.length} data points available</p>
      </div>
    </div>
  );
};

export default ActivityChart;
