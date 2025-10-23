import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Activity, Users, Clock, AlertTriangle } from 'lucide-react'

interface Gate {
  id: string
  name: string
  latitude?: number
  longitude?: number
  status: string
  health_score?: number
  checkin_count?: number
  location_description?: string
  created_at?: string
}

interface InteractiveGateMapProps {
  gates: Gate[]
  onGateClick?: (gate: Gate) => void
}

interface MapBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

interface ClusterInfo {
  gates: Gate[]
  centerLat: number
  centerLon: number
  radius: number
}

const InteractiveGateMap: React.FC<InteractiveGateMapProps> = ({ gates, onGateClick }) => {
  const [hoveredGate, setHoveredGate] = useState<Gate | null>(null)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [clusters, setClusters] = useState<ClusterInfo[]>([])
  const mapRef = useRef<HTMLDivElement>(null)

  // Calculate map bounds and clusters
  useEffect(() => {
    const validGates = gates.filter(gate => gate.latitude && gate.longitude)
    
    if (validGates.length === 0) return

    // Calculate bounds
    const lats = validGates.map(g => g.latitude!)
    const lons = validGates.map(g => g.longitude!)
    
    const bounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons)
    }

    // Add padding (10% of range)
    const latRange = bounds.maxLat - bounds.minLat || 0.01
    const lonRange = bounds.maxLon - bounds.minLon || 0.01
    const padding = 0.1

    bounds.minLat -= latRange * padding
    bounds.maxLat += latRange * padding
    bounds.minLon -= lonRange * padding
    bounds.maxLon += lonRange * padding

    setMapBounds(bounds)

    // Create clusters for nearby gates (within ~50 meters)
    const clusterThreshold = 0.0005 // Approximately 50 meters
    const processed = new Set<string>()
    const newClusters: ClusterInfo[] = []

    validGates.forEach(gate => {
      if (processed.has(gate.id)) return

      const nearby = validGates.filter(otherGate => {
        if (processed.has(otherGate.id) || gate.id === otherGate.id) return false
        
        const latDiff = Math.abs(gate.latitude! - otherGate.latitude!)
        const lonDiff = Math.abs(gate.longitude! - otherGate.longitude!)
        
        return latDiff < clusterThreshold && lonDiff < clusterThreshold
      })

      const clusterGates = [gate, ...nearby]
      clusterGates.forEach(g => processed.add(g.id))

      // Calculate cluster center and radius
      const centerLat = clusterGates.reduce((sum, g) => sum + g.latitude!, 0) / clusterGates.length
      const centerLon = clusterGates.reduce((sum, g) => sum + g.longitude!, 0) / clusterGates.length
      
      // Calculate radius based on spread
      const maxDistance = Math.max(...clusterGates.map(g => 
        Math.sqrt(Math.pow(g.latitude! - centerLat, 2) + Math.pow(g.longitude! - centerLon, 2))
      ))

      newClusters.push({
        gates: clusterGates,
        centerLat,
        centerLon,
        radius: Math.max(maxDistance, 0.0001) // Minimum radius
      })
    })

    setClusters(newClusters)
  }, [gates])

  // Convert lat/lon to pixel coordinates
  const coordToPixel = (lat: number, lon: number) => {
    if (!mapBounds) return { x: 0, y: 0 }

    const mapWidth = 800
    const mapHeight = 600

    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * mapWidth
    const y = mapHeight - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * mapHeight

    return { x, y }
  }

  // Get status color
  const getStatusColor = (status: string, health: number = 100) => {
    if (status === 'inactive') return '#6B7280' // gray-500
    if (status === 'maintenance') return '#F59E0B' // yellow-500
    if (health < 70) return '#EF4444' // red-500
    if (health < 90) return '#F97316' // orange-500
    return '#10B981' // green-500
  }

  // Calculate marker size based on cluster size and importance
  const getMarkerSize = (cluster: ClusterInfo) => {
    const baseSize = 12
    const gateCount = cluster.gates.length
    const totalCheckins = cluster.gates.reduce((sum, gate) => sum + (gate.checkin_count || 0), 0)
    
    // Size based on number of gates (clustering)
    const clusterMultiplier = gateCount > 1 ? 1 + (gateCount - 1) * 0.3 : 1
    
    // Size based on activity level
    const activityMultiplier = totalCheckins > 50 ? 1.5 : totalCheckins > 20 ? 1.3 : totalCheckins > 5 ? 1.1 : 1
    
    return Math.min(baseSize * clusterMultiplier * activityMultiplier, 32)
  }

  if (!mapBounds || clusters.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No GPS Data Available</h3>
        <p className="text-gray-500">
          Gates don't have GPS coordinates yet. Check-ins with location data will automatically create positioned gates.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div 
        ref={mapRef}
        className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-gray-200 overflow-hidden"
        style={{ width: '800px', height: '600px', margin: '0 auto' }}
      >
        {/* Grid Background */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Compass */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 text-xs">
          <div className="text-center font-medium text-gray-700">N</div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-500">W</span>
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <div className="w-1 h-3 bg-red-500 rounded-full"></div>
            </div>
            <span className="text-gray-500">E</span>
          </div>
          <div className="text-center text-gray-500 mt-1">S</div>
        </div>

        {/* Scale Indicator */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-0.5 bg-gray-700"></div>
            <span className="text-gray-700 font-medium">~100m</span>
          </div>
        </div>

        {/* Gate Markers */}
        {clusters.map((cluster, clusterIndex) => {
          const { x, y } = coordToPixel(cluster.centerLat, cluster.centerLon)
          const markerSize = getMarkerSize(cluster)
          const isMultiGate = cluster.gates.length > 1
          
          // Get dominant status/health for cluster
          const activeGates = cluster.gates.filter(g => g.status === 'active')
          const avgHealth = cluster.gates.reduce((sum, g) => sum + (g.health_score || 100), 0) / cluster.gates.length
          const totalCheckins = cluster.gates.reduce((sum, g) => sum + (g.checkin_count || 0), 0)
          
          const dominantStatus = activeGates.length > cluster.gates.length / 2 ? 'active' : 
                                cluster.gates.some(g => g.status === 'maintenance') ? 'maintenance' : 'inactive'

          return (
            <div
              key={clusterIndex}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
              style={{ 
                left: x, 
                top: y,
                zIndex: hoveredGate && cluster.gates.some(g => g.id === hoveredGate.id) ? 20 : 10
              }}
              onMouseEnter={() => setHoveredGate(cluster.gates[0])}
              onMouseLeave={() => setHoveredGate(null)}
              onClick={() => onGateClick?.(cluster.gates[0])}
            >
              {/* Main Marker */}
              <div
                className="rounded-full border-4 border-white shadow-lg flex items-center justify-center relative"
                style={{
                  width: markerSize,
                  height: markerSize,
                  backgroundColor: getStatusColor(dominantStatus, avgHealth)
                }}
              >
                {isMultiGate ? (
                  <span className="text-white font-bold text-xs">{cluster.gates.length}</span>
                ) : (
                  <MapPin className="text-white" size={markerSize * 0.6} />
                )}
                
                {/* Activity Ring for high-traffic gates */}
                {totalCheckins > 20 && (
                  <div 
                    className="absolute rounded-full border-2 animate-pulse"
                    style={{
                      width: markerSize + 8,
                      height: markerSize + 8,
                      borderColor: getStatusColor(dominantStatus, avgHealth),
                      opacity: 0.5
                    }}
                  />
                )}
              </div>

              {/* Cluster Spread Indicator */}
              {isMultiGate && (
                <div
                  className="absolute rounded-full border border-gray-400 opacity-30"
                  style={{
                    width: cluster.radius * 100000, // Scale up for visibility
                    height: cluster.radius * 100000,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    minWidth: markerSize + 20,
                    minHeight: markerSize + 20,
                    maxWidth: 100,
                    maxHeight: 100
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Tooltip */}
        {hoveredGate && (
          <div className="absolute z-30 bg-white rounded-lg shadow-xl border p-4 max-w-sm pointer-events-none">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{hoveredGate.name}</h4>
                <p className="text-sm text-gray-500">
                  {hoveredGate.latitude?.toFixed(6)}, {hoveredGate.longitude?.toFixed(6)}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                hoveredGate.status === 'active' ? 'bg-green-500' : 
                hoveredGate.status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span>{hoveredGate.checkin_count || 0} check-ins</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span>{hoveredGate.health_score || 100}% health</span>
              </div>
              {hoveredGate.location_description && (
                <div className="col-span-2 flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{hoveredGate.location_description}</span>
                </div>
              )}
              {hoveredGate.created_at && (
                <div className="col-span-2 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Created {new Date(hoveredGate.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="mt-3 pt-3 border-t">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                hoveredGate.status === 'active' ? 'bg-green-100 text-green-800' :
                hoveredGate.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {hoveredGate.status === 'active' ? 'Active' :
                 hoveredGate.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
              </div>
              {(hoveredGate.health_score || 100) < 90 && (
                <div className="inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Attention
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-3">Map Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Active & Healthy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span>Active & Warning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>Maintenance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span>Inactive</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-gray-600">
          <p>• Larger markers indicate multiple gates or high activity</p>
          <p>• Numbers show gate count in clustered locations</p>
          <p>• Pulsing rings indicate high-traffic gates (20+ check-ins)</p>
        </div>
      </div>
    </div>
  )
}

export default InteractiveGateMap
