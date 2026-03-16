import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/AuthPageLayout';

const API = API_BASE_URL;

export const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="mx-auto w-full max-w-[640px]">

        {}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-brandTeal hover:underline mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sign In
        </Link>

        {submitted ? (
          
          <div className="text-center space-y-5">
            {}
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f4f5]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brandTeal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8
                     M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5
                     a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-ink">Check your email</h1>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
              We sent a password reset link to <strong className="text-ink">{email}</strong>.
              It expires in 1 hour. If you don't see it, check your spam folder.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="text-sm text-brandTeal hover:underline"
              >
                Didn't receive it? Try again
              </button>
            </div>

            <div className="pt-1">
              <Link to="/login" className="text-sm text-gray-400 hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          
          <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-5">
            <div>
              <h1 className="text-3xl sm:text-2xl font-bold text-ink">Forgot password?</h1>
              <p className="mt-2 text-lg sm:text-sm text-gray-500 leading-relaxed">
                No worries — enter the email address linked to your account and
                we'll send you a link to reset your password.
              </p>
            </div>

            <div>
              <label htmlFor="fp-email" className="block text-2xl sm:text-sm font-medium text-ink mb-3 sm:mb-2">
                Email address
              </label>
              <input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-14 sm:h-10 rounded-xl sm:rounded-md border border-line px-4 text-lg sm:text-sm outline-none focus:border-brandTeal"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center pt-2 sm:pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-56 bg-brandTeal text-white rounded-2xl sm:rounded-md py-4 sm:py-2.5 text-2xl sm:text-sm font-semibold shadow-sm disabled:opacity-60 transition-opacity"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div className="text-center pt-1 sm:pt-0">
              <p className="text-2xl sm:text-sm text-ink">
                Remember your password?{' '}
                <Link to="/login" className="text-brandTeal font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AuthPageLayout>
  );
};
