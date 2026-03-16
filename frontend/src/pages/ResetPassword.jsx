import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { PasswordInput } from '../components/PasswordInput';

const API = API_BASE_URL;

export const ResetPassword = () => {
  const { token } = useParams();
  const navigate   = useNavigate();

  const [form, setForm]     = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password, confirmPassword: form.confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed.');
      if (data.token) localStorage.setItem('token', data.token);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  
  if (success) {
    return (
      <AuthPageLayout>
        <div className="mx-auto w-full max-w-[640px] text-center space-y-5">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f4f5]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brandTeal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink">Password updated!</h1>
          <p className="text-sm text-gray-500">
            Your password has been reset successfully. Redirecting you to Sign In…
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  
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

        <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-5">
          <div>
            <h1 className="text-3xl sm:text-2xl font-bold text-ink">Create new password</h1>
            <p className="mt-2 text-lg sm:text-sm text-gray-500 leading-relaxed">
              Your new password must be at least 6 characters. Choose something
              strong and unique to keep your account secure.
            </p>
          </div>

          {}
          <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
            <li>At least 6 characters</li>
            <li>Mix of letters, numbers, and symbols recommended</li>
          </ul>

          <div>
            <label htmlFor="rp-password" className="block text-2xl sm:text-sm font-medium text-ink mb-3 sm:mb-2">
              New password
            </label>
            <PasswordInput
              id="rp-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="rp-confirm" className="block text-2xl sm:text-sm font-medium text-ink mb-3 sm:mb-2">
              Confirm new password
            </label>
            <PasswordInput
              id="rp-confirm"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
            {}
            {form.confirmPassword.length > 0 && (
              <p className={`mt-1.5 text-xs ${form.password === form.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </AuthPageLayout>
  );
};
