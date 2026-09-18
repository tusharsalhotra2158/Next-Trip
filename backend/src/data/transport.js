// Mock train/bus schedules and approximate road-condition estimates.
//
// There is no genuine free public API for Indian Railways/state bus
// availability (IRCTC and bus operators are B2B-only), and live traffic
// data sits behind paid APIs. Everything here is deterministic sample data
// clearly labeled as an estimate — swap in a real aggregator once you have
// commercial credentials.

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

const TRAIN_OPERATORS = ['Shatabdi Express', 'Rajdhani Express', 'Jan Shatabdi', 'Intercity Express'];
const BUS_OPERATORS = ['State Roadways', 'Volvo Sleeper', 'Express Coach', 'City Link Bus'];
const TRAFFIC_LEVELS = ['light', 'moderate', 'heavy'];
const ROAD_NOTES = {
  light: ['Roads are clear with normal traffic flow.', 'Good time to travel; minimal delays expected.'],
  moderate: ['Some congestion near city centers during peak hours.', 'Expect minor delays around markets and junctions.'],
  heavy: ['Significant congestion reported; consider leaving earlier.', 'Roadwork or heavy traffic may add delay to your trip.'],
};

// Average speeds used to turn a real route distance into a plausible
// duration per mode, when the caller supplies one (from the OSRM-based
// road-distance lookup). Without a distance, falls back to the previous
// arbitrary-but-seeded duration so the tab still has something to show.
const AVG_SPEED_KMH = { train: 60, bus: 42 };

function mockTransportOptions(destinationId, dateStr, distanceKm) {
  const rand = seededRandom(hashString(destinationId + dateStr));
  const hasDistance = typeof distanceKm === 'number' && distanceKm > 0;

  const trains = Array.from({ length: 3 }, (_, i) => {
    const departureHour = 6 + i * 5;
    const baseDuration = hasDistance
      ? distanceKm / AVG_SPEED_KMH.train
      : 2 + Math.floor(rand() * 4);
    // A few minutes of stop-time jitter per trip, distinct per generated option.
    const durationHours = Math.max(0.5, Math.round((baseDuration + (rand() * 0.6 - 0.3)) * 10) / 10);
    return {
      id: `train_${destinationId}_${i}`,
      operator: TRAIN_OPERATORS[Math.floor(rand() * TRAIN_OPERATORS.length)],
      trainNumber: `${12000 + Math.floor(rand() * 900)}`,
      departureTime: `${String(departureHour).padStart(2, '0')}:${rand() > 0.5 ? '00' : '30'}`,
      durationHours,
      classOptions: ['Sleeper', 'AC 3-Tier', 'AC 2-Tier'],
      fareEstimateUsd: Math.round((8 + durationHours * 3 + rand() * 5) * 100) / 100,
      seatsAvailable: Math.floor(rand() * 80),
    };
  });

  const buses = Array.from({ length: 3 }, (_, i) => {
    const departureHour = 5 + i * 6;
    const baseDuration = hasDistance
      ? distanceKm / AVG_SPEED_KMH.bus
      : 2 + Math.floor(rand() * 5);
    const durationHours = Math.max(0.5, Math.round((baseDuration + (rand() * 0.8 - 0.4)) * 10) / 10);
    return {
      id: `bus_${destinationId}_${i}`,
      operator: BUS_OPERATORS[Math.floor(rand() * BUS_OPERATORS.length)],
      departureTime: `${String(departureHour % 24).padStart(2, '0')}:${rand() > 0.5 ? '00' : '30'}`,
      durationHours,
      busType: rand() > 0.5 ? 'AC Sleeper' : 'Non-AC Seater',
      fareEstimateUsd: Math.round((4 + durationHours * 1.5 + rand() * 3) * 100) / 100,
      seatsAvailable: Math.floor(rand() * 40),
    };
  });

  return {
    trains,
    buses,
    disclaimer: hasDistance
      ? `Estimated schedule based on ${Math.round(distanceKm)} km road distance — no live booking data. Verify actual times and availability with IRCTC or the local state transport operator before booking.`
      : 'Estimated schedule for planning purposes only — no live booking data. Verify actual times and availability with IRCTC or the local state transport operator before booking.',
  };
}

function mockRoadConditions(originKey, destLat, destLng, dateStr) {
  const rand = seededRandom(hashString(`${originKey}:${destLat}:${destLng}:${dateStr}`));
  const level = TRAFFIC_LEVELS[Math.floor(rand() * TRAFFIC_LEVELS.length)];
  const notes = ROAD_NOTES[level];

  return {
    trafficLevel: level,
    note: notes[Math.floor(rand() * notes.length)],
    disclaimer: 'Approximate road-condition estimate for planning purposes — not live traffic data.',
  };
}

module.exports = { mockTransportOptions, mockRoadConditions };
