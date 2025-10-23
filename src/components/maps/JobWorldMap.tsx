import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Graticule,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

// World topology data - you may need to host this or use a CDN
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Types for job data
export interface CountryJobData {
  id?: string;
  country: string;
  countryCode: string;
  jobsCount: number;
  averageSalary: number;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface JobWorldMapProps {
  jobData?: CountryJobData[];
  onCountryClick?: (countryData: CountryJobData) => void;
  selectedCountry?: string;
  className?: string;
  height?: number;
  width?: number;
}

// Default job data for demonstration
const defaultJobData: CountryJobData[] = [
  {
    country: "United States",
    countryCode: "USA",
    jobsCount: 1250,
    averageSalary: 85000,
    coordinates: [-100, 40]
  },
  {
    country: "United Kingdom",
    countryCode: "GBR",
    jobsCount: 450,
    averageSalary: 55000,
    coordinates: [-2, 54]
  },
  {
    country: "Canada",
    countryCode: "CAN",
    jobsCount: 320,
    averageSalary: 72000,
    coordinates: [-100, 60]
  },
  {
    country: "Australia",
    countryCode: "AUS",
    jobsCount: 180,
    averageSalary: 78000,
    coordinates: [135, -25]
  },
  {
    country: "Germany",
    countryCode: "DEU",
    jobsCount: 280,
    averageSalary: 65000,
    coordinates: [10, 51]
  },
  {
    country: "France",
    countryCode: "FRA",
    jobsCount: 220,
    averageSalary: 58000,
    coordinates: [2, 46]
  }
];

const JobWorldMap: React.FC<JobWorldMapProps> = ({
  jobData = defaultJobData,
  onCountryClick,
  selectedCountry,
  className = "",
  height = 600,
  width = 800
}) => {
  const [geographies, setGeographies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create a map of country data by country code for quick lookup
  const countryDataMap = useMemo(() => {
    const map = new Map<string, CountryJobData>();
    jobData.forEach(data => {
      map.set(data.countryCode, data);
    });
    return map;
  }, [jobData]);

  // Color scale for job count intensity
  const colorScale = useMemo(() => {
    const maxJobs = Math.max(...jobData.map(d => d.jobsCount));
    return scaleLinear<string>()
      .domain([0, maxJobs * 0.3, maxJobs * 0.7, maxJobs])
      .range(["#f7fbff", "#a6cee3", "#1f78b4", "#08306b"]);
  }, [jobData]);

  // Load world topology data
  useEffect(() => {
    fetch(geoUrl)
      .then(response => response.json())
      .then(worldData => {
        setGeographies(worldData.objects.countries.geometries);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading world data:', error);
        setLoading(false);
      });
  }, []);

  const handleCountryClick = (geo: any) => {
    const countryCode = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
    const countryData = countryDataMap.get(countryCode);

    if (countryData && onCountryClick) {
      onCountryClick(countryData);
    }
  };

  const getCountryFill = (geo: any) => {
    const countryCode = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
    const countryData = countryDataMap.get(countryCode);

    if (countryData) {
      return colorScale(countryData.jobsCount);
    }

    return "#EAEAEA"; // Default gray for countries without data
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height, width }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading world map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height, width }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 120,
          center: [0, 0]
        }}
        width={width}
        height={height}
      >
        <ZoomableGroup zoom={1}>
          <Graticule stroke="#F1F1F1" strokeWidth={0.5} />
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo: any) => {
                const countryCode = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                const countryData = countryDataMap.get(countryCode);
                const isSelected = selectedCountry === countryCode;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryFill(geo)}
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                    style={{
                      default: {
                        fill: getCountryFill(geo),
                        stroke: "#FFFFFF",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: countryData ? "#1f78b4" : "#D1D5DB",
                        stroke: "#FFFFFF",
                        strokeWidth: 1,
                        outline: "none",
                      },
                      pressed: {
                        fill: countryData ? "#08306b" : "#9CA3AF",
                        stroke: "#FFFFFF",
                        strokeWidth: 1,
                        outline: "none",
                      },
                    }}
                    onClick={() => handleCountryClick(geo)}
                  />
                );
              })
            }
          </Geographies>

          {/* Country markers for job locations */}
          {jobData.map((country, index) => (
            <Marker key={index} coordinates={country.coordinates}>
              <circle
                r={4}
                fill="#FF5722"
                stroke="#fff"
                strokeWidth={2}
                className="cursor-pointer"
                onClick={() => onCountryClick?.(country)}
              />
              <text
                textAnchor="middle"
                y={-8}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  fontWeight: "bold",
                  fill: "#5D5A6D"
                }}
              >
                {country.jobsCount}
              </text>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold mb-2">Job Opportunities</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorScale(100) }}></div>
            <span className="text-xs">Low (0-300 jobs)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorScale(500) }}></div>
            <span className="text-xs">Medium (300-700 jobs)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorScale(1000) }}></div>
            <span className="text-xs">High (700+ jobs)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs">Job locations</span>
          </div>
        </div>
      </div>

      {/* Selected country info */}
      {selectedCountry && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          {(() => {
            const countryData = countryDataMap.get(selectedCountry);
            if (!countryData) return null;

            return (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{countryData.country}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Jobs:</span>
                    <span className="font-medium">{countryData.jobsCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Salary:</span>
                    <span className="font-medium">${countryData.averageSalary.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default JobWorldMap;
