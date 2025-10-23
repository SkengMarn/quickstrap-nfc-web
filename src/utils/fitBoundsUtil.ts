/**
 * Utility functions for calculating map bounds from gate coordinates
 * Used for testing and deterministic bounds calculation
 */

import L from 'leaflet';
import { Gate } from '../components/maps/LandscapeMap';

/**
 * Calculate geographic bounds for gates with lat/lon coordinates
 * @param gates Array of gates with latitude/longitude coordinates
 * @returns Leaflet LatLngBounds object or null if no valid coordinates
 */
export function geoBoundsForGates(gates: Gate[]) {
  const latlngs = gates
    .filter(g => {
      const lat = g.latitude ?? g.lat;
      const lon = g.longitude ?? g.lon;
      return typeof lat === 'number' && typeof lon === 'number';
    })
    .map(g => {
      const lat = g.latitude ?? g.lat;
      const lon = g.longitude ?? g.lon;
      return [lat as number, lon as number];
    });

  if (!latlngs.length) return null;
  
  const bounds = L.latLngBounds(latlngs as any);
  
  // Add minimum bounds size to prevent over-zooming on clustered gates
  const minBoundsSize = 0.001; // ~100 meters
  const center = bounds.getCenter();
  const currentSize = Math.max(
    bounds.getNorth() - bounds.getSouth(), 
    bounds.getEast() - bounds.getWest()
  );
  
  if (currentSize < minBoundsSize) {
    const padding = minBoundsSize / 2;
    return L.latLngBounds([
      [center.lat - padding, center.lng - padding],
      [center.lat + padding, center.lng + padding]
    ]);
  }
  
  return bounds;
}

/**
 * Calculate image bounds for gates with x/y pixel coordinates
 * @param gates Array of gates with x/y pixel coordinates
 * @param imageSize Optional image dimensions for bounds clamping
 * @returns Bounds array in [[minY, minX], [maxY, maxX]] format or null
 */
