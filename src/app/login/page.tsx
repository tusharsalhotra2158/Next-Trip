'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const inputClass =
  'rounded-lg border-2 border-[#e0e0e0] px-4 py-3 font-[inherit] text-base transition-all duration-300 ease-in-out ' +
  'focus:border-terracotta focus:shadow-[0_0_0_3px_rgba(242,100,60,0.15)] focus:outline-none';
const labelClass = 'text-[0.95rem] font-medium text-[#333]';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(email, password);
      setIsLoading(false);
      router.push('/dashboard');
    } catch (error) {
      setIsLoading(false);
      setErrorMessage((error instanceof Error && error.message) || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-linear-135 from-forest from-0% to-forest-dark to-100% px-4 py-12">
      <div className="w-full max-w-[400px] rounded-xl bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-[480px]:px-6 max-[480px]:py-8">
        <div className="mb-8 text-center">
          <h1 className="mt-0 mb-2 text-[1.75rem] leading-[1.2] font-semibold text-[#333] max-[480px]:text-2xl">
            Welcome Back
          </h1>
          <p className="m-0 text-[0.95rem] text-[#666]">Sign in to your account</p>
        </div>

        {/* noValidate: the custom messages below replace the browser's native validation popups. */}
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={inputClass}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg border-l-4 border-[#c33] bg-[#fee] px-4 py-3 text-[0.9rem] text-[#c33]">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={
              'mt-2 cursor-pointer rounded-lg border-none bg-terracotta px-6 py-3.5 text-base font-semibold text-white ' +
              'transition-all duration-300 ease-in-out enabled:hover:-translate-y-0.5 enabled:hover:bg-terracotta-dark ' +
              'enabled:hover:shadow-[0_6px_20px_rgba(242,100,60,0.35)] disabled:cursor-not-allowed disabled:opacity-70'
            }
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-[0.95rem] text-[#666]">
          <p className="m-0">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="cursor-pointer font-semibold text-terracotta no-underline transition-colors duration-300 ease-in-out hover:text-terracotta-dark"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
