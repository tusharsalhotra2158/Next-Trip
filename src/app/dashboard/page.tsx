'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Mirrors the Angular component's own check: a token without a stored user
  // record still sends the visitor back to /login.
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  return (
    <div className="flex min-h-[60vh] flex-col bg-cream">
      <div className="mx-auto w-full max-w-[1200px] flex-1 p-8 max-[768px]:p-4">
        <div className="rounded-[20px] bg-white p-8 shadow-travel">
          <h1 className="mt-0 mb-4 font-display text-[2rem] leading-[1.2] font-medium text-ink max-[768px]:text-2xl">
            Welcome, {user?.firstName}! 👋
          </h1>
          <p className="mt-0 mb-6 text-[1.05rem] text-ink-soft">You have successfully logged in to your account.</p>
          <div className="rounded-xl border-l-4 border-terracotta bg-cream p-6">
            <p className="my-3 text-base text-ink">
              <strong className="text-terracotta-dark">Email:</strong> {user?.email}
            </p>
            <p className="my-3 text-base text-ink">
              <strong className="text-terracotta-dark">Full Name:</strong> {user?.firstName} {user?.lastName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
