// Destination photos, via Unsplash when UNSPLASH_ACCESS_KEY is configured
// (https://unsplash.com/developers), falling back to Pexels when
// PEXELS_API_KEY is configured (https://www.pexels.com/api/) or when Unsplash
// returns nothing / fails. With neither key set, returns an empty list with a
// disclaimer so the UI can simply hide the gallery.
//
// Both providers require photos to be hotlinked (not re-hosted) and credited
// to the photographer, so every photo carries its attribution fields.

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const APP_NAME = 'next_trip'; // Used in Unsplash's required UTM referral params.

// Free tiers are tight (Unsplash demo: 50 req/hour), so cache per query.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map();

const withUtm = (url) => `${url}${url.includes('?') ? '&' : '?'}utm_source=${APP_NAME}&utm_medium=referral`;

async function fromUnsplash(query, limit) {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${limit}&orientation=landscape&content_filter=high`;
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
  });
  if (!response.ok) throw new Error(`Unsplash request failed: ${response.status}`);

  const data = await response.json();
  return (data.results || []).map((p) => ({
    id: `unsplash-${p.id}`,
    url: p.urls?.regular,
    thumbUrl: p.urls?.small,
    alt: p.alt_description || p.description || query,
    width: p.width,
    height: p.height,
    color: p.color || null,
    photographer: p.user?.name || 'Unknown',
    photographerUrl: p.user?.links?.html ? withUtm(p.user.links.html) : null,
    sourceUrl: p.links?.html ? withUtm(p.links.html) : null,
    provider: 'unsplash',
  }));
}

async function fromPexels(query, limit) {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&per_page=${limit}&orientation=landscape`;
  const response = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!response.ok) throw new Error(`Pexels request failed: ${response.status}`);

  const data = await response.json();
  return (data.photos || []).map((p) => ({
    id: `pexels-${p.id}`,
    url: p.src?.large,
    thumbUrl: p.src?.medium,
    alt: p.alt || query,
    width: p.width,
    height: p.height,
    color: p.avg_color || null,
    photographer: p.photographer || 'Unknown',
    photographerUrl: p.photographer_url || null,
    sourceUrl: p.url || null,
    provider: 'pexels',
  }));
}

const PROVIDERS = [
  { name: 'unsplash', enabled: () => !!UNSPLASH_ACCESS_KEY, fetch: fromUnsplash, label: 'Photos via Unsplash.' },
  { name: 'pexels', enabled: () => !!PEXELS_API_KEY, fetch: fromPexels, label: 'Photos via Pexels.' },
];

async function getDestinationPhotos(query, limit = 8) {
  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const enabled = PROVIDERS.filter((p) => p.enabled());
  if (!enabled.length) {
    return {
      source: 'none',
      disclaimer: 'Set UNSPLASH_ACCESS_KEY or PEXELS_API_KEY on the server to show destination photos.',
      photos: [],
    };
  }

  for (const provider of enabled) {
    try {
      const photos = (await provider.fetch(query, limit)).filter((p) => p.url);
      if (photos.length) {
        const value = { source: provider.name, disclaimer: provider.label, photos };
        if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
        cache.set(cacheKey, { at: Date.now(), value });
        return value;
      }
    } catch (error) {
      console.error(`${provider.name} photo fetch failed, trying next provider:`, error.message);
    }
  }

  // Not cached, so a transient provider outage doesn't stick for 24h.
  return { source: 'none', disclaimer: 'No photos found for this destination.', photos: [] };
}

module.exports = { getDestinationPhotos };
