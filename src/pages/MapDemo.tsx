/**
 * MapDemo Page
 * 
 * Demonstrates the LandscapeMap component with various gate configurations
 * and both geographic and image-based coordinate systems.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Image, Globe, Shuffle } from 'lucide-react';
import LandscapeMap, { Gate } from '../components/maps/LandscapeMap';

// Sample gates with geographic coordinates (Kampala, Uganda area)
const sampleGatesGeo: Gate[] = [
  { 
    id: 'main-entrance', 
    name: 'Main Entrance', 
    latitude: 0.3476, 
    longitude: 32.5825,
    status: 'active',
    health_score: 95,
    checkin_count: 150
  },
  { 
    id: 'vip-gate', 
    name: 'VIP Gate', 
    latitude: 0.3477, 
    longitude: 32.5850,
    status: 'active',
    health_score: 88,
    checkin_count: 45
  },
  { 
    id: 'staff-entrance', 
    name: 'Staff Entrance', 
    latitude: 0.3500, 
    longitude: 32.5800,
    status: 'maintenance',
    health_score: 72,
    checkin_count: 23
  },
  { 
    id: 'emergency-exit', 
    name: 'Emergency Exit', 
    latitude: 0.3465, 
    longitude: 32.5835,
    status: 'inactive',
    health_score: 0,
    checkin_count: 0
  },
  { 
    id: 'side-gate', 
    name: 'Side Gate', 
    latitude: 0.3485, 
    longitude: 32.5815,
    status: 'active',
    health_score: 92,
    checkin_count: 78
  }
];

// Sample gates with image coordinates (venue floorplan)
const sampleGatesImage: Gate[] = [
  { 
    id: 'entrance-1', 
    name: 'North Entrance', 
    x: 120, 
    y: 80,
    status: 'active',
    health_score: 95,
    checkin_count: 200
  },
  { 
    id: 'entrance-2', 
    name: 'South Entrance', 
    x: 800, 
    y: 700,
    status: 'active',
    health_score: 88,
    checkin_count: 180
  },
  { 
    id: 'vip-lounge', 
    name: 'VIP Lounge Access', 
    x: 400, 
    y: 200,
    status: 'active',
    health_score: 92,
    checkin_count: 65
  },
  { 
    id: 'backstage', 
    name: 'Backstage Access', 
    x: 600, 
    y: 450,
    status: 'maintenance',
    health_score: 65,
    checkin_count: 12
  },
  { 
    id: 'emergency-1', 
    name: 'Emergency Exit 1', 
    x: 50, 
    y: 400,
    status: 'inactive',
    health_score: 0,
    checkin_count: 0
  },
  { 
    id: 'emergency-2', 
    name: 'Emergency Exit 2', 
    x: 950, 
    y: 400,
    status: 'active',
    health_score: 100,
    checkin_count: 5
  }
];

// Clustered gates (close together)
const clusteredGates: Gate[] = [
  { 
    id: 'cluster-1', 
    name: 'Gate A', 
    latitude: 0.3476, 
    longitude: 32.5825,
    status: 'active',
    health_score: 95,
    checkin_count: 50
  },
  { 
    id: 'cluster-2', 
    name: 'Gate B', 
    latitude: 0.3476, 
    longitude: 32.5826,
    status: 'active',
    health_score: 88,
    checkin_count: 35
  },
  { 
    id: 'cluster-3', 
    name: 'Gate C', 
    latitude: 0.3477, 
    longitude: 32.5825,
    status: 'maintenance',
    health_score: 72,
    checkin_count: 20
  }
];

// Spread out gates (wide area)
const spreadOutGates: Gate[] = [
  { 
    id: 'north', 
    name: 'North Gate', 
    latitude: 0.4000, 
    longitude: 32.5000,
    status: 'active',
    health_score: 95,
    checkin_count: 100
  },
  { 
    id: 'south', 
    name: 'South Gate', 
    latitude: 0.3000, 
    longitude: 32.6000,
    status: 'active',
    health_score: 88,
    checkin_count: 85
  },
  { 
    id: 'east', 
    name: 'East Gate', 
    latitude: 0.3500, 
    longitude: 32.7000,
    status: 'active',
    health_score: 92,
    checkin_count: 120
  },
  { 
    id: 'west', 
    name: 'West Gate', 
    latitude: 0.3500, 
    longitude: 32.4000,
    status: 'maintenance',
    health_score: 65,
    checkin_count: 45
  }
];

type DemoMode = 'geo' | 'image' | 'clustered' | 'spread';

export default function MapDemo() {
  const [selectedMode, setSelectedMode] = useState<DemoMode>('geo');
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);

  const getCurrentGates = (): Gate[] => {
    switch (selectedMode) {
      case 'geo': return sampleGatesGeo;
      case 'image': return sampleGatesImage;
      case 'clustered': return clusteredGates;
      case 'spread': return spreadOutGates;
      default: return sampleGatesGeo;
    }
  };

  const getCurrentBackgroundImage = () => {
    return selectedMode === 'image' 
      ? { url: '/assets/venue-floorplan.png', width: 1000, height: 800 }
      : null;
  };

  const handleGateClick = (gate: Gate) => {
    setSelectedGate(gate);
    console.log('Gate clicked:', gate);
  };

  const randomizeGates = () => {
    const modes: DemoMode[] = ['geo', 'image', 'clustered', 'spread'];
    const currentIndex = modes.indexOf(selectedMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSelectedMode(modes[nextIndex]);
    setSelectedGate(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/events"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Events
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                LandscapeMap Demo
              </h1>
            </div>
            
            <button
              onClick={randomizeGates}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Shuffle size={16} />
              <span>Switch Mode</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selection */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => { setSelectedMode('geo'); setSelectedGate(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedMode === 'geo'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Globe size={16} />
              <span>Geographic Mode</span>
            </button>
            
            <button
              onClick={() => { setSelectedMode('image'); setSelectedGate(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedMode === 'image'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Image size={16} />
              <span>Image Mode</span>
            </button>
            
            <button
              onClick={() => { setSelectedMode('clustered'); setSelectedGate(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedMode === 'clustered'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MapPin size={16} />
              <span>Clustered Gates</span>
            </button>
            
            <button
              onClick={() => { setSelectedMode('spread'); setSelectedGate(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedMode === 'spread'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MapPin size={16} />
              <span>Spread Out Gates</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">
            {selectedMode === 'geo' && 'Geographic Coordinates Demo'}
            {selectedMode === 'image' && 'Image-Based Floorplan Demo'}
            {selectedMode === 'clustered' && 'Clustered Gates Demo'}
            {selectedMode === 'spread' && 'Spread Out Gates Demo'}
          </h3>
          <p className="text-blue-700 text-sm">
            {selectedMode === 'geo' && 'Shows gates using real latitude/longitude coordinates with OpenStreetMap tiles. The map automatically scales to show all gates with appropriate padding.'}
            {selectedMode === 'image' && 'Displays gates on a venue floorplan using pixel coordinates. Uses Leaflet CRS.Simple for image-based mapping.'}
            {selectedMode === 'clustered' && 'Demonstrates automatic scaling when gates are very close together. Prevents over-zooming with minimum bounds.'}
            {selectedMode === 'spread' && 'Shows how the map handles gates spread across a large geographic area with optimal zoom levels.'}
          </p>
        </div>

        {/* Map Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="h-[600px]">
                <LandscapeMap
                  gates={getCurrentGates()}
                  backgroundImage={getCurrentBackgroundImage()}
                  fitPadding={[40, 40]}
                  minZoom={1}
                  maxZoom={18}
                  onGateClick={handleGateClick}
                  showControls={true}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gate List */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-4">
                Gates ({getCurrentGates().length})
              </h3>
              <div className="space-y-2">
                {getCurrentGates().map((gate) => (
                  <div
                    key={gate.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedGate?.id === gate.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedGate(gate)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{gate.name || gate.id}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        gate.status === 'active' ? 'bg-green-500' :
                        gate.status === 'maintenance' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedMode === 'image' 
                        ? `${gate.x}, ${gate.y}`
                        : `${(gate.latitude ?? gate.lat)?.toFixed(4)}, ${(gate.longitude ?? gate.lon)?.toFixed(4)}`
                      }
                    </div>
                    {gate.checkin_count !== undefined && (
                      <div className="text-xs text-blue-600 mt-1">
                        {gate.checkin_count} check-ins
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Gate Details */}
            {selectedGate && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="font-medium text-gray-900 mb-4">Gate Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="text-sm text-gray-900">{selectedGate.name || selectedGate.id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedGate.status === 'active' ? 'bg-green-500' :
                        selectedGate.status === 'maintenance' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-sm text-gray-900 capitalize">
                        {selectedGate.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  {selectedGate.health_score !== undefined && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Health Score</label>
                      <p className="text-sm text-gray-900">{selectedGate.health_score}%</p>
                    </div>
                  )}
                  {selectedGate.checkin_count !== undefined && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Check-ins</label>
                      <p className="text-sm text-gray-900">{selectedGate.checkin_count}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coordinates</label>
                    <p className="text-sm text-gray-900 font-mono">
                      {selectedMode === 'image' 
                        ? `x: ${selectedGate.x}, y: ${selectedGate.y}`
                        : `${(selectedGate.latitude ?? selectedGate.lat)?.toFixed(6)}, ${(selectedGate.longitude ?? selectedGate.lon)?.toFixed(6)}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Features</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Automatic bounds fitting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Dynamic scaling</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Status-based markers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Interactive popups</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Responsive design</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
