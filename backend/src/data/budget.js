const { getDailyBudgetUsd, getFuelPriceUsdPerLiter, getMileageKmPerLiter, getFareUsdPerKm } = require('./costs');

/**
 * Builds an approximate budget breakdown for a trip.
 *
 * @param {object} params
 * @param {string} params.country - destination country, used to look up cost baselines
 * @param {number} params.days - trip length in days
 * @param {number} params.travelers - number of travelers
 * @param {string} [params.vehicleType] - 'car' | 'bike' | 'bus' | 'train' | 'flight'
 * @param {number} [params.distanceKm] - one-way travel distance, for fuel/fare estimate
 */
function buildBudgetEstimate({ country, days, travelers, vehicleType, distanceKm }) {
  const dailyPerPerson = getDailyBudgetUsd(country);

  // Split the daily per-person baseline into rough categories.
  const accommodation = dailyPerPerson * 0.4 * days * travelers;
  const food = dailyPerPerson * 0.3 * days * travelers;
  const activities = dailyPerPerson * 0.2 * days * travelers;
  const misc = dailyPerPerson * 0.1 * days * travelers;

  let transport = 0;
  let transportNote = 'No travel distance provided — add one-way distance to estimate transport cost.';

  if (vehicleType && distanceKm) {
    const mileage = getMileageKmPerLiter(vehicleType);
    if (mileage) {
      const fuelPrice = getFuelPriceUsdPerLiter(country);
      const liters = (distanceKm * 2) / mileage; // round trip
      transport = liters * fuelPrice;
      transportNote = `Estimated fuel cost for a round trip by ${vehicleType} (~${Math.round(liters)} L at ~$${fuelPrice.toFixed(2)}/L, local pump prices vary).`;
    } else {
      const farePerKm = getFareUsdPerKm(vehicleType);
      if (farePerKm) {
        transport = farePerKm * distanceKm * 2 * travelers;
        transportNote = `Estimated round-trip fare by ${vehicleType} for ${travelers} traveler(s), based on an approximate per-km rate.`;
      }
    }
  }

  const total = accommodation + food + activities + misc + transport;
  const cashBuffer = total * 0.15; // recommended contingency
  const recommendedCash = total + cashBuffer;

  const round = (n) => Math.round(n * 100) / 100;

  return {
    currency: 'USD',
    days,
    travelers,
    dailyBudgetPerPersonUsd: dailyPerPerson,
    breakdown: {
      accommodation: round(accommodation),
      food: round(food),
      activities: round(activities),
      transport: round(transport),
      misc: round(misc),
    },
    transportNote,
    total: round(total),
    contingencyBuffer: round(cashBuffer),
    recommendedCash: round(recommendedCash),
    disclaimer:
      'Approximate planning estimate based on typical mid-range travel costs — actual prices vary by season, booking method, and personal spending habits.',
  };
}

module.exports = { buildBudgetEstimate };
