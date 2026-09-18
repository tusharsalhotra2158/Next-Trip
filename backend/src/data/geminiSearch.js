// Natural-language place search via the Gemini API
// (https://ai.google.dev/gemini-api/docs), used only when GEMINI_API_KEY is
// configured. This is separate from the existing structured country/state/city
// search (backend/src/data/citySearch.js), which stays the fast, free,
// offline default for the cascading dropdowns — Gemini is for free-form
// queries like "quiet beach towns in Kerala" that a structured picker can't
// answer.
//
// Falls back to a clearly-labeled empty/sample result with a disclaimer when
// no key is set or the request fails, matching the pattern used by
// backend/src/data/news.js for GNews.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'City or place name' },
          country: { type: 'string', description: 'Country name' },
          countryCode: { type: 'string', description: 'ISO 3166-1 alpha-2 country code, if known' },
          region: { type: 'string', description: 'State/province/region, if applicable', nullable: true },
          description: { type: 'string', description: 'One short paragraph describing the place' },
          whyMatch: { type: 'string', description: "One short sentence on why this matches the user's query" },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
        },
        required: ['name', 'country', 'description', 'whyMatch'],
      },
    },
  },
  required: ['places'],
};

function buildPrompt(query, limit) {
  return (
    `You are a travel destination search assistant. A traveler searched for: "${query}".\n\n` +
    `Suggest up to ${limit} real, specific places (cities, towns, or well-known regions) that genuinely ` +
    `match this query. Do not invent places. For each, give its name, country, ISO2 country code if you ` +
    `know it, region/state if applicable, a short one-paragraph description, a one-sentence explanation of ` +
    `why it matches the query, and approximate latitude/longitude only if you are confident of it (otherwise ` +
    `omit or use null). Respond with JSON matching the given schema only.`
  );
}

function fallback(disclaimer) {
  return { source: 'gemini', disclaimer, results: [] };
}

function slugId(name, country) {
  return `ai_${(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${(country || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/**
 * Natural-language place search.
 * @param {{ q: string, limit?: number }} params
 */
async function aiSearchPlaces({ q, limit }) {
  const query = (q || '').toString().trim();
  const cap = limit ? Math.min(Number(limit), 10) : 6;

  if (!query) return fallback(null);

  if (!GEMINI_API_KEY) {
    return fallback('Set GEMINI_API_KEY on the server to enable AI-powered natural-language place search.');
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(query, cap) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini request failed: ${response.status} ${body}`.trim());
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini response had no content');

    const parsed = JSON.parse(text);
    const places = Array.isArray(parsed.places) ? parsed.places : [];

    const results = places.slice(0, cap).map((p) => ({
      type: 'city',
      id: slugId(p.name, p.country),
      name: p.name,
      country: p.country,
      country_code: p.countryCode || null,
      countryCode: p.countryCode || null,
      region: p.region || null,
      description: p.description || null,
      whyMatch: p.whyMatch || null,
      latitude: typeof p.latitude === 'number' ? p.latitude : null,
      longitude: typeof p.longitude === 'number' ? p.longitude : null,
      label: [p.name, p.region, p.country].filter(Boolean).join(', '),
    }));

    return { source: 'gemini', disclaimer: null, results };
  } catch (error) {
    console.error('Gemini place search failed:', error.message);
    return fallback('AI search is temporarily unavailable. Please try the regular search instead.');
  }
}

module.exports = { aiSearchPlaces };
