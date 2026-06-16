import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";

const AddDish = () => {
  const [dishData, setDishData] = useState({
    dishName: "",
    aliases: "",
    ingredients: "",
    unsuitableForIllnesses: "",
    containsAllergies: "",
    dietaryFlags: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔴 Read theme preference from localStorage (same logic as Dashboard)
  const isDark = localStorage.getItem("theme") === "dark";

  // Dynamic Theme Classes
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-500",
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white"
      : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-700 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
  };

  const parseStringToArray = (str) => {
    if (!str) return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      dishName: dishData.dishName.trim(),
      aliases: parseStringToArray(dishData.aliases),
      ingredients: parseStringToArray(dishData.ingredients),
      unsuitableForIllnesses: parseStringToArray(
        dishData.unsuitableForIllnesses,
      ),
      containsAllergies: parseStringToArray(dishData.containsAllergies),
      dietaryFlags: parseStringToArray(dishData.dietaryFlags),
    };

    try {
      await API.post("/scans/add-dish", payload);
      toast.success("Dish added successfully with Medical Ontology! ✨");

      setDishData({
        dishName: "",
        aliases: "",
        ingredients: "",
        unsuitableForIllnesses: "",
        containsAllergies: "",
        dietaryFlags: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding dish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
    >
      <div
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative overflow-x-hidden pb-20 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        {/* ── Header ── */}
        <div
          className={`px-6 pt-10 pb-6 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b ${theme.divider}`}
        >
          <h1
            className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
          >
            Add New Dish
          </h1>
          <button
            onClick={() => navigate("/")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${theme.btnBack}`}
          >
            Cancel
          </button>
        </div>

        {/* ── Form Content ── */}
        <div className="px-6 mt-6">
          <p className={`${theme.textSub} text-sm mb-6 font-medium`}>
            Add a new item to the global food dictionary to enhance scanning
            accuracy.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info Container */}
            <div className={`p-6 rounded-3xl border ${theme.card}`}>
              <h3
                className={`text-sm font-bold uppercase tracking-widest text-indigo-500 mb-4`}
              >
                Basic Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Dish Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. Chicken Biryani"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                    value={dishData.dishName}
                    onChange={(e) =>
                      setDishData({ ...dishData, dishName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Ingredients{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (comma separated)
                    </span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. Rice, Chicken, Oil, Spices"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                    value={dishData.ingredients}
                    onChange={(e) =>
                      setDishData({ ...dishData, ingredients: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Aliases{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    placeholder="e.g. Murg Biryani, Sindhi Biryani"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                    value={dishData.aliases}
                    onChange={(e) =>
                      setDishData({ ...dishData, aliases: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Medical Ontology Container */}
            <div className={`p-6 rounded-3xl border ${theme.card}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🩺</span>
                <h3
                  className={`text-sm font-bold uppercase tracking-widest text-emerald-500`}
                >
                  Medical Ontology
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Contains Allergies
                  </label>
                  <input
                    placeholder="e.g. Peanut, Milk, Wheat"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-red-500/50 ${theme.inputBg}`}
                    value={dishData.containsAllergies}
                    onChange={(e) =>
                      setDishData({
                        ...dishData,
                        containsAllergies: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Unsuitable For Illnesses
                  </label>
                  <input
                    placeholder="e.g. Heart Disease, Hypertension"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-yellow-500/50 ${theme.inputBg}`}
                    value={dishData.unsuitableForIllnesses}
                    onChange={(e) =>
                      setDishData({
                        ...dishData,
                        unsuitableForIllnesses: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${theme.textSub} mb-1.5`}
                  >
                    Dietary Flags
                  </label>
                  <input
                    placeholder="e.g. High Sodium, High Sugar, Deep Fried"
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-orange-500/50 ${theme.inputBg}`}
                    value={dishData.dietaryFlags}
                    onChange={(e) =>
                      setDishData({ ...dishData, dietaryFlags: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? "Saving Dish..." : "Save Dish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDish;
