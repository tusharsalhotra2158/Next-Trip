'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const inputClass =
  'rounded-lg border-2 border-[#e0e0e0] px-4 py-3 font-[inherit] text-base transition-all duration-300 ease-in-out ' +
  'focus:border-terracotta focus:shadow-[0_0_0_3px_rgba(242,100,60,0.15)] focus:outline-none';
const labelClass = 'text-[0.95rem] font-medium text-[#333]';

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function Field({ id, label, type, value, onChange, placeholder }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className={inputClass}
      />
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await signup({ firstName, lastName, email, password });
      setIsLoading(false);
      router.push('/login');
    } catch (error) {
      setIsLoading(false);
      setErrorMessage((error instanceof Error && error.message) || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-linear-135 from-forest from-0% to-forest-dark to-100% px-4 py-12">
      <div className="w-full max-w-[450px] rounded-xl bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-[480px]:px-6 max-[480px]:py-8">
        <div className="mb-8 text-center">
          <h1 className="mt-0 mb-2 text-[1.75rem] leading-[1.2] font-semibold text-[#333] max-[480px]:text-2xl">
            Create Account
          </h1>
          <p className="m-0 text-[0.95rem] text-[#666]">Join us today</p>
        </div>

        {/* noValidate: the custom messages below replace the browser's native validation popups. */}
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <Field id="firstName" label="First Name" type="text" value={firstName} onChange={setFirstName} placeholder="John" />
            <Field id="lastName" label="Last Name" type="text" value={lastName} onChange={setLastName} placeholder="Doe" />
          </div>

          <Field
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />
          <Field
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
          />

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
            <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-[0.95rem] text-[#666]">
          <p className="m-0">
            Already have an account?{' '}
            <Link
              href="/login"
              className="cursor-pointer font-semibold text-terracotta no-underline transition-colors duration-300 ease-in-out hover:text-terracotta-dark"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
