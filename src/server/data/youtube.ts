/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Destination travel videos via the YouTube Data API v3 when YOUTUBE_API_KEY
// is configured (free key from Google Cloud Console — enable "YouTube Data
// API v3"). Without a key, returns an empty list with a disclaimer so the UI
// can simply hide the section.
//
// The free quota allows only ~100 search.list calls per day (resets at
// midnight Pacific), so results are cached per destination for 24h. Only
// public video metadata is returned — title, channel name (needed for
// attribution), date and thumbnail — nothing about viewers or commenters.

import { persistent } from '../store';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

interface VideosResult {
  source: string;
  disclaimer: string;
  videos: {
    id: string;
    title: string;
    channel: string;
    publishedAt: string | null;
    thumbUrl: string | null;
    url: string;
  }[];
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = persistent('youtube.cache', () => new Map<string, { at: number; value: VideosResult }>());

// search.list returns HTML-escaped titles (e.g. "Paris &amp; Nice"); decode
// them here since the UI escapes interpolated text itself.
const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const decodeEntities = (s = '') => s.replace(/&(amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m]);

export async function getDestinationVideos(query: string, limit = 6): Promise<VideosResult> {
  if (!YOUTUBE_API_KEY) {
    return {
      source: 'none',
      disclaimer: 'Set YOUTUBE_API_KEY on the server to show travel videos for this destination.',
      videos: [],
    };
  }

  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: `${query} travel guide`,
      type: 'video',
      maxResults: String(limit),
      safeSearch: 'strict',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
      key: YOUTUBE_API_KEY,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`YouTube request failed: ${response.status}`);

    const data = await response.json();
    const videos = (data.items || [])
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: decodeEntities(item.snippet?.title),
        channel: decodeEntities(item.snippet?.channelTitle),
        publishedAt: item.snippet?.publishedAt || null,
        thumbUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

    const value = { source: 'youtube', disclaimer: 'Videos via YouTube.', videos };
    if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (error) {
    // Not cached, so a transient failure (or quota reset) is retried next time.
    console.error('YouTube fetch failed:', (error as Error).message);
    return { source: 'none', disclaimer: 'Travel videos are unavailable right now.', videos: [] };
  }
}
