// Builds a day-by-day itinerary suggestion from a destination's locations,
// mixing tourist sites, hidden gems, and a meal stop per day so each day
// covers a well-rounded set of spots.

const VISIT_MINUTES = {
  tourist_site: 90,
  attraction: 90,
  hidden_gem: 60,
  restaurant: 60,
};

const DAILY_AVAILABLE_MINUTES = 8 * 60; // a comfortable sightseeing day

/** Suggests the minimum number of days needed to reasonably cover the top spots. */
function suggestMinDays(locations) {
  const sights = locations.filter((l) => l.type === 'tourist_site' || l.type === 'attraction' || l.type === 'hidden_gem');
  const totalMinutes = sights.reduce((sum, l) => sum + (VISIT_MINUTES[l.type] || 60), 0);
  return Math.max(1, Math.ceil(totalMinutes / DAILY_AVAILABLE_MINUTES));
}

/**
 * Distributes locations across `days`, prioritizing higher-rated tourist
 * sites and hidden gems, mixing in one restaurant per day, and packing each
 * day up to a comfortable time budget.
 */
function buildItinerary(locations, days) {
  const byType = (type) =>
    locations
      .filter((l) => l.type === type)
      .slice()
      .sort((a, b) => b.rating - a.rating);

  const sights = [...byType('tourist_site'), ...byType('hidden_gem')];
  const restaurants = byType('restaurant');

  const plan = [];
  let sightIndex = 0;

  for (let dayNumber = 1; dayNumber <= days; dayNumber++) {
    const stops = [];
    let minutesUsed = 0;

    // Alternate a couple of sights, aiming for a mix of tourist sites + hidden gems.
    while (sightIndex < sights.length && minutesUsed < DAILY_AVAILABLE_MINUTES - VISIT_MINUTES.restaurant) {
      const location = sights[sightIndex];
      const duration = VISIT_MINUTES[location.type] || 60;
      if (minutesUsed + duration > DAILY_AVAILABLE_MINUTES) break;
      stops.push({ ...location, visitMinutes: duration });
      minutesUsed += duration;
      sightIndex++;
    }

    const restaurant = restaurants[(dayNumber - 1) % Math.max(restaurants.length, 1)];
    if (restaurant) {
      stops.push({ ...restaurant, visitMinutes: VISIT_MINUTES.restaurant });
      minutesUsed += VISIT_MINUTES.restaurant;
    }

    plan.push({
      dayNumber,
      stops,
      estimatedMinutes: minutesUsed,
      touristSiteCount: stops.filter((s) => s.type === 'tourist_site').length,
      hiddenGemCount: stops.filter((s) => s.type === 'hidden_gem').length,
    });
  }

  const uncoveredCount = Math.max(0, sights.length - sightIndex);

  return { plan, uncoveredCount };
}

module.exports = { suggestMinDays, buildItinerary };
