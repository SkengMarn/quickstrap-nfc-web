/**
 * Secure Location Heatmap Component
 * Replaces react-simple-maps with a secure canvas-based implementation
 */

import React, { useEffect, useRef, useState } from 'react';
import { LocationData } from '../../services/dashboardService';

interface SecureLocationHeatmapProps {
  data: LocationData[];
  title?: string;
}

interface LocationPoint {
  x: number;
  y: number;
  intensity: number;
  label: string;
}

const SecureLocationHeatmap: React.FC<SecureLocationHeatmapProps> = ({ 
  data, 
  title = "Location Activity Heatmap" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);

  // Convert location data to normalized coordinates
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Since LocationData doesn't have lat/lng, create a simple grid layout
    const points: LocationPoint[] = data.map((d, index) => {
      const cols = Math.ceil(Math.sqrt(data.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const padding = 80;
      const cellWidth = (dimensions.width - 2 * padding) / cols;
      const cellHeight = (dimensions.height - 2 * padding) / Math.ceil(data.length / cols);
      
      return {
        x: padding + col * cellWidth + cellWidth / 2,
        y: padding + row * cellHeight + cellHeight / 2,
        intensity: d.checkins || 1,
        label: d.location || 'Unknown'
      };
    });

    setLocationPoints(points);
  }, [data, dimensions]);

  // Draw heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || locationPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw world outline (simplified)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, dimensions.width - 100, dimensions.height - 100);

    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 10; i++) {
      const x = 50 + (i * (dimensions.width - 100)) / 10;
      const y = 50 + (i * (dimensions.height - 100)) / 10;
      
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, dimensions.height - 50);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(dimensions.width - 50, y);
      ctx.stroke();
    }

    // Find max intensity for normalization
    const maxIntensity = Math.max(...locationPoints.map(p => p.intensity));

    // Draw heatmap points
    locationPoints.forEach(point => {
      const normalizedIntensity = point.intensity / maxIntensity;
      const radius = 8 + (normalizedIntensity * 12); // 8-20px radius
      
      // Create radial gradient for heatmap effect
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      );
      
      // Color based on intensity (blue to red)
      const alpha = 0.3 + (normalizedIntensity * 0.5);
      if (normalizedIntensity > 0.7) {
        gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`); // Red
        gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);
      } else if (normalizedIntensity > 0.4) {
        gradient.addColorStop(0, `rgba(245, 158, 11, ${alpha})`); // Orange
        gradient.addColorStop(1, `rgba(245, 158, 11, 0)`);
      } else {
        gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`); // Blue
        gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw point center
      ctx.fillStyle = normalizedIntensity > 0.7 ? '#dc2626' : 
                     normalizedIntensity > 0.4 ? '#d97706' : '#2563eb';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [locationPoints, dimensions]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: Math.min(800, rect.width - 20),
          height: 400
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium mb-4 text-center">{title}</h3>
      <div className="w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
        <span>{data.length} locations with activity</span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureLocationHeatmap;
