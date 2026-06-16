import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔴 Theme State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const { login } = useContext(AuthContext);
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
    textSub: isDark ? "text-slate-400" : "text-gray-500",
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
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await API.post("/users/login", { email, password });
      login(response.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to login");
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
        <div className="absolute top-6 right-6">
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

        <div className="flex-1 px-6 flex flex-col justify-center py-12">
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
              Sign in to your account
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

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label
                  className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 rounded-2xl font-extrabold text-sm text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:active:scale-100 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Footer */}
            <div
              className={`flex items-center justify-between mt-8 pt-6 border-t ${theme.divider}`}
            >
              <p className={`text-sm font-medium ${theme.textSub}`}>
                Don't have an account?
              </p>
              <button
                onClick={() => navigate("/register")}
                className="text-sm font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Sign up here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
