import React, { useState } from 'react';
import './App.css';
import { getRecommendations, submitReport, parseNaturalQuery, Location } from './api';

function App() {
  // User filter state
  const [isExamSeason, setIsExamSeason] = useState(false);
  const [wantsQuiet, setWantsQuiet] = useState(false);
  const [allowsFood, setAllowsFood] = useState(false);
  const [wantsCoffee, setWantsCoffee] = useState(false);
  const [groupSize, setGroupSize] = useState(1);
  const [hour, setHour] = useState(new Date().getHours());

  // Results state
  const [results, setResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Natural language search state
  const [nlQuery, setNlQuery] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedSummary, setParsedSummary] = useState('');

  // Track which cards have been reported
  const [reported, setReported] = useState<{ [key: number]: boolean }>({});

  const handleAiSearch = async () => {
    if (!nlQuery.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseNaturalQuery(nlQuery);

      // Populate filter controls so the user can see what was understood
      setHour(parsed.hour);
      setIsExamSeason(parsed.is_exam_season);
      setWantsQuiet(parsed.wants_quiet);
      setAllowsFood(parsed.allows_food);
      setWantsCoffee(parsed.wants_coffee_nearby);
      setGroupSize(parsed.group_size);

      // Build a human-readable summary of what Claude extracted
      const h = parsed.hour;
      const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      const parts = [hourLabel];
      if (parsed.group_size > 1) parts.push(`Group of ${parsed.group_size}`);
      if (parsed.is_exam_season) parts.push('Exam season');
      if (parsed.wants_quiet) parts.push('Quiet');
      if (parsed.allows_food) parts.push('Food OK');
      if (parsed.wants_coffee_nearby) parts.push('Coffee nearby');
      setParsedSummary(parts.join(' · '));

      // Run search immediately with the parsed values (state updates are async)
      setParsing(false);
      setLoading(true);
      setSearched(true);
      const data = await getRecommendations(parsed);
      setResults(data);
    } catch (err) {
      console.error('Failed to parse query:', err);
      setParsing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await getRecommendations({
        hour,
        is_exam_season: isExamSeason,
        wants_quiet: wantsQuiet,
        allows_food: allowsFood,
        wants_coffee_nearby: wantsCoffee,
        group_size: groupSize,
      });
      setResults(data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
    setLoading(false);
  };

  const handleReport = async (locationId: number, crowdingLevel: number) => {
    try {
      await submitReport(locationId, crowdingLevel, isExamSeason);
      setReported(prev => ({ ...prev, [locationId]: true }));
    } catch (err) {
      console.error('Failed to submit report:', err);
    }
  };

  const getCrowdingLabel = (level: number | null | undefined) => {
    if (!level) return null;
    const labels: { [key: number]: string } = {
      1: 'Very quiet',
      2: 'Quiet',
      3: 'Moderate',
      4: 'Busy',
      5: 'Very busy'
    };
    return labels[level] || null;
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1>📚 StudySpot UBC</h1>
        <p>Find the best place to study on campus right now</p>
      </div>

      {/* AI natural language search */}
      <div className="ai-search">
        <div className="ai-search-label">✨ AI Search</div>
        <div className="ai-search-row">
          <textarea
            className="ai-input"
            placeholder='e.g. "quiet spot for finals tonight around 9pm, group of 3, near coffee"'
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSearch(); } }}
            rows={2}
          />
          <button
            className="ai-btn"
            onClick={handleAiSearch}
            disabled={parsing || !nlQuery.trim()}
          >
            {parsing ? 'Thinking...' : 'Ask AI →'}
          </button>
        </div>
        {parsedSummary && (
          <div className="ai-understood">
            <span className="ai-understood-label">Understood:</span> {parsedSummary}
          </div>
        )}
      </div>

      <p className="divider">or set filters manually</p>

      {/* Filters */}
      <div className="filters">
        <h2>What are you looking for?</h2>

        <div className="filter-grid">
          <div className="filter-item">
            <label>Time of day</label>
            <select value={hour} onChange={e => setHour(parseInt(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Group size</label>
            <input
              type="number"
              min={1}
              max={20}
              value={groupSize}
              onChange={e => setGroupSize(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="toggle-group">
          <button
            className={`toggle-btn ${isExamSeason ? 'active' : ''}`}
            onClick={() => setIsExamSeason(!isExamSeason)}
          >
            📅 Exam season
          </button>
          <button
            className={`toggle-btn ${wantsQuiet ? 'active' : ''}`}
            onClick={() => setWantsQuiet(!wantsQuiet)}
          >
            🤫 Need quiet
          </button>
          <button
            className={`toggle-btn ${allowsFood ? 'active' : ''}`}
            onClick={() => setAllowsFood(!allowsFood)}
          >
            🍕 Bringing food
          </button>
          <button
            className={`toggle-btn ${wantsCoffee ? 'active' : ''}`}
            onClick={() => setWantsCoffee(!wantsCoffee)}
          >
            ☕ Want coffee nearby
          </button>
        </div>

        <button className="search-btn" onClick={handleSearch}>
          Find a spot →
        </button>
      </div>

      {/* Results */}
      {loading && <div className="loading">Finding the best spots for you...</div>}

      {!loading && searched && (
        <>
          <p className="results-header">{results.length} spots found, ranked by best match</p>
          {results.map((loc, index) => (
            <div key={loc.id} className={`location-card rank-${index + 1}`}>
              <div className="card-header">
                <div>
                  <div className="location-name">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'} {loc.name}
                  </div>
                  <div className="location-building">{loc.building}</div>
                </div>
                <div className="score-badge">Score: {loc.score}</div>
              </div>

              <div className="tags">
                <span className={`tag ${loc.noise_level}`}>{loc.noise_level}</span>
                {loc.allows_food && <span className="tag food">🍕 Food OK</span>}
                {loc.has_outlets && <span className="tag outlets">🔌 Outlets</span>}
                {loc.crowding_level && (
                  <span className={`tag crowding-${loc.crowding_level}`}>
                    {getCrowdingLabel(loc.crowding_level)}
                  </span>
                )}
              </div>

              <p className="notes">{loc.notes}</p>

              {/* Crowding report section */}
              <div className="report-section">
                {reported[loc.id] ? (
                  <p className="report-thanks">✅ Thanks for your report!</p>
                ) : (
                  <>
                    <p>How busy is it right now?</p>
                    <div className="crowding-btns">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          className="crowding-btn"
                          onClick={() => handleReport(loc.id, level)}
                        >
                          {level === 1 ? '😌 Empty' :
                           level === 2 ? '🙂 Quiet' :
                           level === 3 ? '😐 Moderate' :
                           level === 4 ? '😬 Busy' : '😱 Full'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;