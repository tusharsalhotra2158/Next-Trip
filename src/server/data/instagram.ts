/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Public Instagram videos for a destination via the Instagram Graph API's
// Hashtag Search (e.g. "Chandigarh" → #chandigarh → its top public videos).
// This is the only public-content search Instagram's API allows.
//
// Requires (see .env.example): an Instagram Business/Creator account linked
// to a Facebook Page, a Meta app with the `instagram_basic` permission and
// the "Instagram Public Content Access" feature approved via App Review, and
// a long-lived access token. Without IG_BUSINESS_ACCOUNT_ID + IG_ACCESS_TOKEN,
// returns an empty list with a disclaimer so the UI hides the section.
//
// Limits: Meta allows only 30 *unique* hashtags per rolling 7 days per
// account. Hashtag IDs never change, so they're cached for the process
// lifetime and a local counter refuses new lookups before Meta would.
// (On serverless hosting "process lifetime" means until the next cold start,
// so the local 30/week guard is best-effort there.)
//
// Data minimisation: only the video URL, permalink and timestamp are
// requested — no captions or counts. (Meta doesn't expose the poster's
// username on hashtag results at all.)

import { persistent } from '../store';

const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID || '';
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN || '';
// Optional, e.g. "v23.0". Unversioned calls use the app's default version.
const IG_GRAPH_VERSION = process.env.IG_GRAPH_VERSION || '';
const GRAPH_BASE = `https://graph.facebook.com${IG_GRAPH_VERSION ? `/${IG_GRAPH_VERSION}` : ''}`;

interface InstagramResult {
  source: string;
  hashtag: string | null;
  disclaimer: string;
  videos: { id: string; videoUrl: string; permalink: string; timestamp: string | null }[];
}

const WEEKLY_HASHTAG_LIMIT = 30;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Instagram CDN media URLs expire, so don't hold results too long.
const MEDIA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const hashtagIds = persistent('instagram.hashtagIds', () => new Map<string, string | null>()); // hashtag → id (stable, never expires)
const lookupTimes = persistent('instagram.lookupTimes', () => [] as number[]); // timestamps of unique-hashtag lookups, for the 30/week guard
const mediaCache = persistent('instagram.mediaCache', () => new Map<string, { at: number; value: InstagramResult }>()); // hashtag|limit → { at, value }

// "New Delhi" → "newdelhi", "Rishikesh, India" → "rishikesh". Hashtags can't
// contain spaces/punctuation and the API rejects emoji.
export function toHashtag(placeName: string) {
  return (placeName || '')
    .split(',')[0]
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
    .slice(0, 100);
}

async function graphGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const response = await fetch(`${GRAPH_BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    // Graph errors include a message but never echo the token back.
    throw new Error(`Instagram Graph request failed: ${response.status} ${data.error?.message || ''}`.trim());
  }
  return data;
}

async function getHashtagId(hashtag: string): Promise<string | null> {
  if (hashtagIds.has(hashtag)) return hashtagIds.get(hashtag) ?? null;

  const now = Date.now();
  while (lookupTimes.length && now - lookupTimes[0] > WEEK_MS) lookupTimes.shift();
  if (lookupTimes.length >= WEEKLY_HASHTAG_LIMIT) {
    const err = new Error('Weekly Instagram hashtag limit reached') as Error & { quota?: boolean };
    err.quota = true;
    throw err;
  }

  const data = await graphGet('ig_hashtag_search', { user_id: IG_BUSINESS_ACCOUNT_ID, q: hashtag });
  lookupTimes.push(now);
  const id = data.data?.[0]?.id || null;
  hashtagIds.set(hashtag, id); // cache misses too, so a tag with no ID isn't re-looked-up
  return id;
}

export async function getDestinationInstagramVideos(placeName: string, limit = 6): Promise<InstagramResult> {
  if (!IG_BUSINESS_ACCOUNT_ID || !IG_ACCESS_TOKEN) {
    return {
      source: 'none',
      hashtag: null,
      disclaimer: 'Set IG_BUSINESS_ACCOUNT_ID and IG_ACCESS_TOKEN on the server to show public Instagram videos.',
      videos: [],
    };
  }

  const hashtag = toHashtag(placeName);
  if (!hashtag) return { source: 'none', hashtag: null, disclaimer: 'No hashtag for this destination.', videos: [] };

  const cacheKey = `${hashtag}|${limit}`;
  const cached = mediaCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MEDIA_CACHE_TTL_MS) return cached.value;

  try {
    const hashtagId = await getHashtagId(hashtag);
    if (!hashtagId) {
      return { source: 'none', hashtag, disclaimer: `No Instagram posts found for #${hashtag}.`, videos: [] };
    }

    // Ask for a full page since most top media are images; keep only videos.
    const data = await graphGet(`${hashtagId}/top_media`, {
      user_id: IG_BUSINESS_ACCOUNT_ID,
      fields: 'id,media_type,media_url,permalink,timestamp',
      limit: '50',
    });
    const videos = (data.data || [])
      .filter((m: any) => m.media_type === 'VIDEO' && m.media_url && m.permalink)
      .slice(0, limit)
      .map((m: any) => ({ id: m.id, videoUrl: m.media_url, permalink: m.permalink, timestamp: m.timestamp || null }));

    const value = { source: 'instagram', hashtag, disclaimer: `Top public videos tagged #${hashtag} on Instagram.`, videos };
    if (mediaCache.size >= CACHE_MAX_ENTRIES) mediaCache.delete(mediaCache.keys().next().value!);
    mediaCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (error) {
    console.error('Instagram fetch failed:', (error as Error).message);
    return {
      source: 'none',
      hashtag,
      disclaimer: (error as Error & { quota?: boolean }).quota
        ? 'Instagram search limit reached for this week — try again later.'
        : 'Instagram videos are unavailable right now.',
      videos: [],
    };
  }
}
