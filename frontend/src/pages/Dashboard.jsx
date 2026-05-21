import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../index.css"

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatRow = ({ label, items }) => (
  <div>
    <span className="text-xs font-semibold tracking-widest uppercase text-emerald-500">
      {label}
    </span>
    {items?.length > 0 ? (
      <p className="text-white text-sm mt-1">{items.join(", ")}</p>
    ) : (
      <p className="text-slate-500 italic text-sm mt-1">None listed.</p>
    )}
  </div>
);

// ─── Loading State ────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
    <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-emerald-500 anim-spin" />
    <p className="text-slate-400 text-sm">Loading your health profile…</p>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.info("Signing you out…", { autoClose: 1200 });
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 1400);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/users/profile");
        setProfile(response.data);
        toast.success(
          `Welcome back, ${response.data?.fullName?.split(" ")[0]}!`,
          { autoClose: 3000 },
        );
      } catch (err) {
        toast.error("Failed to load profile. Please log in again.");
        if (err.response?.status === 401) handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <LoadingScreen />;

  const hp = profile?.healthProfile;
  console.log("Current user profile data: ", profile)

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-10 anim-fade-up">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
                Health Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Hello,{" "}
                <span className="text-emerald-400">
                  {profile?.fullName?.split(" ")[0]}
                </span>{" "}
                👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Here's your current health overview.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
              Logout
            </button>
          </div>

          {/* ── Health Profile Card ── */}
          <div className="rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-800 p-6 sm:p-8 mb-5 shadow-xl hover:shadow-emerald-900/20 transition-shadow duration-300 anim-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <span className="text-lg">🩺</span>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Your Health Profile
              </h2>
              <button
                onClick={() => navigate("/edit-profile")}
                className="text-sm font-medium text-blue-400 border border-green-400 px-2 py-1 ml-10 rounded-lg blue hover:text-blue-300"
              >
                Edit Profile ⚙️
              </button>
            </div>

            <div className="space-y-5 divide-y divide-slate-800/70">
              <StatRow label="Allergies" items={hp?.allergies} />
              <div className="pt-5">
                <StatRow label="Illnesses" items={hp?.illnesses} />
              </div>
              <div className="pt-5">
                <StatRow
                  label="Prohibited Foods (Doctor's Orders)"
                  items={hp?.prohibitedFoods}
                />
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/scan")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200 anim-slide-up anim-delay-1"
            >
              📷 Scan a Food Label
            </button>
            <button
              onClick={() => navigate("/history")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-orange-600 hover:bg-orange-500 transition-colors duration-200 anim-slide-up anim-delay-2"
            >
              🕒 View Scan History
            </button>

            {/* --- ADMIN ONLY SECTION --- */}
            {profile?.role === "admin" && (
              <button
                onClick={() => navigate("/add-dish")}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-purple-600 hover:bg-purple-500 transition-colors duration-200 anim-slide-up anim-delay-3 border border-purple-500"
              >
                ⚙️ Admin: Manage Food Database
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
