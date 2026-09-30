import type { ReactNode } from 'react';
import type { DestinationExplore, ExplorePlace, ExploreTicket, ExploreTrek } from '@/lib/types';
import { formatDate, formatInr, formatNumber } from './format';
import { SECTION_CARD_CLASS, SectionHeader } from './MediaSections';

const linkProps = { target: '_blank', rel: 'noopener noreferrer' } as const;

const EXPLORE_BTN =
  'shrink-0 cursor-pointer rounded-full border-[1.5px] border-terracotta bg-transparent px-3.5 py-2 text-[13px] font-semibold text-terracotta transition-[background,color] duration-200 ease-[ease] enabled:hover:bg-terracotta enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
const STATUS = 'm-0 text-sm text-ink-soft';
const SUBHEAD = 'mt-[22px] mb-3 text-base leading-[1.2] font-bold text-ink first-of-type:mt-0';
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4';
const CARD = 'flex flex-col rounded-[18px] bg-cream p-4';
const CARD_TOP = 'flex items-start justify-between gap-2';
const CARD_TITLE = 'm-0 text-[15px] leading-[1.2] font-bold text-ink';
const CHIP_BASE = 'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';
const CHIP = `${CHIP_BASE} bg-[rgba(242,100,60,0.1)] text-terracotta`;
const DIFFICULTY_CHIP: Record<ExploreTrek['difficulty'], string> = {
  Easy: `${CHIP_BASE} bg-[rgba(31,122,77,0.12)] text-[#1f7a4d]`,
  Moderate: `${CHIP_BASE} bg-[rgba(168,106,0,0.12)] text-[#a86a00]`,
  Difficult: `${CHIP_BASE} bg-[rgba(179,38,30,0.12)] text-[#b3261e]`,
};
const DESC = 'mt-2 mb-2.5 text-[13px] leading-[1.45] text-ink-soft';
const FACTS = 'm-0 mb-2.5 list-none p-0 text-xs leading-[1.7] text-ink-soft';
const LINKS = 'mt-auto flex flex-wrap gap-3 text-xs font-semibold';
const LINK = 'text-terracotta no-underline hover:underline';
const TICKET_LINE = 'm-0 text-[13px] font-semibold text-ink';
const TICKET_NOTES = 'mt-1.5 mb-0 text-[11px] text-ink-soft';

function SrcBadge({ verified, children }: { verified: boolean; children: ReactNode }) {
  return (
    <span
      className={`ml-1 rounded-full px-1.5 py-px text-[10px] font-semibold whitespace-nowrap ${
        verified ? 'bg-[rgba(31,122,77,0.12)] text-[#1f7a4d]' : 'bg-[rgba(168,106,0,0.12)] text-[#8a5a00]'
      }`}
    >
      {children}
    </span>
  );
}

function hasEstimatedPrice(ticket: ExploreTicket): boolean {
  return [ticket.indianAdult, ticket.foreignAdult, ticket.child].some((p) => typeof p === 'number');
}

