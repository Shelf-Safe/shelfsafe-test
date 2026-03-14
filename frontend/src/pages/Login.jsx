import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShelfSafeLogo } from "../components/ShelfSafeLogo";
import { PasswordInput } from "../components/PasswordInput";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);

      if (response?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setPendingEmail(response.email);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyTwoFactor(pendingEmail, otp);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d] transition-colors bg-white";
  const labelCls = "block text-sm font-normal text-gray-700 mb-1.5";
  const showOtpStep = requiresTwoFactor;
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full" style={{ maxWidth: 560 }}>
        { }
        <div className="flex justify-center mb-10">
          <ShelfSafeLogo />
        </div>

        {showOtpStep ? (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Verify your identity</h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a 6-digit verification code to <strong>{pendingEmail}</strong>.
              </p>
            </div>

            <div>
              <label className={labelCls}>Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className={inputCls}
                placeholder="Enter 6-digit code"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#00808d', minWidth: 160 }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                autoComplete="email"
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="-mt-1">
              <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: '#00808d' }}>
                Forgot your password?
              </Link>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#00808d', minWidth: 160 }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 mt-1">
              {"Don't have an account? "}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#00808d' }}>
                Sign up
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
