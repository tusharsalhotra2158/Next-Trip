import Image from 'next/image';
import Link from 'next/link';

const footerLink =
  'text-sm text-cream no-underline opacity-85 transition-opacity duration-200 ' +
  'hover:opacity-100 hover:underline hover:decoration-terracotta';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-forest-dark text-cream">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-6 px-6 pt-9 pb-5">
        <div className="flex max-w-[360px] items-start gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[9px]" />
          <div>
            <p className="m-0 font-display text-lg font-bold">Next Trip</p>
            <p className="mt-1 mb-0 text-[13px] text-cream-soft opacity-85">
              Plan your next adventure, all in one place.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-5">
          <Link href="/travel/search" className={footerLink}>
            Search
          </Link>
          <Link href="/dashboard" className={footerLink}>
            Dashboard
          </Link>
          <Link href="/login" className={footerLink}>
            Login
          </Link>
          <Link href="/signup" className={footerLink}>
            Sign Up
          </Link>
        </nav>
      </div>

      <div className="border-t border-[rgba(250,245,236,0.15)] px-6 py-[14px] text-center">
        <p className="m-0 text-xs opacity-70">© {year} Next Trip. All rights reserved.</p>
      </div>
    </footer>
  );
}
