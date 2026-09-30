// Mock transportation route options (flights/buses/trains/cars).

export function mockRouteOptions(tripId: string | null | undefined, mode: string, date: string | undefined) {
  const basePrice = ({ flight: 250, bus: 40, train: 60, car: 90 } as Record<string, number>)[mode] || 50;
  return Array.from({ length: 3 }, (_, i) => ({
    id: `route_${mode}_${i}`,
    tripId: tripId || 'unassigned',
    mode,
    departureTime: `${(8 + i * 4).toString().padStart(2, '0')}:00`,
    arrivalTime: `${(10 + i * 4).toString().padStart(2, '0')}:30`,
    price: basePrice + i * 25,
    duration: `${2 + i}h 30m`,
    details: { date, provider: `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Co. ${i + 1}` },
    createdAt: new Date().toISOString(),
  }));
}
