import styles from './HeroBanner.module.css';

export default function HeroBanner() {
  return (
    <section className="relative mb-6 flex min-h-[280px] items-center overflow-hidden rounded-[28px] shadow-travel max-[640px]:min-h-[220px] max-[640px]:rounded-[20px]">
      <svg
        className="absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 1200 380"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdf9f0" />
            <stop offset="100%" stopColor="#f7e6c9" />
          </linearGradient>
          <linearGradient id="hero-hill-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c6350" />
            <stop offset="100%" stopColor="#1f4d3e" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1200" height="380" fill="url(#hero-sky)" />

        {/* sun */}
        <circle cx="990" cy="110" r="58" fill="#f2b84b" opacity="0.9" />

        {/* flight path */}
        <path
          className={styles.flightPath}
          d="M 60 260 Q 420 40 760 150 T 1080 90"
          fill="none"
          stroke="#d8502b"
          strokeWidth="3"
          strokeDasharray="2 14"
          strokeLinecap="round"
        />

        {/* plane */}
        <g transform="translate(740,145) rotate(18)">
          <path
            d="M0 0 L26 6 L44 0 L26 -6 Z M18 -2 L18 -20 L24 -14 L24 6 Z M18 4 L18 20 L24 14 L24 -4 Z"
            fill="#1c2621"
          />
        </g>

        {/* destination pin */}
        <g transform="translate(1080,90)">
          <path
            d="M0 -26 C14 -26 24 -16 24 -3 C24 14 4 30 0 34 C-4 30 -24 14 -24 -3 C-24 -16 -14 -26 0 -26 Z"
            fill="#f2643c"
          />
          <circle cx="0" cy="-4" r="8" fill="#faf5ec" />
        </g>

        {/* far hills: kept low on the left so the headline stays clear, rising toward the sun on the right */}
        <path
          d="M0 330 Q 220 315 440 328 Q 620 300 760 275 Q 940 210 1200 250 L1200 380 L0 380 Z"
          fill="url(#hero-hill-far)"
          opacity="0.55"
        />

        {/* near hills */}
        <path
          d="M0 360 Q 260 350 480 360 Q 680 335 860 305 Q 1040 255 1200 295 L1200 380 L0 380 Z"
          fill="#1f4d3e"
        />
      </svg>

      <div className="relative z-[1] max-w-[640px] px-10 py-12 max-[640px]:px-[22px] max-[640px]:py-7">
        <span className="mb-4 inline-block rounded-full bg-[rgba(28,38,33,0.08)] px-[14px] py-1.5 text-[13px] font-semibold text-forest-dark">
          ✈️ Wander further
        </span>
        <h1 className="mt-0 mb-3 font-display text-[clamp(28px,4vw,44px)] leading-[1.1] font-extrabold text-ink">
          Plan Your Next Trip
        </h1>
        <p className="m-0 max-w-[480px] text-base text-ink-soft">
          Search a destination, check the weather, build a day-by-day itinerary, and budget the whole thing — all in
          one place.
        </p>
      </div>
    </section>
  );
}
