// Deterministic mock weather generator, keyed by destination id + date so
// repeated requests for the same day return the same values.

const CONDITIONS = [
  { condition: 'Sunny', icon: '☀️' },
  { condition: 'Partly Cloudy', icon: '⛅' },
  { condition: 'Cloudy', icon: '☁️' },
  { condition: 'Light Rain', icon: '🌦️' },
  { condition: 'Clear', icon: '🌤️' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick(list, seed) {
  return list[seed % list.length];
}

function currentWeatherFor(destinationId) {
  const seed = hashString(destinationId + new Date().toDateString());
  const { condition, icon } = pick(CONDITIONS, seed);
  return {
    temp: 15 + (seed % 20),
    condition,
    humidity: 30 + (seed % 60),
    windSpeed: 5 + (seed % 25),
    icon,
  };
}

function forecastFor(destinationId, days = 7) {
  const current = currentWeatherFor(destinationId);
  const forecast = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const seed = hashString(destinationId + date.toDateString());
    const { condition, icon } = pick(CONDITIONS, seed);
    const tempMax = 18 + (seed % 15);
    return {
      date: date.toISOString().split('T')[0],
      tempMax,
      tempMin: tempMax - 6 - (seed % 5),
      condition,
      icon,
    };
  });

  return { current, forecast };
}

module.exports = { currentWeatherFor, forecastFor };