export function imageBoundsForGates(gates: Gate[], imageSize?: { width: number; height: number }) {
  const pts = gates.filter(g => typeof g.x === 'number' && typeof g.y === 'number');
  if (!pts.length) return null;

  const xs = pts.map(p => p.x as number);
  const ys = pts.map(p => p.y as number);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  // Add minimum bounds size for clustered gates
  const minBoundsSize = 50; // 50 pixels
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const currentSizeX = maxX - minX;
  const currentSizeY = maxY - minY;

  if (currentSizeX < minBoundsSize) {
    const padding = minBoundsSize / 2;
    minX = centerX - padding;
    maxX = centerX + padding;
  }

  if (currentSizeY < minBoundsSize) {
    const padding = minBoundsSize / 2;
    minY = centerY - padding;
    maxY = centerY + padding;
  }

  // Clamp to image bounds if provided
  if (imageSize) {
    minX = Math.max(0, minX);
    maxX = Math.min(imageSize.width, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(imageSize.height, maxY);
  }

  // Return in Leaflet CRS.Simple format: [[y, x], [y, x]]
  return [[minY, minX], [maxY, maxX]] as any;
}

/**
 * Calculate the center point of a set of gates
 * @param gates Array of gates
 * @param isImageMode Whether to use x/y or lat/lon coordinates
 * @returns Center point as [lat, lon] or [y, x] or null
 */
export function getCenterPoint(gates: Gate[], isImageMode: boolean = false): [number, number] | null {
  if (isImageMode) {
    const pts = gates.filter(g => typeof g.x === 'number' && typeof g.y === 'number');
    if (!pts.length) return null;
    
    const avgX = pts.reduce((sum, p) => sum + (p.x as number), 0) / pts.length;
    const avgY = pts.reduce((sum, p) => sum + (p.y as number), 0) / pts.length;
    return [avgY, avgX];
  } else {
    const pts = gates.filter(g => {
      const lat = g.latitude ?? g.lat;
      const lon = g.longitude ?? g.lon;
      return typeof lat === 'number' && typeof lon === 'number';
    });
    if (!pts.length) return null;
    
    const avgLat = pts.reduce((sum, p) => sum + ((p.latitude ?? p.lat) as number), 0) / pts.length;
    const avgLon = pts.reduce((sum, p) => sum + ((p.longitude ?? p.lon) as number), 0) / pts.length;
    return [avgLat, avgLon];
  }
}

/**
 * Calculate the optimal zoom level for a given bounds and map size
 * @param bounds Leaflet bounds object
 * @param mapSize Map container size {width, height}
 * @param padding Padding to apply
 * @returns Optimal zoom level
 */
export function calculateOptimalZoom(
  bounds: L.LatLngBounds, 
  mapSize: { width: number; height: number }, 
  padding: [number, number] = [0, 0]
): number {
  // Calculate bounds dimensions
  const boundsWidth = bounds.getEast() - bounds.getWest();
  const boundsHeight = bounds.getNorth() - bounds.getSouth();
  
  const paddedMapSize = {
    width: mapSize.width - padding[0] * 2,
    height: mapSize.height - padding[1] * 2
  };
  
  // Calculate zoom based on bounds size vs map size
  const zoomX = Math.log2(paddedMapSize.width / boundsWidth);
  const zoomY = Math.log2(paddedMapSize.height / boundsHeight);
  
  // Use the more restrictive zoom level
  return Math.floor(Math.min(zoomX, zoomY));
}

/**
 * Check if gates are clustered (within a small area)
 * @param gates Array of gates
 * @param threshold Distance threshold for clustering
 * @param isImageMode Whether to use pixel or geographic coordinates
 * @returns True if gates are clustered
 */
export function areGatesClustered(
  gates: Gate[], 
  threshold: number = 0.001, // ~100m for geo, 100px for image
  isImageMode: boolean = false
): boolean {
  if (gates.length < 2) return false;
  
  if (isImageMode) {
    const pts = gates.filter(g => typeof g.x === 'number' && typeof g.y === 'number');
    if (pts.length < 2) return false;
    
    const xs = pts.map(p => p.x as number);
    const ys = pts.map(p => p.y as number);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);
    
    return Math.max(rangeX, rangeY) < threshold;
  } else {
    const pts = gates.filter(g => {
      const lat = g.latitude ?? g.lat;
      const lon = g.longitude ?? g.lon;
      return typeof lat === 'number' && typeof lon === 'number';
    });
    if (pts.length < 2) return false;
    
    const lats = pts.map(p => (p.latitude ?? p.lat) as number);
    const lons = pts.map(p => (p.longitude ?? p.lon) as number);
    const rangeLat = Math.max(...lats) - Math.min(...lats);
    const rangeLon = Math.max(...lons) - Math.min(...lons);
    
    return Math.max(rangeLat, rangeLon) < threshold;
  }
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param lat1 First point latitude
 * @param lon1 First point longitude
 * @param lat2 Second point latitude
 * @param lon2 Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate pixel distance between two points
 * @param x1 First point x coordinate
 * @param y1 First point y coordinate
 * @param x2 Second point x coordinate
 * @param y2 Second point y coordinate
 * @returns Distance in pixels
 */
export function calculatePixelDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Find the nearest gate to a given point
 * @param targetGate Gate to find nearest neighbor for
 * @param gates Array of gates to search
 * @param isImageMode Whether to use pixel or geographic coordinates
 * @returns Nearest gate and distance, or null if no valid gates
 */
export function findNearestGate(
  targetGate: Gate, 
  gates: Gate[], 
  isImageMode: boolean = false
): { gate: Gate; distance: number } | null {
  const otherGates = gates.filter(g => g.id !== targetGate.id);
  if (otherGates.length === 0) return null;

  let nearestGate: Gate | null = null;
  let minDistance = Infinity;

  if (isImageMode) {
    const targetX = targetGate.x;
    const targetY = targetGate.y;
    if (typeof targetX !== 'number' || typeof targetY !== 'number') return null;

    for (const gate of otherGates) {
      if (typeof gate.x === 'number' && typeof gate.y === 'number') {
        const distance = calculatePixelDistance(targetX, targetY, gate.x, gate.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestGate = gate;
        }
      }
    }
  } else {
    const targetLat = targetGate.latitude ?? targetGate.lat;
    const targetLon = targetGate.longitude ?? targetGate.lon;
    if (typeof targetLat !== 'number' || typeof targetLon !== 'number') return null;

    for (const gate of otherGates) {
      const lat = gate.latitude ?? gate.lat;
      const lon = gate.longitude ?? gate.lon;
      if (typeof lat === 'number' && typeof lon === 'number') {
        const distance = calculateDistance(targetLat, targetLon, lat, lon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestGate = gate;
        }
      }
    }
  }

  return nearestGate ? { gate: nearestGate, distance: minDistance } : null;
}

/**
 * Get bounds that include all gates with optional padding
 * @param gates Array of gates
 * @param isImageMode Whether to use pixel or geographic coordinates
 * @param imageSize Optional image dimensions for image mode
 * @param paddingPercent Padding as percentage of bounds size (0.1 = 10%)
 * @returns Bounds object or null
 */
export function getBoundsWithPadding(
  gates: Gate[], 
  isImageMode: boolean = false, 
  imageSize?: { width: number; height: number },
  paddingPercent: number = 0.1
): L.LatLngBounds | [[number, number], [number, number]] | null {
  if (isImageMode) {
    const bounds = imageBoundsForGates(gates, imageSize);
    if (!bounds) return null;

    const [[minY, minX], [maxY, maxX]] = bounds;
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const padX = sizeX * paddingPercent;
    const padY = sizeY * paddingPercent;

    return [
      [Math.max(0, minY - padY), Math.max(0, minX - padX)],
      [
        imageSize ? Math.min(imageSize.height, maxY + padY) : maxY + padY,
        imageSize ? Math.min(imageSize.width, maxX + padX) : maxX + padX
      ]
    ] as [[number, number], [number, number]];
  } else {
    const bounds = geoBoundsForGates(gates);
    if (!bounds) return null;

    // Use Leaflet's built-in pad method which handles padding correctly
    return bounds.pad(paddingPercent);
  }
}

/**
 * Validate gate coordinates and return validation results
 * @param gates Array of gates to validate
 * @param isImageMode Whether to validate pixel or geographic coordinates
 * @param imageSize Optional image dimensions for bounds checking
 * @returns Validation results with valid/invalid gates and error messages
 */
export function validateGateCoordinates(
  gates: Gate[], 
  isImageMode: boolean = false,
  imageSize?: { width: number; height: number }
): {
  valid: Gate[];
  invalid: Array<{ gate: Gate; error: string }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    validPercentage: number;
  };
} {
  const valid: Gate[] = [];
  const invalid: Array<{ gate: Gate; error: string }> = [];

  for (const gate of gates) {
    if (isImageMode) {
      if (typeof gate.x !== 'number' || typeof gate.y !== 'number') {
        invalid.push({ gate, error: 'Missing x/y coordinates' });
        continue;
      }
      
      if (imageSize) {
        if (gate.x < 0 || gate.x > imageSize.width || gate.y < 0 || gate.y > imageSize.height) {
          invalid.push({ gate, error: 'Coordinates outside image bounds' });
          continue;
        }
      }
      
      valid.push(gate);
    } else {
      const lat = gate.latitude ?? gate.lat;
      const lon = gate.longitude ?? gate.lon;
      
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        invalid.push({ gate, error: 'Missing latitude/longitude coordinates' });
        continue;
      }
      
      if (lat < -90 || lat > 90) {
        invalid.push({ gate, error: 'Invalid latitude (must be -90 to 90)' });
        continue;
      }
      
      if (lon < -180 || lon > 180) {
        invalid.push({ gate, error: 'Invalid longitude (must be -180 to 180)' });
        continue;
      }
      
      valid.push(gate);
    }
  }

  return {
    valid,
    invalid,
    summary: {
      total: gates.length,
      valid: valid.length,
      invalid: invalid.length,
      validPercentage: gates.length > 0 ? (valid.length / gates.length) * 100 : 0
    }
  };
}
