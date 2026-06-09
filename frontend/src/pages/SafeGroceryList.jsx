import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";

const SafeGroceryList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchList = async () => {
      try {
        // We can fetch the list directly from the user's profile
        const response = await API.get("/users/profile");
        const userData = response.data?.user || response.data;
        // Sort items so the newest ones appear at the top
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading your list…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
              Verified Safe
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              Grocery List 🛒
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors duration-200"
          >
            ← Back
          </button>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="text-center rounded-2xl bg-slate-900/80 border border-slate-800 p-8 sm:p-10">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-white font-semibold text-lg mb-1">
              Your list is empty
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Scan items in the app. When they pass as safe, you can save them
              here for your next shopping trip!
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
            >
              📷 Start Scanning
            </button>
          </div>
        ) : (
          /* List Items */
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 shadow-lg hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 text-lg">✅</span>
                  </div>
                  <div className="truncate pr-4">
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base capitalize truncate">
                      {item.productName}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      Added: {new Date(item.addedAt).toLocaleDateString()}
                      <span className="text-slate-600">•</span>
                      {/* NEW: Beautiful target badge */}
                      <span className="text-indigo-400 font-semibold capitalize flex items-center gap-1">
                        👤 For:{" "}
                        {item.targetProfile === "everyone"
                          ? "Family (Everyone)"
                          : item.targetProfile}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(item._id, item.productName)}
                  className="shrink-0 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
  );
};

export default SafeGroceryList;
