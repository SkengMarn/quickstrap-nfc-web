import React from 'react';

const NotificationTestPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Test Page</h1>
        
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">🔔</div>
            <h3 className="text-gray-600 font-medium">Notification Testing</h3>
            <p className="text-gray-500 text-sm">Component temporarily disabled</p>
            <p className="text-gray-400 text-xs mt-1">Bootstrap dependencies removed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage;
