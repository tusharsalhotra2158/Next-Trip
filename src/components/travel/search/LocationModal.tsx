import type { Location } from '@/lib/types';
import type { MapLocation } from '../map-types';
import { BTN_PRIMARY, BTN_SECONDARY } from './buttons';
import { formatNumber, titleCase } from './format';
import styles from './search.module.css';

/** A map marker, enriched with the full Location fields when it came from this page's locations list. */
export type SelectedLocation = MapLocation & Partial<Pick<Location, 'reviewsCount' | 'category'>>;

export default function LocationModal({
  location,
  onClose,
  onAddToTrip,
}: {
  location: SelectedLocation;
  onClose: () => void;
  onAddToTrip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 cursor-pointer bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={location.name}
        className={`relative flex w-[90%] max-w-[500px] flex-col rounded-3xl bg-white p-8 shadow-[0_24px_60px_rgba(31,77,62,0.3)] outline-0 ${styles.slideIn}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 box-content h-[1em] w-[1em] cursor-pointer rounded-[0.375rem] border-0 bg-none p-[0.25em] text-[24px] text-[#999] opacity-50 hover:text-[#333] hover:opacity-75 focus:opacity-100 focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-0"
        >
          ✕
        </button>

        <h2 className="m-0 mb-2 text-2xl leading-[1.2] font-bold text-ink">{location.name}</h2>
        <p className="mt-0 mb-5 inline-block rounded-full bg-forest px-3.5 py-1 text-xs text-white">
          {titleCase(location.type)}
        </p>

        <div className="my-6 grid grid-cols-2 gap-4">
          <div className="rounded-[14px] bg-cream p-3.5">
            <span className="mb-1 block text-xs text-ink-soft">Rating</span>
            <span className="block text-sm font-semibold text-ink">⭐ {location.rating}/5</span>
          </div>
          <div className="rounded-[14px] bg-cream p-3.5">
            <span className="mb-1 block text-xs text-ink-soft">Reviews</span>
            <span className="block text-sm font-semibold text-ink">{formatNumber(location.reviewsCount)}</span>
          </div>
          <div className="rounded-[14px] bg-cream p-3.5">
            <span className="mb-1 block text-xs text-ink-soft">Category</span>
            <span className="block text-sm font-semibold text-ink">{location.category}</span>
          </div>
          <div className="rounded-[14px] bg-cream p-3.5">
            <span className="mb-1 block text-xs text-ink-soft">Coordinates</span>
            <span className="block text-sm font-semibold text-ink">
              {location.lat}, {location.lng}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onAddToTrip} className={BTN_PRIMARY}>
            ➕ Add to Trip
          </button>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
