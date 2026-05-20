import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    allergies: "",
    illnesses: "",
    prohibitedFoods: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const healthProfile = {
        allergies: formData.allergies
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean),
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

  const inputClass =
    "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors duration-200";

  const Field = ({ label, name, type = "text", placeholder }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
        {label}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        required={["fullName", "email", "password"].includes(name)}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md anim-fade-up">
        {/* ── Logo / Title ── */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🥗</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            BiteCheck
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl">
          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* ── Account Info ── */}
            <Field label="Full Name" name="fullName" placeholder="John Doe" />
            <Field
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
            />

            {/* ── Medical Profile Divider ── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">
                🩺 Medical Profile
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <p className="text-xs text-slate-500 -mt-2 text-center">
              Comma-separated — leave blank if none
            </p>

            <Field
              label="Allergies"
              name="allergies"
              placeholder="e.g. Peanuts, Milk"
            />
            <Field
              label="Illnesses"
              name="illnesses"
              placeholder="e.g. Diabetes, Hypertension"
            />
            <Field
              label="Prohibited by Doctor"
              name="prohibitedFoods"
              placeholder="e.g. Sugar, Sodium"
            />

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          {/* ── Footer ── */}
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

/*
  CSS — keyframes only (add to your global CSS)
  =============================================

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .anim-fade-up {
    animation: fadeUp 0.5s ease both;
  }
*/
