import axios from 'axios';

const BASE_URL = 'https://studyspot-ubc.onrender.com';

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

// Parse a natural language query into structured filters using Claude
export const parseNaturalQuery = async (query: string): Promise<RecommendationParams> => {
  const { data } = await axios.post(`${BASE_URL}/api/parse-query`, { query });
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
// Send natural language message to Claude and get filter params back
export const chatSearch = async (message: string): Promise<RecommendationParams> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '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',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are helping a UBC student find a study spot. Extract study preferences from their message and return ONLY a JSON object with these fields:
- hour: number (0-23, current hour if not specified, default to 14)
- is_exam_season: boolean
- wants_quiet: boolean
- allows_food: boolean
- wants_coffee_nearby: boolean
- group_size: number (default 1)

Message: "${message}"

Return ONLY the JSON object, no explanation.`
      }]
    })
  });
  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text.replace(/```json|```/g, '').trim());
};