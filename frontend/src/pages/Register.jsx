import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShelfSafeLogo } from "../components/ShelfSafeLogo";
import { PasswordInput } from "../components/PasswordInput";

export const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.confirmPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d] transition-colors bg-white";
  const labelCls = "block text-sm font-normal text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full" style={{ maxWidth: 560 }}>
        {}
        <div className="flex justify-center mb-10">
          <ShelfSafeLogo />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {}
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={inputCls}
              autoComplete="name"
            />
          </div>

          {}
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputCls}
              autoComplete="email"
            />
          </div>

          {}
          <div>
            <label className={labelCls}>Password</label>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </div>

          {}
          <div>
            <label className={labelCls}>Confirm Password</label>
            <PasswordInput
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={inputCls}
            />
            {formData.confirmPassword.length > 0 && (
              <p className={`mt-1.5 text-xs ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          {}
          <div className="flex justify-center mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#00808d', minWidth: 160 }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {}
          <p className="text-center text-sm text-gray-600 mt-1">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#00808d' }}>
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
