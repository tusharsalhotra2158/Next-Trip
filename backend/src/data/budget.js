const { getDailyBudgetUsd, getFuelPriceUsdPerLiter, getMileageKmPerLiter, getFareUsdPerKm } = require('./costs');
const { convertUsd } = require('./fx');

/**
 * Builds an approximate budget breakdown for a trip.
 *
 * @param {object} params
 * @param {string} params.country - destination country, used to look up cost baselines
 * @param {number} params.days - trip length in days
 * @param {number} params.travelers - number of travelers
 * @param {string} [params.vehicleType] - 'car' | 'bike' | 'bus' | 'train' | 'flight'
 * @param {number} [params.distanceKm] - one-way travel distance, for fuel/fare estimate
 * @param {object} params.fx - display currency + USD rate, from getDisplayFx()
 */
function buildBudgetEstimate({ country, days, travelers, vehicleType, distanceKm, fx }) {
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
      transportNote = `Estimated fuel cost for a round trip by ${vehicleType} (~${Math.round(liters)} L at ~₹${convertUsd(fuelPrice, fx)}/L, local pump prices vary).`;
    } else {
      const farePerKm = getFareUsdPerKm(vehicleType);
      if (farePerKm) {
        transport = farePerKm * distanceKm * 2 * travelers;
        transportNote = `Estimated round-trip fare by ${vehicleType} for ${travelers} traveler(s), based on an approximate per-km rate.`;
      }
    }
  }

  // Convert each line item first and total the converted figures, so the
  // displayed breakdown always adds up exactly to the displayed total.
  const breakdown = {
    accommodation: convertUsd(accommodation, fx),
    food: convertUsd(food, fx),
    activities: convertUsd(activities, fx),
    transport: convertUsd(transport, fx),
    misc: convertUsd(misc, fx),
  };
  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  const cashBuffer = Math.round(total * 0.15); // recommended contingency

  return {
    currency: fx.currency,
    usdRate: fx.usdRate,
    rateDate: fx.rateDate,
    rateSource: fx.rateSource,
    days,
    travelers,
    dailyBudgetPerPerson: convertUsd(dailyPerPerson, fx),
    breakdown,
    transportNote,
    total,
    contingencyBuffer: cashBuffer,
    recommendedCash: total + cashBuffer,
    disclaimer:
      'Approximate planning estimate based on typical mid-range travel costs — actual prices vary by season, booking method, and personal spending habits.',
  };
}

module.exports = { buildBudgetEstimate };
