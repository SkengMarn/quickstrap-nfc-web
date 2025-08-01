import React from 'react';
import { useParams } from 'react-router-dom';
import AccessForm from '../components/AccessForm';

const AccessEditPage: React.FC = () => {
    // The id is not currently used but kept for future use
  useParams<{ id: string }>();
  return <AccessForm isEdit={true} />;
};

export default AccessEditPage;
