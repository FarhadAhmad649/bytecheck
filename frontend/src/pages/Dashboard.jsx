import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import AllergenGuide from "../components/AllergenGuide";
import BottomNav from "../components/BottomNav";

// ─── Helper to parse the scan title ───
const parseReasonText = (reasonText) => {
  if (!reasonText) return null;
  try {
    const dishMatch = reasonText.match(/Warning: (.*?) poses a risk to: (.*)/);
    if (dishMatch) return { dishName: dishMatch[1] };
  } catch {}
  return null;
};

const formatDate = (dateString) => {
  if (!dateString) return "Unknown time";
  const d = new Date(dateString);
  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} • ${timePart}`;
};

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Theme State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await API.get("/users/profile");
        setProfile(profileRes.data?.user || profileRes.data);
      } catch (err) {
        console.error("Failed to load profile data.");
        if (err.response?.status === 401) {
          logout();
          navigate("/login");
          return;
        }
      }

      try {
        const historyRes = await API.get("/scans/history");
        const historyData = historyRes.data?.history || [];
        setRecentScans(historyData.slice(0, 5));
      } catch (err) {
        console.error("Failed to load recent history.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [logout, navigate]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const firstName = profile?.fullName?.split(" ")[0] || "Guest";

  // Dynamic Styling Classes Based on Theme
  const theme = {
    bg: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200 shadow-sm",
    allergenCard: isDark
      ? "bg-slate-900 border-slate-700 hover:border-emerald-500"
      : "bg-white border-gray-200 hover:border-emerald-500 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-600",
    bottomNav: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
    modalBg: isDark ? "bg-slate-900" : "bg-white",
    gridIcon1: isDark
      ? "bg-indigo-500/20 text-indigo-400"
      : "bg-[#EEF2FF] text-indigo-600",
    gridIcon2: isDark
      ? "bg-orange-500/20 text-orange-400"
      : "bg-[#FFF7ED] text-orange-600",
    gridIcon3: isDark
      ? "bg-emerald-500/20 text-emerald-400"
      : "bg-[#ECFDF5] text-emerald-600",
    gridIcon4: isDark
      ? "bg-purple-500/20 text-purple-400"
      : "bg-[#FAF5FF] text-purple-600",
  };

  const getStatusUI = (status) => {
    if (status === "Safe")
      return {
        icon: "✅",
        color: "text-emerald-500",
        bg: isDark ? "bg-emerald-500/10" : "bg-emerald-50",
      };
    if (status === "Caution")
      return {
        icon: "⚠️",
        color: "text-orange-500",
        bg: isDark ? "bg-orange-500/10" : "bg-orange-50",
      };
    return {
      icon: "🚨",
      color: "text-red-500",
      bg: isDark ? "bg-red-500/10" : "bg-red-50",
    };
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center`}
      >
        <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-black" : "bg-gray-900"} flex justify-center`}
    >
      <div
        className={`w-full max-w-md ${theme.bg} min-h-screen relative overflow-x-hidden pb-32 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        {/* ── 1. Top Header ── */}
        <div className="px-6 pt-12 pb-4 flex justify-between items-center">
          <div>
            <h1
              className={`text-[28px] font-extrabold ${theme.textMain} tracking-tight leading-tight transition-colors`}
            >
              Hi, {firstName}
            </h1>
            <p
              className={`${theme.textSub} text-sm font-bold mt-0.5 transition-colors`}
            >
              Ready to check your food?
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-emerald-500 shadow-md cursor-pointer"
                style={{
                  backgroundImage: `url('${profile?.profileImage || `https://ui-avatars.com/api/?name=${firstName}&background=10B981&color=fff&bold=true`}')`,
                }}
                onClick={() => navigate("/profile")}
              ></div>
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
          </div>
        </div>

        {/* ── 2. Hero Banner Card ── */}
        <div className="px-6 mt-4">
          <div className="bg-gradient-to-br from-[#0F766E] to-[#10B981] rounded-[32px] p-7 relative overflow-hidden shadow-xl shadow-emerald-600/20">
            <div className="relative z-10 w-[70%]">
              <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md">
                BiteCheck AI
              </span>
              <h2 className="text-white text-[22px] font-extrabold mt-4 leading-snug">
                Nutritional Health Guide
              </h2>
              <p className="text-emerald-50 text-xs mt-2 opacity-90 leading-relaxed font-semibold">
                Let our AI find 100% safe alternatives for your family's
                allergies.
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="mt-5 bg-white text-[#0F766E] text-xs font-bold px-6 py-3 rounded-full shadow-md hover:bg-gray-50 active:scale-95 transition-all"
              >
                Start Scan
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute right-4 -top-8 w-24 h-24 bg-teal-300/40 rounded-full blur-xl"></div>
            <div className="absolute right-4 bottom-8 text-6xl opacity-90 drop-shadow-2xl">
              🥗
            </div>
          </div>
        </div>

        {/* ── 3. The 2x2 Services Grid ── */}
        <div className="px-6 mt-8">
          <div className="flex justify-between items-center mb-5">
            <h3
              className={`${theme.textMain} font-extrabold text-lg tracking-tight transition-colors`}
            >
              Services
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <button
              onClick={() => navigate("/scan")}
              className={`${theme.card} p-5 rounded-[28px] shadow-sm border flex flex-col justify-center items-center gap-3 hover:shadow-md transition-all active:scale-95`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner transition-colors ${theme.gridIcon1}`}
              >
                📸
              </div>
              <span
                className={`font-bold ${theme.textMain} text-sm transition-colors`}
              >
                Food Scan
              </span>
            </button>
            <button
              onClick={() => navigate("/history")}
              className={`${theme.card} p-5 rounded-[28px] shadow-sm border flex flex-col justify-center items-center gap-3 hover:shadow-md transition-all active:scale-95`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner transition-colors ${theme.gridIcon2}`}
              >
                📜
              </div>
              <span
                className={`font-bold ${theme.textMain} text-sm transition-colors`}
              >
                Scan History
              </span>
            </button>
            <button
              onClick={() => navigate("/grocery-list")}
              className={`${theme.card} p-5 rounded-[28px] shadow-sm border flex flex-col justify-center items-center gap-3 hover:shadow-md transition-all active:scale-95`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner transition-colors ${theme.gridIcon3}`}
              >
                🛒
              </div>
              <span
                className={`font-bold ${theme.textMain} text-sm transition-colors`}
              >
                Your Plan
              </span>
            </button>
            <button
              onClick={() => navigate("/manage-family")}
              className={`${theme.card} p-5 rounded-[28px] shadow-sm border flex flex-col justify-center items-center gap-3 hover:shadow-md transition-all active:scale-95`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner transition-colors ${theme.gridIcon4}`}
              >
                👨‍👩‍👧‍👦
              </div>
              <span
                className={`font-bold ${theme.textMain} text-sm transition-colors`}
              >
                Dietary Setup
              </span>
            </button>
          </div>
        </div>

        {/* ── 4. Horizontal Recent History Slider ── */}
        <div className="mt-10 pl-6">
          <div className="flex justify-between items-center mb-5 pr-6">
            <h3
              className={`${theme.textMain} font-extrabold text-lg tracking-tight transition-colors`}
            >
              Recent Scans
            </h3>
            <button
              onClick={() => navigate("/history")}
              className="text-emerald-500 text-xs font-bold hover:text-emerald-600"
            >
              See All
            </button>
          </div>

          {recentScans.length > 0 ? (
            <div
              className="flex gap-4 overflow-x-auto pb-4 pr-6 snap-x snap-mandatory hide-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {recentScans.map((log) => {
                let title =
                  log.analysisResult?.dishName ||
                  log.productName ||
                  "Scan Result";
                if (!log.analysisResult?.dishName && !log.productName) {
                  const parsed = parseReasonText(log.analysisResult?.reason);
                  if (parsed?.dishName) title = parsed.dishName;
                  else if (log.scanType === "barcode") title = "Barcode Scan";
                  else if (log.scanType === "image") title = "Label Scan";
                }

                const statusUI = getStatusUI(log.analysisResult?.status);

                return (
                  <div
                    key={log._id}
                    className={`snap-start shrink-0 w-[42%] min-w-[145px] max-w-[170px] p-4 rounded-3xl border flex flex-col justify-between transition-all ${theme.card}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${statusUI.bg}`}
                      >
                        {statusUI.icon}
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase mt-1 ${statusUI.color}`}
                      >
                        {log.analysisResult?.status}
                      </span>
                    </div>

                    <div className="mb-3">
                      <h4
                        className={`font-extrabold text-sm truncate ${theme.textMain}`}
                      >
                        {title}
                      </h4>
                      <p
                        className={`text-[10px] font-bold mt-1 ${theme.textSub}`}
                      >
                        {formatDate(log.createdAt)}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        navigate("/history", {
                          state: { expandLogId: log._id },
                        })
                      }
                      className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95 ${
                        isDark
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Details
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={`mr-6 p-6 border border-dashed rounded-3xl text-center ${theme.card}`}
            >
              <p className={`text-xs font-bold ${theme.textSub}`}>
                No recent scans. Try scanning a label!
              </p>
            </div>
          )}
        </div>

        {/* ── 5. Allergen Guide Section ── */}
        <AllergenGuide theme={theme} isDark={isDark} />

        {/* ── 6. Admin Controls ── */}
        {profile?.role === "admin" && (
          <div className="px-6 mt-4">
            <h3
              className={`${theme.textMain} font-extrabold text-lg tracking-tight mb-4 transition-colors`}
            >
              Admin Dashboard
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/add-dish")}
                className={`w-full ${theme.card} ${theme.textMain} font-bold py-4 rounded-2xl shadow-sm border flex items-center justify-center gap-2 active:scale-95 transition-all`}
              >
                <span className="text-xl">➕</span> Add New Dish
              </button>
              <button
                onClick={() => navigate("/manage-dishes")}
                className={`w-full ${theme.card} ${theme.textMain} font-bold py-4 rounded-2xl shadow-sm border flex items-center justify-center gap-2 active:scale-95 transition-all`}
              >
                <span className="text-xl">⚙️</span> Manage Food Dictionary
              </button>
            </div>
          </div>
        )}

        {/* ── Persistent Bottom Navigation Bar ── */}
        <BottomNav theme={theme} />
      </div>
    </div>
  );
};

export default Dashboard;
