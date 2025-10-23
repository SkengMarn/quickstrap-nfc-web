/**
 * JobsMapDemo Page
 *
 * Demonstrates the JobWorldMap component with interactive world map
 * showing job opportunities and average salaries by country.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, TrendingUp, MapPin, Search, Filter } from 'lucide-react';
import JobWorldMap, { CountryJobData } from '../components/maps/JobWorldMap';
import { jobService } from '../services/jobService';

export default function JobsMapDemo() {
  const [jobData, setJobData] = useState<CountryJobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredJobData, setFilteredJobData] = useState<CountryJobData[]>([]);
  const [stats, setStats] = useState({
    totalCountries: 0,
    totalJobs: 0,
    averageSalary: 0,
    topCountries: [] as CountryJobData[]
  });

  // Load job data on component mount
  useEffect(() => {
    const loadJobData = async () => {
      try {
        const [countryData, countryStats] = await Promise.all([
          jobService.getCountryJobData(),
          jobService.getCountryStats()
        ]);

        const camelCaseData = countryData.map(item => ({
          country: item.country,
          countryCode: item.country_code,
          jobsCount: item.jobs_count,
          averageSalary: item.average_salary,
          coordinates: item.coordinates
        }));

        setJobData(camelCaseData);
        setFilteredJobData(camelCaseData);
        // Convert topCountries to camelCase to match JobWorldMap interface
        const statsWithCamelCase = {
          ...countryStats,
          topCountries: countryStats.topCountries.map(country => ({
            country: country.country,
            countryCode: country.country_code,
            jobsCount: country.jobs_count,
            averageSalary: country.average_salary,
            coordinates: country.coordinates
          }))
        };
        setStats(statsWithCamelCase);
      } catch (error) {
        console.error('Error loading job data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, []);

  // Filter job data based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobData(jobData);
    } else {
      const filtered = jobData.filter(country =>
        country.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobData(filtered);
    }
  }, [searchQuery, jobData]);

  const handleCountryClick = (countryData: CountryJobData) => {
    setSelectedCountry(countryData.countryCode);
  };

  const clearSelection = () => {
    setSelectedCountry(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Home
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                Global Job Opportunities Map
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Countries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCountries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalJobs.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Salary</p>
                <p className="text-2xl font-bold text-gray-900">${stats.averageSalary.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Search className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Search</p>
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Map and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* World Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Interactive Job Opportunities Map
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click on countries to see available jobs and average salaries
                </p>
              </div>
              <div className="h-[600px]">
                <JobWorldMap
                  jobData={filteredJobData}
                  selectedCountry={selectedCountry}
                  onCountryClick={handleCountryClick}
                  height={600}
                  width={800}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Country Search */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <h3 className="font-medium text-gray-900">Filter Countries</h3>
              </div>
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Showing {filteredJobData.length} of {jobData.length} countries
              </p>
            </div>

            {/* Top Countries */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Top Countries by Job Count</h3>
              <div className="space-y-3">
                {stats.topCountries.map((country, index) => (
                  <div
                    key={country.countryCode}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCountry === country.countryCode
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleCountryClick(country)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{country.country}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {country.jobsCount.toLocaleString()} jobs
                      </span>
                      <span className="font-medium text-green-600">
                        ${country.averageSalary.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Country Details */}
            {selectedCountry && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Country Details</h3>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                {(() => {
                  const countryData = jobData.find(c => c.countryCode === selectedCountry);
                  if (!countryData) return null;

                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Country
                        </label>
                        <p className="text-sm text-gray-900 font-medium">{countryData.country}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Available Jobs
                        </label>
                        <p className="text-sm text-gray-900">{countryData.jobsCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Average Salary
                        </label>
                        <p className="text-sm text-gray-900 font-medium text-green-600">
                          ${countryData.averageSalary.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Coordinates
                        </label>
                        <p className="text-sm text-gray-900 font-mono">
                          {countryData.coordinates[1].toFixed(4)}, {countryData.coordinates[0].toFixed(4)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Features</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Interactive country selection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Real-time job data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Color-coded salary ranges</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Zoomable world map</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Search and filter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
