import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { COMMON_ALLERGIES } from "../utils/contants";

// ─────────────────────────────────────────────
// Reusable Field Component
// ─────────────────────────────────────────────
const Field = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
      {label}
    </label>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors duration-200"
    />
  </div>
);

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    allergies: [], // 👈 CHANGED: Now an array instead of a string
    illnesses: "",
    prohibitedFoods: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ─────────────────────────────────────────────
  // Handle Input Change
  // ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ─────────────────────────────────────────────
  // Handle Smart Tag Toggle
  // ─────────────────────────────────────────────
  const toggleAllergy = (allergy) => {
    setFormData((prev) => {
      const isSelected = prev.allergies.includes(allergy);
      return {
        ...prev,
        allergies: isSelected
          ? prev.allergies.filter((a) => a !== allergy) // Remove if already selected
          : [...prev.allergies, allergy], // Add if new
      };
    });
  };

  // ─────────────────────────────────────────────
  // Handle Register
  // ─────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const healthProfile = {
        allergies: formData.allergies, // 👈 CHANGED: Already a clean array, no need to split!

        illnesses: formData.illnesses
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean),

        prohibitedFoods: formData.prohibitedFoods
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean),
      };

      await API.post("/users/register", {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        healthProfile,
      });

      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md anim-fade-up">
        {/* ───────────────── Title ───────────────── */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🥗</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            BiteCheck
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        {/* ───────────────── Card ───────────────── */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* ───────────────── Account Fields ───────────────── */}
            <Field
              label="Full Name"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Field
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {/* ───────────────── Divider ───────────────── */}
            <div className="flex items-center gap-3 my-1 mt-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">
                🩺 Medical Profile
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* ───────────────── Medical Fields ───────────────── */}

            {/* 👈 CHANGED: Smart Tags UI for Allergies */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Standard Allergies
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((allergy) => {
                  const isSelected = formData.allergies.includes(allergy);
                  return (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 border ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "} {allergy}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 text-center">
              Comma-separated — leave blank if none
            </p>

            <Field
              label="Illnesses"
              name="illnesses"
              placeholder="e.g. Diabetes, Hypertension"
              value={formData.illnesses}
              onChange={handleChange}
            />
            <Field
              label="Prohibited by Doctor"
              name="prohibitedFoods"
              placeholder="e.g. Sugar, Sodium"
              value={formData.prohibitedFoods}
              onChange={handleChange}
            />

            {/* ───────────────── Submit ───────────────── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          {/* ───────────────── Footer ───────────────── */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-800">
            <p className="text-sm text-slate-500">Already have an account?</p>
            <Link
              to="/login"
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
            >
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
