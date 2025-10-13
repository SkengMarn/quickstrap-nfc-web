import React from 'react';
import { LocationData } from '../../services/dashboardService';
import SecureLocationHeatmap from './SecureLocationHeatmap';

interface LocationHeatmapProps {
  data: LocationData[];
  title: string;
}

export const LocationHeatmap: React.FC<LocationHeatmapProps> = ({ data, title }) => {
  // SECURITY FIX: Use secure canvas-based implementation instead of vulnerable react-simple-maps
  return <SecureLocationHeatmap data={data} title={title} />;
};
