import React from 'react';
import { useParams } from 'react-router-dom';
import AccessForm from '../components/AccessForm';

const AccessEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <AccessForm isEdit={true} />;
};

export default AccessEditPage;
