import React from 'react';
import { Compass } from 'lucide-react';

interface TourButtonProps {
  onClick: () => void;
}

const TourButton: React.FC<TourButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[9997] group"
      aria-label="Take Tour"
    >
      {/* Pulsing rings */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-50"></div>

        {/* Main button */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <Compass className="w-5 h-5 animate-spin-slow" />
          <span className="font-semibold text-sm">Take Tour</span>
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
          Learn how to use the portal
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </button>
  );
};

export default TourButton;
