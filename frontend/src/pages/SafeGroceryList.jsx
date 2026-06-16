import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";

const SafeGroceryList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔴 Theme State
  const isDark = localStorage.getItem("theme") === "dark";

  // 🔴 Dynamic Styling Classes Based on Theme
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-600",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    iconBg: isDark ? "bg-emerald-500/15" : "bg-emerald-100",
    targetBadge: isDark
      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
      : "bg-indigo-50 border-indigo-100 text-indigo-600",
  };

  useEffect(() => {
    const fetchList = async () => {
      try {
        const response = await API.get("/users/profile");
        const userData = response.data?.user || response.data;
        const sortedList = (userData.safeGroceryList || []).sort(
          (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
        );
        setItems(sortedList);
      } catch (err) {
        console.error("Failed to load grocery list:", err);
        toast.error("Failed to load your safe grocery list.");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, []);

  const handleRemove = async (itemId, productName) => {
    try {
      await API.delete(`/users/grocery/${itemId}`);
      setItems(items.filter((item) => item._id !== itemId));
      toast.success(`${productName} removed from list! 🗑️`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove item.");
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
      >
        <div
          className={`w-full max-w-md ${theme.bgContainer} min-h-screen flex flex-col items-center justify-center gap-4 sm:rounded-3xl sm:my-4`}
        >
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-emerald-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
    >
      <div
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative overflow-x-hidden pb-24 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        {/* ── Header ── */}
        <div
          className={`px-6 pt-10 pb-6 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b ${theme.divider}`}
        >
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 block mb-0.5">
              Verified Safe
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Grocery List
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1 ${theme.btnBack}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <div className="px-6 mt-6">
          <p className={`${theme.textSub} text-sm mb-6 font-medium`}>
            Items you have scanned and verified as safe are saved here for your
            next shopping trip.
          </p>

          {/* ── Empty State ── */}
          {items.length === 0 ? (
            <div
              className={`text-center rounded-[32px] p-8 border ${theme.card}`}
            >
              <div className="text-5xl mb-4">🛒</div>
              <h3 className={`font-extrabold text-lg ${theme.textMain}`}>
                Your list is empty
              </h3>
              <p
                className={`text-xs mt-2 max-w-[220px] mx-auto leading-relaxed font-bold ${theme.textSub}`}
              >
                Scan items in the app. When they pass as safe, you can save them
                here!
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="mt-6 px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 active:scale-95"
              >
                Start Scanning
              </button>
            </div>
          ) : (
            /* ── List Items ── */
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md ${theme.card}`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${theme.iconBg}`}
                    >
                      <span className="text-emerald-500 text-xl">✅</span>
                    </div>

                    <div className="flex flex-col gap-1 truncate pr-2">
                      <h3
                        className={`font-extrabold text-sm sm:text-base capitalize truncate ${theme.textMain}`}
                      >
                        {item.productName}
                      </h3>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-bold ${theme.textSub}`}
                        >
                          {new Date(item.addedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>

                        <span className={`${theme.textSub}`}>•</span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${theme.targetBadge} truncate max-w-[100px]`}
                        >
                          {item.targetProfile === "everyone"
                            ? "Family"
                            : item.targetProfile}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item._id, item.productName)}
                    className={`shrink-0 p-2.5 rounded-xl transition-colors active:scale-95 ${
                      isDark
                        ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title="Remove from list"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeGroceryList;
