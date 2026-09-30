/* eslint-disable @typescript-eslint/no-explicit-any -- untyped third-party JSON / request bodies, ported from JS */
// Real, free, no-API-key weather via Open-Meteo (https://open-meteo.com).
// Forecast covers ~16 days ahead; for dates further out we average the same
// calendar dates from the last full year via the archive endpoint and label
// the result as a historical estimate rather than a live forecast.

const WMO_CODE_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Fog', icon: '🌫️' },
  48: { condition: 'Depositing rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌦️' },
  53: { condition: 'Moderate drizzle', icon: '🌦️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  61: { condition: 'Slight rain', icon: '🌦️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '🌧️' },
  71: { condition: 'Slight snow', icon: '🌨️' },
  73: { condition: 'Moderate snow', icon: '🌨️' },
  75: { condition: 'Heavy snow', icon: '❄️' },
  80: { condition: 'Rain showers', icon: '🌦️' },
  81: { condition: 'Moderate rain showers', icon: '🌧️' },
  82: { condition: 'Violent rain showers', icon: '⛈️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
  99: { condition: 'Severe thunderstorm with hail', icon: '⛈️' },
};

export interface OutlookDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
  precipitationMm: number;
  windSpeedMaxKmh: number;
}

function describeCode(code: number) {
  return WMO_CODE_MAP[code] || { condition: 'Unknown', icon: '🌡️' };
}

export function toDateStr(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(startDate: Date, endDate: Date) {
  const days: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function fetchDaily(lat: number, lng: number, startDateStr: string, endDateStr: string, { archive = false } = {}) {
  const base = archive
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';

  const url =
    `${base}?latitude=${lat}&longitude=${lng}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
    `&start_date=${startDateStr}&end_date=${endDateStr}&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }
  return response.json();
}

function mapDailyResponse(data: any): OutlookDay[] {
  const {
    time = [],
    weathercode = [],
    temperature_2m_max = [],
    temperature_2m_min = [],
    precipitation_sum = [],
    windspeed_10m_max = [],
  } = data.daily || {};

  return (time as string[]).map((date, i) => {
    const { condition, icon } = describeCode(weathercode[i]);
    return {
      date,
      tempMax: temperature_2m_max[i],
      tempMin: temperature_2m_min[i],
      condition,
      icon,
      precipitationMm: precipitation_sum[i] ?? 0,
      windSpeedMaxKmh: windspeed_10m_max[i] ?? 0,
    };
  });
}

/**
 * Get a daily weather outlook for [startDate, endDate].
 * Uses the live forecast where the range falls within Open-Meteo's ~16-day
 * forecast horizon; otherwise falls back to last year's actuals for the same
 * calendar dates, labeled as a historical estimate.
 */
export async function getWeatherOutlook(lat: number, lng: number, startDate: Date, endDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const forecastHorizon = addDays(today, 15);

  if (startDate <= forecastHorizon) {
    // Clamp the end date to the forecast horizon; anything beyond it would
    // 400 from the API.
    const clampedEnd = endDate > forecastHorizon ? forecastHorizon : endDate;
    const data = await fetchDaily(lat, lng, toDateStr(startDate), toDateStr(clampedEnd));
    return { source: 'forecast', days: mapDailyResponse(data) };
  }

  // Too far out for a live forecast: use the same calendar dates from last
  // year as a "typical conditions" estimate.
  const lastYearStart = addDays(startDate, -365);
  const lastYearEnd = addDays(endDate, -365);
  const data = await fetchDaily(lat, lng, toDateStr(lastYearStart), toDateStr(lastYearEnd), {
    archive: true,
  });
  const days = mapDailyResponse(data).map((day, i) => ({
    ...day,
    date: toDateStr(daysBetween(startDate, endDate)[i] || startDate),
  }));
  return { source: 'historical-estimate', days };
}
