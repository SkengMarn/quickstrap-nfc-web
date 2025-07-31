import React from 'react';
import { useParams } from 'react-router-dom';
import WristbandForm from '../components/WristbandForm';

const WristbandEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <WristbandForm isEdit={true} />;
};

export default WristbandEditPage;
