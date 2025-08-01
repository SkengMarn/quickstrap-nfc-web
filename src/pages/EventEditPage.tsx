import React from 'react';
import { useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';

const EventEditPage: React.FC = () => {
    // The id is not currently used but kept for future use
  useParams<{ id: string }>();
  return <EventForm isEdit={true} />;
};

export default EventEditPage;
