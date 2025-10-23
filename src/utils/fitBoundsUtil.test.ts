/**
 * Test file demonstrating the fitBoundsUtil functions
 * Run with: npm test fitBoundsUtil.test.ts
 */

import { 
  geoBoundsForGates, 
  imageBoundsForGates, 
  getCenterPoint, 
  areGatesClustered,
  calculateDistance,
  calculatePixelDistance,
  findNearestGate,
  validateGateCoordinates
} from './fitBoundsUtil';

// Sample test data
const geoGates = [
  { id: 'g1', name: 'Gate A', latitude: 0.3476, longitude: 32.5825 },
  { id: 'g2', name: 'Gate B', lat: 0.3480, lon: 32.5830 },
  { id: 'g3', name: 'Gate C', latitude: 0.3485, longitude: 32.5835 }
];

const imageGates = [
  { id: 'g1', name: 'Gate A', x: 100, y: 200 },
  { id: 'g2', name: 'Gate B', x: 300, y: 400 },
  { id: 'g3', name: 'Gate C', x: 500, y: 600 }
];

const mixedGates = [
  { id: 'g1', name: 'Gate A', latitude: 0.3476, longitude: 32.5825, x: 100, y: 200 },
  { id: 'g2', name: 'Gate B', lat: 0.3480, lon: 32.5830, x: 300, y: 400 }
];

// Test functions (these would normally use a testing framework like Jest)
console.log('=== FitBoundsUtil Test Results ===\n');

// Test 1: Geographic bounds
console.log('1. Geographic Bounds:');
const geoBounds = geoBoundsForGates(geoGates);
console.log('Bounds:', geoBounds ? 'Generated successfully' : 'Failed');
console.log('Center:', getCenterPoint(geoGates, false));
console.log('Clustered:', areGatesClustered(geoGates, 0.001, false));

// Test 2: Image bounds
console.log('\n2. Image Bounds:');
const imageBounds = imageBoundsForGates(imageGates, { width: 1000, height: 800 });
console.log('Bounds:', imageBounds ? 'Generated successfully' : 'Failed');
console.log('Center:', getCenterPoint(imageGates, true));
console.log('Clustered:', areGatesClustered(imageGates, 100, true));

// Test 3: Distance calculations
console.log('\n3. Distance Calculations:');
const geoDistance = calculateDistance(0.3476, 32.5825, 0.3480, 32.5830);
console.log('Geographic distance:', `${geoDistance.toFixed(4)} km`);
const pixelDistance = calculatePixelDistance(100, 200, 300, 400);
console.log('Pixel distance:', `${pixelDistance.toFixed(2)} pixels`);

// Test 4: Nearest gate
console.log('\n4. Nearest Gate:');
const nearestGeo = findNearestGate(geoGates[0], geoGates, false);
console.log('Nearest to Gate A (geo):', nearestGeo?.gate.name, `(${nearestGeo?.distance.toFixed(4)} km)`);
const nearestImage = findNearestGate(imageGates[0], imageGates, true);
console.log('Nearest to Gate A (image):', nearestImage?.gate.name, `(${nearestImage?.distance.toFixed(2)} px)`);

// Test 5: Validation
console.log('\n5. Coordinate Validation:');
const invalidGates = [
  { id: 'valid', latitude: 45.0, longitude: -122.0 },
  { id: 'invalid-lat', latitude: 95.0, longitude: -122.0 }, // Invalid latitude
  { id: 'missing-coords', name: 'No coords' }, // Missing coordinates
];

const validation = validateGateCoordinates(invalidGates, false);
console.log('Validation summary:', validation.summary);
console.log('Invalid gates:', validation.invalid.map(i => `${i.gate.id}: ${i.error}`));

console.log('\n=== All Tests Complete ===');

export {}; // Make this a module
