import React from 'react';
import { useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';

const EventEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <EventForm isEdit={true} />;
};

export default EventEditPage;
