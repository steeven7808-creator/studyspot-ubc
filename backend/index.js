const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET /api/locations - return all study locations
app.get('/api/locations', async (req, res) => {
  const { data, error } = await supabase
    .from('locations')
    .select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/locations/:id - return one location with full details
app.get('/api/locations/:id', async (req, res) => {
  const { id } = req.params;

  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();

  if (locError) return res.status(500).json({ error: locError.message });

  const { data: coffee } = await supabase
    .from('nearby_coffee')
    .select('*')
    .eq('location_id', id);

  const { data: reports } = await supabase
    .from('user_reports')
    .select('*')
    .eq('location_id', id)
    .order('reported_at', { ascending: false })
    .limit(5);

  res.json({ ...location, nearby_coffee: coffee, recent_reports: reports });
});

// GET /api/recommendations - return ranked locations based on user input
app.get('/api/recommendations', async (req, res) => {
  const {
    hour = new Date().getHours(),
    is_exam_season = 'false',
    wants_quiet = 'false',
    allows_food = 'false',
    wants_coffee_nearby = 'false',
    group_size = 1
  } = req.query;

  // Fetch all locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*');
  if (error) return res.status(500).json({ error: error.message });

  // Fetch crowding patterns for current hour and day type
  const dayType = is_exam_season === 'true' ? 'exam_season' : 'weekday';
  const { data: patterns } = await supabase
    .from('crowding_patterns')
    .select('*')
    .eq('day_type', dayType)
    .eq('hour', parseInt(hour));

  // Fetch user reports from the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentUserReports } = await supabase
    .from('user_reports')
    .select('*')
    .gte('reported_at', oneHourAgo);

  // Fetch nearby coffee for all locations
  const { data: coffeeSpots } = await supabase
    .from('nearby_coffee')
    .select('*');

  // Score each location based on user preferences
  const scored = locations.map(loc => {
    let score = 100;
    let isClosed = false;

    // Check if location is currently open
    if (loc.open_time && loc.close_time) {
      const currentHour = parseInt(hour);
      const openHour = parseInt(loc.open_time.split(':')[0]);
      const closeHour = parseInt(loc.close_time.split(':')[0]);
      if (currentHour < openHour || currentHour >= closeHour) {
        isClosed = true;
        score -= 1000;
      }
    }

    // Penalize crowded locations based on historical pattern
    const pattern = patterns?.find(p => p.location_id === loc.id);
    if (pattern) score -= pattern.crowding_level * 15;

    // Factor in recent user reports from the last hour (weighted more heavily)
    const recentReports = recentUserReports?.filter(r => r.location_id === loc.id);
    if (recentReports && recentReports.length > 0) {
      const avgRecent = recentReports.reduce((sum, r) => sum + r.crowding_level, 0) / recentReports.length;
      score -= avgRecent * 20;
    }

    // Penalize if user wants quiet but location is loud
    if (wants_quiet === 'true' && loc.noise_level !== 'quiet') score -= 30;

    // Penalize if user needs food but location doesn't allow it
    if (allows_food === 'true' && !loc.allows_food) score -= 40;

    // Penalize if user wants coffee nearby but none available
    const hasCoffee = coffeeSpots?.some(c => c.location_id === loc.id && c.walking_minutes <= 3);
    if (wants_coffee_nearby === 'true' && !hasCoffee) score -= 20;

    // Penalize if location capacity might be too small for group
    if (loc.capacity && parseInt(group_size) > loc.capacity * 0.5) score -= 20;

    const crowding = pattern ? pattern.crowding_level : null;
    return { ...loc, score, crowding_level: crowding, is_closed: isClosed };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  res.json(scored);
});

// POST /api/chat - parse natural language query using Claude
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
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
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Failed to parse response' });
  }
});

// POST /api/reports - submit a crowding report
app.post('/api/reports', async (req, res) => {
  const { location_id, crowding_level, is_exam_season } = req.body;

  if (!location_id || !crowding_level) {
    return res.status(400).json({ error: 'location_id and crowding_level are required' });
  }

  const { data, error } = await supabase
    .from('user_reports')
    .insert([{ location_id, crowding_level, is_exam_season }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Report submitted successfully', data });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
// Updated Sat  9 May 2026 22:03:07 PDT
