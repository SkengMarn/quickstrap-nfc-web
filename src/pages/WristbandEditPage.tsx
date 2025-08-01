import React from 'react';
import { useParams } from 'react-router-dom';
import WristbandForm from '../components/WristbandForm';

const WristbandEditPage: React.FC = () => {
    // The id is not currently used but kept for future use
  useParams<{ id: string }>();
  return <WristbandForm isEdit={true} />;
};

export default WristbandEditPage;
