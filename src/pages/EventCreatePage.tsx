import React from 'react';
import EventCreationWizard from '../components/events/EventCreationWizard';

const EventCreatePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600 mt-1">Configure your event settings before launch</p>
        </div>
        
        <EventCreationWizard />
      </div>
    </div>
  );
};

export default EventCreatePage;
