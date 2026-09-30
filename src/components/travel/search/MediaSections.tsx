/* eslint-disable @next/next/no-img-element -- external photo/thumbnail hosts (Unsplash, Pexels, YouTube) */
import type { ReactNode } from 'react';
import type { DestinationPhoto, DestinationVideo, InstagramVideo } from '@/lib/types';
import { formatDate, titleCase } from './format';

/** White rounded card used by the photos / videos / Instagram / Explore sections. */
export const SECTION_CARD_CLASS = 'mx-auto mt-6 max-w-[1600px] rounded-[28px] bg-white p-7 shadow-travel';

export function SectionHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div>
      <h3 className="m-0 mb-1 text-[20px] leading-[1.2] font-bold text-ink">{title}</h3>
      <p className="m-0 mb-[22px] text-[13px] text-ink-soft">{children}</p>
    </div>
  );
}

const linkProps = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function PhotosSection({
  destinationName,
  photos,
  disclaimer,
}: {
  destinationName: string;
  photos: DestinationPhoto[];
  disclaimer: string;
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeader title={`📸 Photos of ${destinationName}`}>{disclaimer}</SectionHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {photos.map((photo) => (
          <figure
            key={photo.id}
            className="group relative m-0 aspect-[4/3] overflow-hidden rounded-2xl"
            style={{ backgroundColor: photo.color ?? undefined }}
          >
            <a href={photo.sourceUrl ?? undefined} {...linkProps}>
              <img
                src={photo.thumbUrl}
                alt={photo.alt}
                loading="lazy"
                className="block h-full w-full object-cover transition-transform duration-300 ease-[ease] group-hover:scale-[1.04]"
              />
            </a>
            <figcaption className="absolute right-0 bottom-0 left-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.65))] px-2.5 pt-[18px] pb-2 text-[11px] text-white">
              Photo by{' '}
              <a href={photo.photographerUrl ?? undefined} {...linkProps} className="font-semibold text-white underline">
                {photo.photographer}
              </a>{' '}
              on {titleCase(photo.provider)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function VideosSection({
  destinationName,
  videos,
  disclaimer,
}: {
  destinationName: string;
  videos: DestinationVideo[];
  disclaimer: string;
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeader title={`🎬 Travel videos of ${destinationName}`}>{disclaimer}</SectionHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {videos.map((video) => (
          <a
            key={video.id}
            href={video.url}
            {...linkProps}
            className="block overflow-hidden rounded-2xl bg-cream text-inherit no-underline transition-transform duration-200 ease-[ease] hover:-translate-y-[3px]"
          >
            <div className="relative aspect-video bg-black">
              {video.thumbUrl && (
                <img src={video.thumbUrl} alt={video.title} loading="lazy" className="block h-full w-full object-cover" />
              )}
              <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-[18px] text-white">
                ▶
              </span>
            </div>
            <div className="px-3 pt-2.5 pb-3">
              <h4 className="m-0 mb-1 line-clamp-2 text-sm leading-[1.35] font-semibold text-ink">{video.title}</h4>
              <p className="m-0 text-xs text-ink-soft">
                {video.channel}
                {video.publishedAt && <span> · {formatDate(video.publishedAt, 'MMM y')}</span>}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function InstagramSection({
  hashtag,
  videos,
  disclaimer,
}: {
  hashtag: string;
  videos: InstagramVideo[];
  disclaimer: string;
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeader title={`📷 Instagram videos · #${hashtag}`}>{disclaimer}</SectionHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {videos.map((video) => (
          <figure key={video.id} className="m-0 overflow-hidden rounded-2xl bg-cream">
            <video
              src={video.videoUrl}
              controls
              muted
              playsInline
              preload="metadata"
              className="block aspect-[9/16] w-full bg-black object-cover"
            />
            <figcaption className="px-3 pt-2 pb-2.5 text-xs text-ink-soft">
              <a href={video.permalink} {...linkProps} className="font-semibold text-ink underline">
                View on Instagram
              </a>
              {video.timestamp && <span> · {formatDate(video.timestamp, 'MMM d, y')}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
