/**
 * dashaCalculator.js — Pure JS Vimshottari Dasha calculator
 *
 * Calculates dasha timelines without any API dependency.
 * Based on the traditional 120-year Vimshottari Dasha system.
 */

// ─── Vimshottari constants ─────────────────────────────────────────────────────

// Order of Mahadashas and their durations (in years)
const MAHADASHA_ORDER = [
  { planet: 'Ketu',    years: 7  },
  { planet: 'Venus',   years: 20 },
  { planet: 'Sun',     years: 6  },
  { planet: 'Moon',    years: 10 },
  { planet: 'Mars',    years: 7  },
  { planet: 'Rahu',    years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn',  years: 19 },
  { planet: 'Mercury', years: 17 },
];

// 27 Nakshatras mapped to their ruling planet and start position (0-based)
const NAKSHATRA_LORDS = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // Ashwini–Ashlesha
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // Magha–Jyeshtha
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // Moola–Revati
];

// Each Nakshatra spans 13°20' = 800' of arc
const NAKSHATRA_SPAN_DEG = 360 / 27; // 13.333...°

// Nature of each planet (for UI coloring)
const PLANET_NATURE = {
  Sun:     'malefic',
  Moon:    'benefic',
  Mars:    'malefic',
  Mercury: 'neutral',
  Jupiter: 'benefic',
  Venus:   'benefic',
  Saturn:  'malefic',
  Rahu:    'malefic',
  Ketu:    'malefic',
};

const PLANET_COLORS = {
  Sun:     '#FF6B2B',
  Moon:    '#C8C8E8',
  Mars:    '#FF4444',
  Mercury: '#00C78B',
  Jupiter: '#FFD700',
  Venus:   '#FF9FC8',
  Saturn:  '#7B8FA1',
  Rahu:    '#7B5EA7',
  Ketu:    '#A0522D',
};

const PLANET_EMOJIS = {
  Sun:     '☀️',
  Moon:    '🌙',
  Mars:    '♂️',
  Mercury: '☿',
  Jupiter: '♃',
  Venus:   '♀️',
  Saturn:  '♄',
  Rahu:    '☊',
  Ketu:    '☋',
};

// Remedies per planet
const PLANET_REMEDIES = {
  Sun:     ['Chant Surya mantra 108x on Sundays', 'Offer water to the Sun at sunrise', 'Wear Ruby or Garnet', 'Eat wheat and jaggery'],
  Moon:    ['Chant Chandra mantra on Mondays', 'Fast on Mondays', 'Wear Pearl or Moonstone', 'Drink milk before bed'],
  Mars:    ['Chant Mangal mantra on Tuesdays', 'Donate red items on Tuesdays', 'Wear Red Coral (Moonga)', 'Practice physical exercise'],
  Mercury: ['Chant Budh mantra on Wednesdays', 'Feed green vegetables to cows', 'Wear Emerald (Panna)', 'Study and read regularly'],
  Jupiter: ['Chant Guru mantra on Thursdays', 'Donate yellow items', 'Wear Yellow Sapphire (Pukhraj)', 'Serve teachers and elders'],
  Venus:   ['Chant Shukra mantra on Fridays', 'Donate white items on Fridays', 'Wear Diamond or White Sapphire', 'Practice arts and music'],
  Saturn:  ['Chant Shani mantra on Saturdays', 'Fast on Saturdays', 'Wear Blue Sapphire (Neelam) — test first', 'Serve elderly and needy'],
  Rahu:    ['Chant Rahu mantra', 'Donate black items on Saturdays', "Wear Hessonite (Gomed)", 'Meditate regularly'],
  Ketu:    ['Chant Ketu mantra', 'Donate multi-colored items', 'Wear Cat\'s Eye (Lehsunia)', 'Practice spiritual study'],
};

// Opportunity descriptions per planet
const PLANET_OPPORTUNITY = {
  Sun:     'Focus on leadership, government dealings, and personal authority. Health and career come into focus.',
  Moon:    'Emotional growth, family bonds, and intuition are heightened. Excellent for creative pursuits and travel.',
  Mars:    'Energy for action, competition, and courage. Good for sports, real estate, and technical fields.',
  Mercury: 'Intelligence shines — ideal for business, communication, writing, and education. Travel is favored.',
  Jupiter:'Expansion in all areas of life. Excellent for education, spirituality, marriage, and financial growth.',
  Venus:   'Prosperity, luxury, love, and artistic expression. Relationships flourish. Creative fields thrive.',
  Saturn:  'Period of discipline, hard work, and karmic resolution. Slow but steady progress. Build foundations.',
  Rahu:    'Sudden changes, foreign connections, and unconventional paths. Ambitious growth through disruption.',
  Ketu:    'Spiritual awakening, detachment, and inner wisdom. Past-life connections resurface. Research and spirituality.',
};

/**
 * Calculate Moon's longitude from birth data
 * Note: This is an approximation. For precision, use the AstrologyAPI planet data.
 * We use the API's Moon position when available.
 */
