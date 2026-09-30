import type { RoadConditions, TransportOptions } from '@/lib/types';
import { formatInrCurrency } from './format';

const ITEM = 'mb-1 flex justify-between gap-2 rounded-md bg-white/12 px-2 py-1.5 text-xs';
const GROUP_TITLE = 'm-0 mb-1.5 text-xs leading-[1.2] font-medium tracking-[0.03em] uppercase opacity-85';

/** "🚆 Vehicle Options": mock train/bus options scaled to the route distance, plus a road/traffic estimate. */
export default function VehicleOptions({
  loading,
  transport,
  road,
}: {
  loading: boolean;
  transport: TransportOptions | null;
  road: RoadConditions | null;
}) {
  return (
    <div className="mt-4 border-t border-white/20 pt-4">
      <h4 className="m-0 mb-2.5 text-sm leading-[1.2] font-medium">🚆 Vehicle Options</h4>
      {loading && <p className="m-0 text-xs opacity-85">Loading options…</p>}

      {transport && (
        <>
          {transport.trains.length > 0 && (
            <div className="mb-2.5">
              <h5 className={GROUP_TITLE}>Trains</h5>
              {transport.trains.map((train) => (
                <div key={train.id} className={ITEM}>
                  <span>
                    {train.operator} · {train.departureTime}
                  </span>
                  <span>
                    {train.durationHours}h · {formatInrCurrency(train.fareEstimate)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {transport.buses.length > 0 && (
            <div className="mb-2.5">
              <h5 className={GROUP_TITLE}>Buses</h5>
              {transport.buses.map((bus) => (
                <div key={bus.id} className={ITEM}>
                  <span>
                    {bus.operator} · {bus.departureTime}
                  </span>
                  <span>
                    {bus.durationHours}h · {formatInrCurrency(bus.fareEstimate)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 mb-0 text-[11px] opacity-75">{transport.disclaimer}</p>
        </>
      )}

      {road && (
        <p className="mt-2.5 mb-0 text-xs opacity-90">
          🛣️ Traffic: {road.trafficLevel} — {road.note}
        </p>
      )}
    </div>
  );
}