function TicketBox({ ticket }: { ticket: ExploreTicket }) {
  return (
    <div className="mb-2.5 rounded-xl bg-white px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink">
        🎟️ Entry ticket
        <SrcBadge verified={ticket.source === 'osm'}>{ticket.source === 'osm' ? 'OpenStreetMap' : 'approx.'}</SrcBadge>
      </div>
      {ticket.source === 'osm' && (
        <>
          {ticket.free && <p className={TICKET_LINE}>Free entry</p>}
          {!ticket.free && !!ticket.amountInr && (
            <p className={TICKET_LINE}>
              {formatInr(ticket.amountInr)}{' '}
              {ticket.osmCurrency !== 'INR' && <span className={TICKET_NOTES}>({ticket.osmCharge})</span>}
            </p>
          )}
          {!ticket.free && !ticket.amountInr && <p className={TICKET_LINE}>{ticket.osmCharge}</p>}
        </>
      )}
      {ticket.source === 'estimate' && (
        <>
          {ticket.free && <p className={TICKET_LINE}>Free entry</p>}
          {!ticket.free && hasEstimatedPrice(ticket) && (
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {(
                  [
                    ['Indian adult', ticket.indianAdult],
                    ['Foreign adult', ticket.foreignAdult],
                    ['Child', ticket.child],
                  ] as const
                ).map(([label, price]) => (
                  <tr key={label}>
                    <td className="px-0 py-0.5 text-ink-soft">{label}</td>
                    <td className="px-0 py-0.5 text-right font-semibold text-ink">{formatInr(price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!ticket.free && !hasEstimatedPrice(ticket) && (
            <p className={TICKET_LINE}>{ticket.paidPerOsm ? 'Paid entry' : 'Price not known'} — check at the venue</p>
          )}
          {ticket.notes && <p className={TICKET_NOTES}>{ticket.notes}</p>}
        </>
      )}
    </div>
  );
}

function PlaceCard({ place }: { place: ExplorePlace }) {
  return (
    <article className={CARD}>
      <div className={CARD_TOP}>
        <h5 className={CARD_TITLE}>{place.name}</h5>
        <span className={CHIP}>{place.category}</span>
      </div>
      <p className={DESC}>{place.description}</p>

      <TicketBox ticket={place.ticket} />

      <ul className={FACTS}>
        {place.hours && (
          <li>
            🕒 {place.hours}{' '}
            <SrcBadge verified={place.hoursSource === 'osm'}>
              {place.hoursSource === 'osm' ? 'OpenStreetMap' : 'approx.'}
            </SrcBadge>
          </li>
        )}
        <li>
          ⏱️ Plan {place.suggestedDuration}
          {place.bestTimeToVisit && <span> · Best: {place.bestTimeToVisit}</span>}
        </li>
        <li>📍 {place.distanceKm} km from centre</li>
      </ul>
      <div className={LINKS}>
        <a href={place.mapsUrl} {...linkProps} className={LINK}>
          Open in Maps
        </a>
        <a href={place.osmUrl} {...linkProps} className={LINK}>
          OpenStreetMap
        </a>
        {place.website && (
          <a href={place.website} {...linkProps} className={LINK}>
            Official site
          </a>
        )}
      </div>
    </article>
  );
}

export default function ExploreSection({
  destinationName,
  explore,
  loading,
  error,
  onRefresh,
  onRetry,
}: {
  destinationName: string;
  explore: DestinationExplore | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  const hasResults = !!explore && explore.source !== 'none';

  return (
    <div className={SECTION_CARD_CLASS}>
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title={`🌟 Explore ${destinationName}`}>
          Popular places with ticket details, treks and nearby getaways — real places, verified on OpenStreetMap{' '}
          {explore?.generatedAt && <span> · Updated {formatDate(explore.generatedAt, 'MMM d, h:mm a')}</span>}
        </SectionHeader>
        {hasResults && (
          <button
            type="button"
            className={EXPLORE_BTN}
            onClick={onRefresh}
            disabled={loading}
            title="Look up places again instead of using saved results"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {loading && !explore && (
        <p className={STATUS}>
          Finding popular places, treks and getaways… the first search for a destination can take up to a minute.
        </p>
      )}
      {loading && explore && <p className={STATUS}>↻ Refreshing — this can take up to a minute…</p>}
      {!loading && explore?.refreshFailed && (
        <p className={STATUS}>Couldn&apos;t refresh right now — showing the saved results. Please try again in a few minutes.</p>
      )}
      {!loading && (error || explore?.source === 'none') && (
        <div className={STATUS}>
          <p className="m-0 mb-3">{error ? "Couldn't reach the server to load popular places." : explore?.disclaimer}</p>
          {(error || explore?.retryable) && (
            <button type="button" className={EXPLORE_BTN} onClick={onRetry}>
              ↻ Try again
            </button>
          )}
        </div>
      )}

      {hasResults && (
        <>
          {explore.places.length > 0 && <h4 className={SUBHEAD}>🏛️ Popular places to visit</h4>}
          <div className={GRID}>
            {explore.places.map((place, i) => (
              <PlaceCard key={`${place.name}-${i}`} place={place} />
            ))}
          </div>

          {explore.treks.length > 0 && <h4 className={SUBHEAD}>🥾 Nearby treks</h4>}
          <div className={GRID}>
            {explore.treks.map((trek, i) => (
              <article key={`${trek.name}-${i}`} className={CARD}>
                <div className={CARD_TOP}>
                  <h5 className={CARD_TITLE}>{trek.name}</h5>
                  <span className={DIFFICULTY_CHIP[trek.difficulty] ?? CHIP} data-level={trek.difficulty}>
                    {trek.difficulty}
                  </span>
                </div>
                <p className={DESC}>{trek.description}</p>
                <ul className={FACTS}>
                  <li>
                    ⏱️ {trek.duration}
                    {!!trek.trailLengthKm && <span> · ~{trek.trailLengthKm} km trail</span>}
                    <SrcBadge verified={false}>approx.</SrcBadge>
                  </li>
                  <li>🚩 Starts at {trek.startPoint}</li>
                  {!!trek.elevationM && (
                    <li>
                      ⛰️ {formatNumber(trek.elevationM)} m elevation <SrcBadge verified>OpenStreetMap</SrcBadge>
                    </li>
                  )}
                  {trek.bestSeason && <li>🗓️ Best season: {trek.bestSeason}</li>}
                  <li>
                    📍 {trek.distanceKm} km from {destinationName}
                  </li>
                </ul>
                <div className={LINKS}>
                  <a href={trek.mapsUrl} {...linkProps} className={LINK}>
                    Open in Maps
                  </a>
                  <a href={trek.osmUrl} {...linkProps} className={LINK}>
                    OpenStreetMap
                  </a>
                </div>
              </article>
            ))}
          </div>

          {explore.nearby.length > 0 && <h4 className={SUBHEAD}>🧭 Nearby getaways</h4>}
          <div className={GRID}>
            {explore.nearby.map((spot, i) => (
              <article key={`${spot.name}-${i}`} className={CARD}>
                <div className={CARD_TOP}>
                  <h5 className={CARD_TITLE}>{spot.name}</h5>
                  <span className={CHIP}>{spot.distanceKm} km</span>
                </div>
                <p className={DESC}>{spot.description}</p>
                <ul className={FACTS}>
                  <li>✨ Best for: {spot.bestFor}</li>
                  <li>🛏️ {spot.suggestedStay}</li>
                </ul>
                <div className={LINKS}>
                  <a href={spot.mapsUrl} {...linkProps} className={LINK}>
                    Open in Maps
                  </a>
                  <a href={spot.osmUrl} {...linkProps} className={LINK}>
                    OpenStreetMap
                  </a>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-[18px] mb-0 text-xs leading-normal text-ink-soft">
            ⚠️ {explore.disclaimer}{' '}
            {!!explore.droppedUnverified && (
              <span>
                {explore.droppedUnverified} suggestion(s) couldn&apos;t be confirmed on OpenStreetMap and were left out.
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
