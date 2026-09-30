// Rule-based packing list, derived from the trip's weather outlook and length.
// Not personalized beyond climate/duration/gender — a reasonable generic baseline.

export function buildPackingList(weatherDays: { tempMax?: number; precipitationMm?: number }[], tripDays: number) {
  const temps = weatherDays.map((d) => d.tempMax).filter((t): t is number => typeof t === 'number');
  const avgMax = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 25;
  const willRain = weatherDays.some((d) => (d.precipitationMm || 0) > 2);
  const cold = avgMax < 15;
  const hot = avgMax >= 30;

  const common = [
    'Passport / ID and printed travel documents',
    'Phone charger and power bank',
    'Universal travel adapter',
    'Toiletries kit (travel-size)',
    'Basic first-aid kit and personal medication',
    'Reusable water bottle',
    'Daypack for daily excursions',
    tripDays >= 4 ? 'Laundry bag / detergent sheets' : null,
  ].filter((item): item is string => Boolean(item));

  if (willRain) {
    common.push('Compact umbrella or rain jacket', 'Waterproof footwear or shoe covers');
  }
  if (cold) {
    common.push('Thermal inner wear', 'Warm jacket', 'Gloves and beanie', 'Woolen socks');
  } else if (hot) {
    common.push('Sunscreen (SPF 30+)', 'Sunglasses', 'Cap/hat', 'Light breathable clothing');
  } else {
    common.push('Light jacket for cooler evenings');
  }

  const shirtsCount = Math.min(tripDays, 7);

  const men = [
    `${shirtsCount} T-shirts / casual shirts`,
    `${Math.min(tripDays, 5)} pairs of trousers/shorts`,
    'Comfortable walking shoes',
    'Innerwear and socks (1 per day)',
    cold ? 'Sweater or fleece' : 'Breathable sportswear for activities',
    'Formal outfit (if dining out / events planned)',
  ];

  const women = [
    `${shirtsCount} tops / casual outfits`,
    `${Math.min(tripDays, 5)} bottoms (trousers/skirts/leggings)`,
    'Comfortable walking shoes',
    'Innerwear and socks (1 per day)',
    'A versatile dress or ethnic wear for evenings/events',
    cold ? 'Scarf and warm layers' : 'Light scarf/stole for sun or modesty at religious sites',
    'Small crossbody bag for daily outings',
  ];

  return { common, men, women, tripDays, avgMaxTempC: Math.round(avgMax * 10) / 10 };
}
