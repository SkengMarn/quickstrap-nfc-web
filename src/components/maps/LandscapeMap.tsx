/**
 * LandscapeMap Component
 * 
 * A React component that displays gates on a map with automatic scaling to show all gates at once.
 * Supports both geographic coordinates (lat/lon) and image-based coordinates (x/y pixels).
 * 
 * Features:
 * - Automatic bounds calculation and fitting
 * - Dynamic scaling to show all gates simultaneously
 * - Support for both geo and image modes
 * - Responsive design for mobile and desktop
 * - Customizable padding, zoom levels, and styling
 * 
 * @example
 * ```tsx
 * <LandscapeMap
 *   gates={[{id:'g1', name:'Gate A', lat:0.3476, lon:32.5825}, ...]}
 *   backgroundImage={{url: "/assets/venue.png", width: 1200, height: 800}} // optional
 *   fitPadding={[80, 40]}
 *   minZoom={2}
 *   maxZoom={18}
 *   onGateClick={(g) => console.log('clicked', g)}
 * />
 * ```
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression, LatLng, Icon } from 'leaflet';
import { MapPin, ZoomIn, Layers, Navigation } from 'lucide-react';
import { geoBoundsForGates, imageBoundsForGates } from '../../utils/fitBoundsUtil';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export type Gate = {
  id: string;
  name?: string;
  // Geographic coordinates
  latitude?: number;
  longitude?: number;
  lat?: number; // alias for latitude
  lon?: number; // alias for longitude
  // Image-space coordinates (pixels)
  x?: number;
  y?: number;
  // Additional properties
  event_id?: string;
  status?: string;
  health_score?: number;
  checkin_count?: number;
};

export type LandscapeMapProps = {
  /** Array of gates to display on the map */
  gates: Gate[];
  /** Optional background image for image mode */
  backgroundImage?: { url: string; width: number; height: number } | null;
  /** Padding around the fitted bounds [horizontal, vertical] */
  fitPadding?: [number, number];
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Callback when a gate marker is clicked */
  onGateClick?: (gate: Gate) => void;
  /** Custom styles for the map container */
  style?: React.CSSProperties;
  /** Show zoom controls */
  showControls?: boolean;
  /** Custom marker icon */
  customIcon?: Icon;
};


/**
 * Component to automatically fit map bounds to show all gates
 */
function FitBoundsController({ 
  bounds, 
  padding, 
  minZoom, 
  maxZoom 
}: { 
  bounds: LatLngBoundsExpression | null; 
  padding: [number, number];
  minZoom: number;
  maxZoom: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!bounds) return;
    
    try {
      // Calculate the zoom level that would fit the bounds
      const boundsZoom = map.getBoundsZoom(bounds as any, false);
      const clampedZoom = Math.min(Math.max(boundsZoom, minZoom), maxZoom);
      
      // Fit bounds with padding and clamped zoom
      map.fitBounds(bounds, { 
        padding: L.point(padding[0], padding[1]),
        maxZoom: clampedZoom
      });
    } catch (err) {
      console.warn('Failed to fit bounds:', err);
      // Fallback: center on first gate if available
      const firstGate = bounds && Array.isArray(bounds) && bounds.length > 0 ? bounds[0] : null;
      if (firstGate && Array.isArray(firstGate)) {
        map.setView(firstGate as [number, number], Math.max(minZoom, 10));
      }
    }
  }, [map, bounds, padding, minZoom, maxZoom]);

  return null;
}

/**
 * Custom gate marker component with status-based styling
 */
