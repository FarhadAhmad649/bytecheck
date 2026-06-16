import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { COMMON_ALLERGIES } from "../utils/contants";

// ─────────────────────────────────────────────
// Reusable Field Component (Now Theme-Aware)
// ─────────────────────────────────────────────
const Field = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  theme,
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
    >
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-emerald-500/50 ${theme.inputBg}`}
    />
  </div>
);

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    allergies: [],
    illnesses: "",
    prohibitedFoods: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔴 Theme State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const navigate = useNavigate();

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  // 🔴 Dynamic Styling Classes Based on Theme
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100 shadow-xl",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-600",
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white placeholder-slate-600 focus:ring-emerald-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-emerald-500/50",
    divider: isDark ? "border-slate-800" : "border-gray-100",
    errorBg: isDark
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : "bg-red-50 border-red-200 text-red-600",
    iconBg: isDark
      ? "bg-emerald-500/15 border-emerald-500/30"
      : "bg-emerald-100 border-emerald-200",
    tagSelected: isDark
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
      : "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm",
    tagUnselected: isDark
      ? "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 shadow-sm",
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleAllergy = (allergy) => {
    setFormData((prev) => {
      const isSelected = prev.allergies.includes(allergy);
      return {
        ...prev,
        allergies: isSelected
          ? prev.allergies.filter((a) => a !== allergy)
          : [...prev.allergies, allergy],
      };
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const healthProfile = {
        allergies: formData.allergies,
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
    <div
      className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
    >
      <div
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300 flex flex-col`}
      >
        {/* ── Theme Toggle ── */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border transition-all active:scale-95 ${
              isDark
                ? "bg-slate-800 border-slate-700 text-yellow-400"
                : "bg-white border-gray-200 text-slate-700"
            }`}
          >
            {isDark ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="flex-1 px-6 flex flex-col justify-center py-12 pt-16">
          {/* ── Logo / Title ── */}
          <div className="text-center mb-10 anim-fade-up">
            <div
              className={`w-20 h-20 rounded-3xl ${theme.iconBg} border flex items-center justify-center mx-auto mb-5 shadow-sm transition-colors`}
            >
              <span className="text-4xl">🥗</span>
            </div>
            <h1
              className={`text-3xl font-extrabold tracking-tight ${theme.textMain} transition-colors`}
            >
              BiteCheck
            </h1>
            <p
              className={`${theme.textSub} text-sm mt-2 font-medium transition-colors`}
            >
              Create your account & health profile
            </p>
          </div>

          {/* ── Card ── */}
          <div
            className={`rounded-[32px] border ${theme.card} p-6 sm:p-8 transition-colors anim-fade-up anim-delay-1`}
          >
            {/* Error */}
            {error && (
              <div
                className={`mb-6 px-4 py-3 rounded-2xl border text-sm font-bold text-center ${theme.errorBg}`}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              {/* Account Fields */}
              <Field
                label="Full Name"
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                theme={theme}
              />
              <Field
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                theme={theme}
              />
              <Field
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                theme={theme}
              />

              {/* Divider */}
              <div className="flex items-center gap-3 my-2 mt-4">
                <div className={`flex-1 h-px ${theme.divider}`} />
                <span
                  className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
                >
                  🩺 Medical Profile
                </span>
                <div className={`flex-1 h-px ${theme.divider}`} />
              </div>

              {/* Smart Tags for Allergies */}
              <div className="flex flex-col gap-2.5">
                <label
                  className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
                >
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
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200 border active:scale-95 ${
                          isSelected ? theme.tagSelected : theme.tagUnselected
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p
                className={`text-[10px] font-bold uppercase tracking-wider text-center mt-2 ${theme.textSub}`}
              >
                Comma-separated — leave blank if none
              </p>

              <Field
                label="Illnesses"
                name="illnesses"
                placeholder="e.g. Diabetes, Hypertension"
                value={formData.illnesses}
                onChange={handleChange}
                theme={theme}
              />
              <Field
                label="Prohibited by Doctor"
                name="prohibitedFoods"
                placeholder="e.g. Sugar, Sodium"
                value={formData.prohibitedFoods}
                onChange={handleChange}
                theme={theme}
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 rounded-2xl font-extrabold text-sm text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:active:scale-100 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                {loading ? "Creating account…" : "Sign Up"}
              </button>
            </form>

            {/* Footer */}
            <div
              className={`flex items-center justify-between mt-8 pt-6 border-t ${theme.divider}`}
            >
              <p className={`text-sm font-medium ${theme.textSub}`}>
                Already have an account?
              </p>
              <Link
                to="/login"
                className="text-sm font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
