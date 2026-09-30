'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Mobile breakpoint mirrors the Angular header's `@media (max-width: 720px)`.
const navLinkBase =
  'text-[15px] font-medium text-cream no-underline opacity-85 transition-opacity duration-200 ' +
  'hover:opacity-100 hover:underline hover:decoration-terracotta hover:decoration-2';
const navLinkActive = 'opacity-100 underline decoration-terracotta decoration-2';

const btnBase =
  'inline-flex cursor-pointer items-center justify-center rounded-full border-2 px-[18px] py-2 ' +
  'text-sm font-semibold no-underline transition-all duration-200 ease-in-out max-[720px]:w-full';
const btnOutline = `${btnBase} border-cream bg-transparent text-cream hover:bg-[rgba(250,245,236,0.12)]`;
const btnSolid = `${btnBase} border-transparent bg-terracotta text-cream hover:bg-terracotta-dark`;

/** Same semantics as Angular's routerLinkActive (non-exact: matches the route and its children). */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    router.push('/login');
  };

  const navLink = (href: string) => `${navLinkBase} ${isActive(pathname, href) ? navLinkActive : ''}`;

  return (
    <header className="sticky top-0 z-[100] bg-forest shadow-travel">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-[14px]">
        <Link href="/travel/search" className="flex items-center gap-2.5 text-cream no-underline" onClick={closeMenu}>
          <Image src="/logo.png" alt="" width={40} height={40} loading="eager" className="h-10 w-10 shrink-0 rounded-[10px]" />
          <span className="font-display text-xl font-bold tracking-[0.2px]">Next Trip</span>
        </Link>

        <button
          className="hidden h-5 w-[26px] cursor-pointer flex-col justify-between border-none bg-transparent p-0 max-[720px]:flex"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          <span className="block h-0.5 w-full rounded-[2px] bg-cream" />
          <span className="block h-0.5 w-full rounded-[2px] bg-cream" />
          <span className="block h-0.5 w-full rounded-[2px] bg-cream" />
        </button>

        <nav
          className={
            'flex items-center gap-5 max-[720px]:absolute max-[720px]:inset-x-0 max-[720px]:top-full ' +
            'max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-[14px] max-[720px]:bg-forest ' +
            'max-[720px]:px-6 max-[720px]:pt-4 max-[720px]:pb-[22px] max-[720px]:shadow-travel ' +
            (menuOpen ? '' : 'max-[720px]:hidden')
          }
        >
          <Link href="/travel/search" className={navLink('/travel/search')} onClick={closeMenu}>
            Search
          </Link>
          {isLoggedIn && (
            <Link href="/dashboard" className={navLink('/dashboard')} onClick={closeMenu}>
              Dashboard
            </Link>
          )}

          <div className="ml-2 flex items-center gap-3 max-[720px]:ml-0 max-[720px]:w-full max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2.5">
            {isLoggedIn ? (
              <>
                <span className="text-sm font-medium text-cream">👋 {user?.firstName}</span>
                <button type="button" className={btnOutline} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={btnOutline} onClick={closeMenu}>
                  Login
                </Link>
                <Link href="/signup" className={btnSolid} onClick={closeMenu}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
