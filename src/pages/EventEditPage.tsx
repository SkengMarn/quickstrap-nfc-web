import React from 'react';
import { useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';

interface EventEditPageProps {
  isSeries?: boolean;
}

const EventEditPage: React.FC<EventEditPageProps> = ({ isSeries = false }) => {
  useParams<{ id: string }>();
  return <EventForm isEdit={true} />;
};

export default EventEditPage;
