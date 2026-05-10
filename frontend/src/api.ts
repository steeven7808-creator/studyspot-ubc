import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export interface Location {
  id: number;
  name: string;
  building: string;
  capacity: number;
  has_outlets: boolean;
  allows_food: boolean;
  noise_level: string;
  open_time: string;
  close_time: string;
  notes: string;
  score?: number;
  crowding_level?: number | null;
}

export interface RecommendationParams {
  hour: number;
  is_exam_season: boolean;
  wants_quiet: boolean;
  allows_food: boolean;
  wants_coffee_nearby: boolean;
  group_size: number;
}

// Fetch all locations
export const getLocations = async (): Promise<Location[]> => {
  const { data } = await axios.get(`${BASE_URL}/api/locations`);
  return data;
};

// Fetch recommendations based on user preferences
export const getRecommendations = async (params: RecommendationParams): Promise<Location[]> => {
  const { data } = await axios.get(`${BASE_URL}/api/recommendations`, {
    params: {
      hour: params.hour,
      is_exam_season: params.is_exam_season,
      wants_quiet: params.wants_quiet,
      allows_food: params.allows_food,
      wants_coffee_nearby: params.wants_coffee_nearby,
      group_size: params.group_size,
    }
  });
  return data;
};

// Submit a crowding report
export const submitReport = async (
  location_id: number,
  crowding_level: number,
  is_exam_season: boolean
): Promise<void> => {
  await axios.post(`${BASE_URL}/api/reports`, {
    location_id,
    crowding_level,
    is_exam_season
  });
};