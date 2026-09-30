'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Client-side port of the Angular AuthGuard: once the stored session has been
 * read (`ready`), visitors without a token are sent to /login. Until then, and
 * while redirecting, only a spinner is rendered so protected content never flashes.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/login');
  }, [ready, isLoggedIn, router]);

  if (!ready || !isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-terracotta" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
