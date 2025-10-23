/**
 * SimpleLandscapeMap Component
 * 
 * A simplified version of the map component that avoids react-leaflet compatibility issues
 * Uses vanilla Leaflet with React refs for better compatibility
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export type SimpleGate = {
  id: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  x?: number;
  y?: number;
  status?: string;
  health_score?: number;
  checkin_count?: number;
};

export type SimpleLandscapeMapProps = {
  gates: SimpleGate[];
  backgroundImage?: { url: string; width: number; height: number } | null;
  fitPadding?: [number, number];
  minZoom?: number;
  maxZoom?: number;
  onGateClick?: (gate: SimpleGate) => void;
  style?: React.CSSProperties;
  showControls?: boolean;
};

export default function SimpleLandscapeMap({
  gates = [],
  backgroundImage = null,
  fitPadding = [80, 40],
  minZoom = 1,
  maxZoom = 18,
  onGateClick,
  style,
  showControls = true,
}: SimpleLandscapeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const isImageMode = !!backgroundImage;
  const safeGates = gates || [];

  // Container styling
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 400,
    position: 'relative',
    ...style,
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      let map: L.Map;

      if (isImageMode && backgroundImage) {
        // Image mode with CRS.Simple
        const bounds: L.LatLngBoundsExpression = [
          [0, 0],
          [backgroundImage.height, backgroundImage.width]
        ];

        map = L.map(mapRef.current, {
          crs: L.CRS.Simple,
          minZoom,
          maxZoom,
          zoomControl: false,
        });

        // Add image overlay
        L.imageOverlay(backgroundImage.url, bounds).addTo(map);

        // Set initial view
        map.fitBounds(bounds);
      } else {
        // Geographic mode
        map = L.map(mapRef.current, {
          minZoom,
          maxZoom,
          zoomControl: false,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Set default view
        map.setView([0, 0], Math.max(minZoom, 3));
      }

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [isImageMode, backgroundImage, minZoom, maxZoom]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;


    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    if (safeGates.length === 0) return;

    const validGates: Array<{ gate: SimpleGate; position: [number, number] }> = [];

    // Process gates and create markers
    safeGates.forEach((gate) => {
      let position: [number, number] | null = null;

      if (isImageMode && typeof gate.x === 'number' && typeof gate.y === 'number') {
        // Image coordinates: [y, x] for Leaflet CRS.Simple
        position = [gate.y, gate.x];
      } else if (!isImageMode) {
        const lat = gate.latitude ?? gate.lat;
        const lon = gate.longitude ?? gate.lon;
        if (typeof lat === 'number' && typeof lon === 'number') {
          position = [lat, lon];
        }
      }

      if (position) {
        validGates.push({ gate, position });

        // Create marker
        const marker = L.marker(position)
          .bindPopup(`
            <div style="padding: 8px; min-width: 150px;">
              <h4 style="margin: 0 0 8px 0; font-weight: 600;">${gate.name || gate.id}</h4>
              <div style="font-size: 12px; line-height: 1.4;">
                <div><strong>Status:</strong> ${gate.status || 'Active'}</div>
                ${gate.health_score !== undefined ? `<div><strong>Health:</strong> ${gate.health_score}%</div>` : ''}
                ${gate.checkin_count !== undefined ? `<div><strong>Check-ins:</strong> ${gate.checkin_count}</div>` : ''}
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; color: #666; font-size: 10px;">
                  ID: ${gate.id}
                </div>
              </div>
            </div>
          `)
          .on('click', () => {
            if (onGateClick) {
              onGateClick(gate);
            }
          });

        marker.addTo(map);
        markersRef.current.push(marker);
      }
    });

    // Fit bounds to show all markers
    if (validGates.length > 0) {
      try {
        const group = new L.FeatureGroup(markersRef.current);
        const bounds = group.getBounds();
        
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: L.point(fitPadding[0], fitPadding[1]),
            maxZoom: maxZoom - 2 // Leave some room for zooming
          });
        }
      } catch (error) {
        console.warn('Error fitting bounds:', error);
      }
    }
  }, [safeGates, isImageMode, onGateClick, fitPadding, maxZoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle edge cases
  if (safeGates.length === 0) {
    return (
      <div style={containerStyle} className="flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Gates Available</h3>
          <p className="text-gray-500">
            Add gates with coordinates to see them on the map.
          </p>
        </div>
      </div>
    );
  }

  const validGatesCount = safeGates.filter(g => {
    if (isImageMode) {
      return typeof g.x === 'number' && typeof g.y === 'number';
    } else {
      const lat = g.latitude ?? g.lat;
      const lon = g.longitude ?? g.lon;
      return typeof lat === 'number' && typeof lon === 'number';
    }
  }).length;

  if (validGatesCount === 0) {
    return (
      <div style={containerStyle} className="flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Navigation className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Coordinates Available</h3>
          <p className="text-gray-500">
            Gates don't have {isImageMode ? 'x/y pixel' : 'latitude/longitude'} coordinates yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%' }}
        className="leaflet-container"
      />
      
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] space-y-2">
          <div className="bg-white rounded-lg shadow-lg p-2">
            <button
              onClick={() => {
                const map = mapInstanceRef.current;
                if (map && markersRef.current.length > 0) {
                  try {
                    const group = new L.FeatureGroup(markersRef.current);
                    const bounds = group.getBounds();
                    if (bounds.isValid()) {
                      map.fitBounds(bounds, {
                        padding: L.point(fitPadding[0], fitPadding[1]),
                        maxZoom: maxZoom - 2
                      });
                    }
                  } catch (error) {
                    console.warn('Error fitting bounds:', error);
                  }
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
              title="Zoom to fit all gates"
            >
              <MapPin size={16} />
              <span>Fit All</span>
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-3 text-xs">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin size={14} className="text-blue-500" />
              <span className="font-medium">{validGatesCount} Gates</span>
            </div>
            <div className="flex items-center space-x-2">
              <Navigation size={14} className="text-gray-500" />
              <span className="text-gray-600">
                {isImageMode ? 'Image Mode' : 'Geographic'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