function GateMarker({ 
  gate, 
  position, 
  customIcon, 
  onGateClick 
}: { 
  gate: Gate; 
  position: [number, number]; 
  customIcon?: Icon;
  onGateClick?: (gate: Gate) => void;
}) {
  // Create status-based icon
  const getStatusIcon = () => {
    if (customIcon) return customIcon;
    
    const status = gate.status || 'active';
    const health = gate.health_score || 100;
    
    let iconColor = '#10B981'; // green-500
    if (status === 'inactive') iconColor = '#6B7280'; // gray-500
    else if (status === 'maintenance') iconColor = '#F59E0B'; // yellow-500
    else if (health < 70) iconColor = '#EF4444'; // red-500
    else if (health < 90) iconColor = '#F97316'; // orange-500
    
    return new L.DivIcon({
      html: `
        <div style="
          background-color: ${iconColor};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      className: 'custom-gate-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  return (
    <Marker 
      position={position} 
      icon={getStatusIcon()}
      eventHandlers={{ 
        click: () => onGateClick?.(gate)
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h4 className="font-semibold text-gray-900 mb-2">
            {gate.name || gate.id}
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                gate.status === 'active' ? 'text-green-600' :
                gate.status === 'maintenance' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {gate.status || 'Active'}
              </span>
            </div>
            {gate.health_score !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Health:</span>
                <span className="font-medium">{gate.health_score}%</span>
              </div>
            )}
            {gate.checkin_count !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Check-ins:</span>
                <span className="font-medium">{gate.checkin_count}</span>
              </div>
            )}
            <div className="pt-2 border-t text-xs text-gray-500">
              ID: {gate.id}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Map controls overlay
 */
function MapControls({ 
  onZoomToFit, 
  gateCount, 
  isImageMode 
}: { 
  onZoomToFit: () => void;
  gateCount: number;
  isImageMode: boolean;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] space-y-2">
      <div className="bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={(e) => {
            
            // Add visual feedback
            const button = e.target as HTMLElement;
            button.style.backgroundColor = 'lightblue';
            setTimeout(() => {
              button.style.backgroundColor = '';
            }, 200);
            
            onZoomToFit();
          }}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
          title="Zoom to fit all gates"
        >
          <ZoomIn size={16} />
          <span>Fit All ({gateCount})</span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center space-x-2 mb-2">
          <MapPin size={14} className="text-blue-500" />
          <span className="font-medium">{gateCount} Gates</span>
        </div>
        <div className="flex items-center space-x-2">
          <Layers size={14} className="text-gray-500" />
          <span className="text-gray-600">
            {isImageMode ? 'Image Mode' : 'Geographic'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main LandscapeMap component
 */
export default function LandscapeMap({
  gates,
  backgroundImage = null,
  fitPadding = [80, 40],
  minZoom = 1,
  maxZoom = 18,
  onGateClick,
  style,
  showControls = true,
  customIcon,
}: LandscapeMapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const isImageMode = !!backgroundImage;

  // Default center and zoom
  const defaultCenter: [number, number] = isImageMode 
    ? [backgroundImage!.height / 2, backgroundImage!.width / 2] 
    : [0, 0];
  const defaultZoom = Math.max(minZoom, 3);

  // Compute bounds using utility functions with safety checks
  const safeGates = gates || [];
  let geoBounds = null;
  let imageBounds = null;
  
  try {
    geoBounds = !isImageMode && safeGates.length > 0 ? geoBoundsForGates(safeGates) : null;
    imageBounds = isImageMode && safeGates.length > 0 && backgroundImage ? imageBoundsForGates(safeGates, backgroundImage) : null;
  } catch (error) {
    console.warn('Error computing bounds:', error);
    geoBounds = null;
    imageBounds = null;
  }
  
  const activeBounds = isImageMode ? imageBounds : geoBounds;

  // Prepare markers
  const markers = safeGates.map((g) => {
    if (isImageMode && typeof g.x === 'number' && typeof g.y === 'number') {
      // Convert pixel coords to map coords: [y, x]
      return { id: g.id, pos: [g.y, g.x] as [number, number], gate: g };
    }
    
    const lat = g.latitude ?? g.lat;
    const lon = g.longitude ?? g.lon;
    if (!isImageMode && typeof lat === 'number' && typeof lon === 'number') {
      return { id: g.id, pos: [lat, lon] as [number, number], gate: g };
    }
    
    return null;
  }).filter(Boolean) as { id: string; pos: [number, number]; gate: Gate }[];


  // Map configuration
  const mapProps = isImageMode
    ? {
        crs: L.CRS.Simple,
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom,
        maxZoom,
        scrollWheelZoom: true,
        zoomControl: false, // We'll add custom controls
      }
    : {
        center: markers.length > 0 ? markers[0].pos : [0.35, 32.6] as [number, number], // Use first marker or Uganda coords
        zoom: markers.length > 0 ? 15 : defaultZoom, // Higher zoom for markers
        minZoom,
        maxZoom,
        scrollWheelZoom: true,
        zoomControl: false,
      };

  // Container styling
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 400,
    position: 'relative',
    ...style,
  };

  // Handle zoom to fit
  const handleZoomToFit = useCallback(() => {
    if (!mapInstance) {
      return;
    }
    
    if (markers.length === 0) {
      return;
    }
    
    try {
      // Create bounds from all markers
      const group = new L.FeatureGroup(markers.map(m => L.marker(m.pos)));
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, {
          padding: L.point(fitPadding[0], fitPadding[1]),
          maxZoom: 16 // Good zoom level for gates
        });
      } else {
        mapInstance.setView(markers[0].pos, 15);
      }
    } catch (err) {
      console.warn('Failed to zoom to fit:', err);
      // Fallback: center on first marker
      if (markers.length > 0) {
        mapInstance.setView(markers[0].pos, 15);
      }
    }
  }, [mapInstance, markers, fitPadding]);

  // Auto-fit bounds when map and markers are ready
  useEffect(() => {
    if (mapInstance && markers.length > 0) {
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        handleZoomToFit();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for when condition is not met
  }, [mapInstance, markers.length]);

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

  if (markers.length === 0) {
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
      {isImageMode ? (
        // Image mode: CRS.Simple with ImageOverlay
        <MapContainer
          {...mapProps}
          style={{ width: '100%', height: '100%' }}
          ref={setMapInstance}
        >
          <ImageOverlay
            url={backgroundImage!.url}
            bounds={[[0, 0], [backgroundImage!.height, backgroundImage!.width]]}
            interactive={false}
          />

          <FitBoundsController 
            bounds={imageBounds} 
            padding={fitPadding}
            minZoom={minZoom}
            maxZoom={maxZoom}
          />

          {markers.map((m) => (
            <GateMarker
              key={m.id}
              gate={m.gate}
              position={m.pos}
              customIcon={customIcon}
              onGateClick={onGateClick}
            />
          ))}
        </MapContainer>
      ) : (
        // Geographic mode: Standard map with tiles
        <MapContainer
          {...mapProps}
          style={{ width: '100%', height: '100%' }}
          ref={setMapInstance}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <FitBoundsController 
            bounds={geoBounds} 
            padding={fitPadding}
            minZoom={minZoom}
            maxZoom={maxZoom}
          />

          {markers.map((m) => (
            <GateMarker
              key={m.id}
              gate={m.gate}
              position={m.pos}
              customIcon={customIcon}
              onGateClick={onGateClick}
            />
          ))}
        </MapContainer>
      )}

      {/* Custom Controls */}
      {showControls && (
        <MapControls
          onZoomToFit={handleZoomToFit}
          gateCount={markers.length}
          isImageMode={isImageMode}
        />
      )}
    </div>
  );
}