function getMoonLongitudeFromPlanets(planets) {
  if (!planets || !Array.isArray(planets)) return null;
  const moon = planets.find(p => {
    const name = (p.name || p.planet_name || '').toLowerCase();
    return name === 'moon' || name === 'चंद्र' || name === 'চন্দ্র';
  });
  if (!moon) return null;
  return parseFloat(moon.fullDegree || moon.full_degree || moon.longitude) || null;
}

/**
 * Get Nakshatra info from Moon's longitude
 */
function getNakshatraFromLongitude(moonLong) {
  if (moonLong === null || isNaN(moonLong)) return null;
  const normalLong = ((moonLong % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalLong / NAKSHATRA_SPAN_DEG);
  const posInNakshatra = normalLong - nakshatraIndex * NAKSHATRA_SPAN_DEG;
  const fractionElapsed = posInNakshatra / NAKSHATRA_SPAN_DEG;

  return {
    index: nakshatraIndex,
    lord: NAKSHATRA_LORDS[nakshatraIndex % 27],
    fractionElapsed, // how much of this nakshatra has elapsed (0-1)
  };
}

/**
 * Calculate the full dasha timeline starting from birth date
 *
 * @param {Object} birthData - { day, month, year }
 * @param {Array}  planets   - from AstrologyAPI (to get Moon longitude)
 * @param {number} yearsAhead
 * @returns {Array} dasha periods
 */
export function getDashaTimeline(birthData, planets, yearsAhead = 12) {
  const moonLong = getMoonLongitudeFromPlanets(planets);
  const nakshatra = moonLong !== null ? getNakshatraFromLongitude(moonLong) : null;

  // If we can't compute nakshatra, fall back to estimated start
  const startLord = nakshatra ? nakshatra.lord : 'Ketu';
  const fractionElapsed = nakshatra ? nakshatra.fractionElapsed : 0;

  // Find starting Mahadasha in the cycle
  const startIdx = MAHADASHA_ORDER.findIndex(d => d.planet === startLord);
  if (startIdx === -1) return [];

  // Birth date as JS Date
  const birthDate = new Date(
    Number(birthData.year),
    Number(birthData.month) - 1,
    Number(birthData.day)
  );

  // Build the full timeline
  const timeline = [];
  const now = new Date();

  // Start from the birth date; first dasha is partially elapsed
  let cursor = new Date(birthDate);
  let firstDasha = true;

  for (let cycle = 0; cycle < 2; cycle++) { // 2 full cycles = 240 years (more than enough)
    for (let i = 0; i < MAHADASHA_ORDER.length; i++) {
      const idx = (startIdx + i + cycle * MAHADASHA_ORDER.length) % MAHADASHA_ORDER.length;
      const dasha = MAHADASHA_ORDER[idx];

      let durationYears = dasha.years;
      if (firstDasha) {
        durationYears = dasha.years * (1 - fractionElapsed);
        firstDasha = false;
      }

      const endDate = new Date(cursor);
      endDate.setDate(endDate.getDate() + Math.round(durationYears * 365.25));

      // Only include if within our window or current
      const isActive = cursor <= now && now <= endDate;
      const isFuture = cursor > now;
      const isPast   = endDate < now;

      // Stop if far past our window
      const yearsFromNow = (cursor - now) / (365.25 * 24 * 3600 * 1000);
      if (yearsFromNow > yearsAhead) break;

      timeline.push({
        planet:        dasha.planet,
        startDate:     new Date(cursor),
        endDate:       new Date(endDate),
        durationYears: Math.round(durationYears * 10) / 10,
        isActive,
        isFuture,
        isPast,
        nature:        PLANET_NATURE[dasha.planet],
        color:         PLANET_COLORS[dasha.planet],
        emoji:         PLANET_EMOJIS[dasha.planet],
        remedies:      PLANET_REMEDIES[dasha.planet] || [],
        opportunity:   PLANET_OPPORTUNITY[dasha.planet] || '',
      });

      cursor = new Date(endDate);
    }
  }

  return timeline;
}

/**
 * Get the next dasha transition (soonest future start date)
 */
export function getNextTransition(timeline) {
  const now = new Date();
  return timeline.find(d => d.startDate > now) || null;
}

/**
 * Get the currently active dasha
 */
export function getActiveDasha(timeline) {
  return timeline.find(d => d.isActive) || null;
}

/**
 * Format a date as a readable string
 */
export function formatDashaDate(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Get countdown text to next dasha transition
 * @returns {string} e.g. "Starts in 8 months" or "Starts in 2 years 3 months"
 */
export function getCountdownText(futureDate) {
  const now = new Date();
  const diffMs = futureDate - now;
  if (diffMs <= 0) return 'Starting now';

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;

  if (years > 0 && months > 0) return `${years}y ${months}mo`;
  if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export { PLANET_COLORS, PLANET_EMOJIS, PLANET_NATURE };
