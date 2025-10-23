import { createSafeSearchTerm } from '../utils/inputSanitizer';
import { supabase } from './supabase';

export interface CountryJobData {
  id?: string;
  country: string;
  country_code: string;
  jobs_count: number;
  average_salary: number;
  coordinates: [number, number]; // [longitude, latitude]
  created_at?: string;
  updated_at?: string;
}

export interface JobOpportunity {
  id?: string;
  title: string;
  company: string;
  location: string;
  country: string;
  country_code: string;
  salary_range: string;
  description: string;
  requirements: string[];
  benefits: string[];
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  posted_date: string;
  application_deadline?: string;
  is_remote: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class JobService {
  /**
   * Get job data for all countries (for the world map)
   */
  async getCountryJobData(): Promise<CountryJobData[]> {
    try {
      const { data, error } = await supabase
        .from('country_job_data')
        .select('*')
        .order('jobs_count', { ascending: false });

      if (error) {
        console.error('Error fetching country job data:', error);
        return this.getDefaultCountryJobData();
      }

      return data?.map(item => ({
        country: item.country,
        country_code: item.country_code,
        jobs_count: item.jobs_count,
        average_salary: item.average_salary,
        coordinates: item.coordinates as [number, number]
      })) || this.getDefaultCountryJobData();
    } catch (error) {
      console.error('Error in getCountryJobData:', error);
      return this.getDefaultCountryJobData();
    }
  }

  /**
   * Get job opportunities for a specific country
   */
  async getJobsByCountry(countryCode: string): Promise<JobOpportunity[]> {
    try {
      const { data, error } = await supabase
        .from('job_opportunities')
        .select('*')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .order('posted_date', { ascending: false });

      if (error) {
        console.error('Error fetching jobs for country:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getJobsByCountry:', error);
      return [];
    }
  }

  /**
   * Get all available job opportunities
   */
  async getAllJobOpportunities(): Promise<JobOpportunity[]> {
    try {
      const { data, error } = await supabase
        .from('job_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false });

      if (error) {
        console.error('Error fetching all job opportunities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllJobOpportunities:', error);
      return [];
    }
  }

  /**
   * Search job opportunities by query
   */
  async searchJobs(query: string): Promise<JobOpportunity[]> {
    try {
      const safeQuery = createSafeSearchTerm(query);
      if (!safeQuery) {
        return [];
      }

      const { data, error } = await supabase
        .from('job_opportunities')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${safeQuery}%,company.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`)
        .order('posted_date', { ascending: false });

      if (error) {
        console.error('Error searching jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchJobs:', error);
      return [];
    }
  }

  /**
   * Get featured/highlighted job opportunities
   */
  async getFeaturedJobs(): Promise<JobOpportunity[]> {
    try {
      const { data, error } = await supabase
        .from('job_opportunities')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('posted_date', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching featured jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFeaturedJobs:', error);
      return [];
    }
  }

  /**
   * Default country job data (fallback when database is not available)
   */
  private getDefaultCountryJobData(): CountryJobData[] {
    return [
      {
        country: "United States",
        country_code: "USA",
        jobs_count: 1250,
        average_salary: 85000,
        coordinates: [-100, 40]
      },
      {
        country: "United Kingdom",
        country_code: "GBR",
        jobs_count: 450,
        average_salary: 55000,
        coordinates: [-2, 54]
      },
      {
        country: "Canada",
        country_code: "CAN",
        jobs_count: 320,
        average_salary: 72000,
        coordinates: [-100, 60]
      },
      {
        country: "Australia",
        country_code: "AUS",
        jobs_count: 180,
        average_salary: 78000,
        coordinates: [135, -25]
      },
      {
        country: "Germany",
        country_code: "DEU",
        jobs_count: 280,
        average_salary: 65000,
        coordinates: [10, 51]
      },
      {
        country: "France",
        country_code: "FRA",
        jobs_count: 220,
        average_salary: 58000,
        coordinates: [2, 46]
      },
      {
        country: "Japan",
        country_code: "JPN",
        jobs_count: 150,
        average_salary: 62000,
        coordinates: [138, 36]
      },
      {
        country: "Singapore",
        country_code: "SGP",
        jobs_count: 90,
        average_salary: 68000,
        coordinates: [104, 1]
      },
      {
        country: "United Arab Emirates",
        country_code: "ARE",
        jobs_count: 120,
        average_salary: 75000,
        coordinates: [54, 24]
      },
      {
        country: "South Africa",
        country_code: "ZAF",
        jobs_count: 80,
        average_salary: 45000,
        coordinates: [24, -29]
      }
    ];
  }

  /**
   * Get country statistics summary
   */
  async getCountryStats(): Promise<{
    totalCountries: number;
    totalJobs: number;
    averageSalary: number;
    topCountries: CountryJobData[];
  }> {
    try {
      const countryData = await this.getCountryJobData();

      const totalJobs = countryData.reduce((sum, country) => sum + country.jobs_count, 0);
      const averageSalary = Math.round(
        countryData.reduce((sum, country) => sum + (country.average_salary * country.jobs_count), 0) / totalJobs
      );
      const topCountries = countryData.slice(0, 5);

      return {
        totalCountries: countryData.length,
        totalJobs,
        averageSalary,
        topCountries
      };
    } catch (error) {
      console.error('Error calculating country stats:', error);
      return {
        totalCountries: 0,
        totalJobs: 0,
        averageSalary: 0,
        topCountries: []
      };
    }
  }

  /**
   * Create or update country job data (admin function)
   */
  async upsertCountryJobData(countryData: Omit<CountryJobData, 'id' | 'created_at' | 'updated_at'>): Promise<CountryJobData | null> {
    try {
      const { data, error } = await supabase
        .from('country_job_data')
        .upsert({
          country: countryData.country,
          country_code: countryData.country_code,
          jobs_count: countryData.jobs_count,
          average_salary: countryData.average_salary,
          coordinates: countryData.coordinates
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting country job data:', error);
        return null;
      }

      return {
        country: data.country,
        country_code: data.country_code,
        jobs_count: data.jobs_count,
        average_salary: data.average_salary,
        coordinates: data.coordinates as [number, number]
      };
    } catch (error) {
      console.error('Error in upsertCountryJobData:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const jobService = new JobService();
