// Destination news, via GNews.io when GNEWS_API_KEY is configured (free tier,
// https://gnews.io — sign up for a key). Falls back to generic travel-safety
// tips (clearly labeled as sample content, not live news) when no key is set
// or the request fails, so the tab always has something useful to show.

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '';

function mockArticles(query) {
  return {
    source: 'mock',
    disclaimer: 'Sample travel tips — set GNEWS_API_KEY on the server to show live news for this destination.',
    articles: [
      {
        title: `Before you go: general travel tips for ${query}`,
        description: 'Check local visa/entry requirements, keep copies of your documents, and register with your embassy\'s travel advisory service if traveling internationally.',
        url: null,
        publishedAt: null,
        source: 'Travel Planner',
      },
      {
        title: `Local etiquette and safety basics for ${query}`,
        description: 'Research local customs, emergency numbers, and common scams for your destination before you arrive.',
        url: null,
        publishedAt: null,
        source: 'Travel Planner',
      },
      {
        title: 'Stay updated while traveling',
        description: 'Follow your destination country\'s official tourism board and foreign-travel-advisory pages for the latest updates during your trip.',
        url: null,
        publishedAt: null,
        source: 'Travel Planner',
      },
    ],
  };
}

async function getDestinationNews(query) {
  if (!GNEWS_API_KEY) {
    return mockArticles(query);
  }

  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&token=${GNEWS_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GNews request failed: ${response.status}`);

    const data = await response.json();
    return {
      source: 'gnews',
      disclaimer: 'Live news via GNews.io.',
      articles: (data.articles || []).map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'GNews',
      })),
    };
  } catch (error) {
    console.error('GNews fetch failed, falling back to mock articles:', error.message);
    return mockArticles(query);
  }
}

module.exports = { getDestinationNews };
