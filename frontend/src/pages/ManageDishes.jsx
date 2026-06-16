import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ManageDishes = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDish, setEditingDish] = useState(null);
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
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white placeholder-slate-500"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    tableHeader: isDark
      ? "bg-slate-900 border-slate-800 text-slate-400"
      : "bg-gray-100 border-gray-200 text-gray-600",
    tableRow: isDark
      ? "hover:bg-slate-800/40 border-slate-800/50 text-slate-300"
      : "hover:bg-gray-50 border-gray-100 text-gray-700",
    modalBg: isDark
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-100",
  };

  const fetchDishes = async () => {
    try {
      const response = await API.get("/scans/dishes");
      const sortedDishes = response.data.sort((a, b) => {
        return a.dishName.localeCompare(b.dishName);
      });
      setDishes(sortedDishes);
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
      toast.error("Failed to load dishes from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this dish?")) {
      try {
        await API.delete(`/scans/dish/${id}`);
        setDishes(dishes.filter((dish) => dish._id !== id));
        toast.success("Dish deleted successfully! 🗑️");
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to delete dish.";
        toast.error(`Error: ${errorMessage}`);
      }
    }
  };

  const arrayToString = (arr) => (arr && arr.length > 0 ? arr.join(", ") : "");

  const parseStringToArray = (str) => {
    if (!str) return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        dishName: editingDish.dishName.trim(),
        aliases: parseStringToArray(editingDish.aliases),
        ingredients: parseStringToArray(editingDish.ingredients),
        unsuitableForIllnesses: parseStringToArray(
          editingDish.unsuitableForIllnesses,
        ),
        containsAllergies: parseStringToArray(editingDish.containsAllergies),
        dietaryFlags: parseStringToArray(editingDish.dietaryFlags),
      };

      await API.put(`/scans/dish/${editingDish._id}`, payload);
      toast.success("Dish updated successfully! ✨");
      setEditingDish(null);
      fetchDishes();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update dish.";
      toast.error(`Error: ${errorMessage}`);
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
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative overflow-x-hidden pb-20 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        {/* ── Header ── */}
        <div
          className={`px-6 pt-10 pb-6 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b ${theme.divider}`}
        >
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500 block mb-0.5">
              Admin Database
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Food Dictionary
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

        {/* ── Table Container ── */}
        <div className="px-6 mt-6">
          <p className={`${theme.textSub} text-sm mb-4 font-medium`}>
            Manage database entries, aliases, and medical dietary flags. Swipe
            horizontally to view all columns.
          </p>

          <div
            className={`overflow-x-auto rounded-2xl border ${theme.card} custom-scrollbar`}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`${theme.tableHeader} text-[10px] uppercase tracking-wider`}
                >
                  <th className="px-4 py-4 font-bold min-w-[40px] text-center">
                    #
                  </th>
                  <th className="px-4 py-4 font-bold min-w-[140px]">
                    Dish Name
                  </th>
                  <th className="px-4 py-4 font-bold min-w-[140px]">Aliases</th>
                  <th className="px-4 py-4 font-bold min-w-[140px] text-red-500">
                    Allergies
                  </th>
                  <th className="px-4 py-4 font-bold min-w-[140px] text-yellow-500">
                    Illness Flags
                  </th>
                  <th className="px-4 py-4 font-bold min-w-[140px] text-indigo-500">
                    Dietary Flags
                  </th>
                  <th className="px-4 py-4 font-bold min-w-[120px] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.divider}`}>
                {dishes.map((dish, index) => (
                  <tr
                    key={dish._id}
                    className={`${theme.tableRow} transition-colors group`}
                  >
                    <td
                      className={`px-4 py-4 text-[10px] sm:text-xs font-mono text-center ${theme.textSub}`}
                    >
                      {index + 1}
                    </td>
                    <td
                      className={`px-4 py-4 text-xs sm:text-sm font-bold capitalize whitespace-normal ${theme.textMain}`}
                    >
                      {dish.dishName}
                    </td>
                    <td
                      className={`px-4 py-4 text-[10px] sm:text-xs font-medium capitalize whitespace-normal leading-relaxed ${theme.textSub}`}
                    >
                      {dish.aliases?.join(", ") || (
                        <span className="opacity-50">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] sm:text-xs text-red-500 font-medium whitespace-normal leading-relaxed">
                      {dish.containsAllergies?.join(", ") || (
                        <span className="opacity-50">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] sm:text-xs text-yellow-500 font-medium whitespace-normal leading-relaxed">
                      {dish.unsuitableForIllnesses?.join(", ") || (
                        <span className="opacity-50">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] sm:text-xs text-indigo-500 font-medium whitespace-normal leading-relaxed capitalize">
                      {dish.dietaryFlags?.join(", ") || (
                        <span className="opacity-50">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right flex justify-end gap-2 pt-5">
                      <button
                        onClick={() =>
                          setEditingDish({
                            ...dish,
                            aliases: arrayToString(dish.aliases),
                            ingredients: arrayToString(dish.ingredients),
                            unsuitableForIllnesses: arrayToString(
                              dish.unsuitableForIllnesses,
                            ),
                            containsAllergies: arrayToString(
                              dish.containsAllergies,
                            ),
                            dietaryFlags: arrayToString(dish.dietaryFlags),
                          })
                        }
                        className="text-[10px] sm:text-xs text-indigo-500 hover:text-indigo-600 bg-indigo-500/10 px-3 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-wide"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dish._id)}
                        className="text-[10px] sm:text-xs text-red-500 hover:text-red-600 bg-red-500/10 px-3 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-wide"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {dishes.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className={`p-8 text-center text-sm font-medium ${theme.textSub}`}
                    >
                      No dishes found in the dictionary database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Edit Dish Modal ── */}
        {editingDish && (
          <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div
              className={`${theme.modalBg} p-6 rounded-[32px] max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl custom-scrollbar border`}
            >
              <div
                className={`mb-6 pb-4 border-b flex justify-between items-center ${theme.divider}`}
              >
                <h3
                  className={`text-xl font-extrabold tracking-tight ${theme.textMain}`}
                >
                  Edit{" "}
                  <span className="text-indigo-500 capitalize">
                    {editingDish.dishName}
                  </span>
                </h3>
                <button
                  onClick={() => setEditingDish(null)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-colors ${theme.btnBack}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                    >
                      Dish Name
                    </label>
                    <input
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                      value={editingDish.dishName}
                      onChange={(e) =>
                        setEditingDish({
                          ...editingDish,
                          dishName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                    >
                      Aliases{" "}
                      <span className="normal-case opacity-70 tracking-normal">
                        (csv)
                      </span>
                    </label>
                    <input
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                      value={editingDish.aliases}
                      placeholder="e.g. Biryani, Pilaf"
                      onChange={(e) =>
                        setEditingDish({
                          ...editingDish,
                          aliases: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Ingredients{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (csv)
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 resize-none ${theme.inputBg}`}
                    value={editingDish.ingredients}
                    onChange={(e) =>
                      setEditingDish({
                        ...editingDish,
                        ingredients: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                    >
                      Allergies
                    </label>
                    <input
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-red-500/50 text-red-500 ${theme.inputBg}`}
                      value={editingDish.containsAllergies}
                      onChange={(e) =>
                        setEditingDish({
                          ...editingDish,
                          containsAllergies: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                    >
                      Illness Conflicts
                    </label>
                    <input
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-yellow-500/50 text-yellow-500 ${theme.inputBg}`}
                      value={editingDish.unsuitableForIllnesses}
                      onChange={(e) =>
                        setEditingDish({
                          ...editingDish,
                          unsuitableForIllnesses: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5 mt-2`}
                  >
                    Dietary Flags (Abstract Profile)
                  </label>
                  <input
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 text-indigo-500 ${theme.inputBg}`}
                    value={editingDish.dietaryFlags}
                    placeholder="e.g. oily, high-sugar, spicy, deep-fried"
                    onChange={(e) =>
                      setEditingDish({
                        ...editingDish,
                        dietaryFlags: e.target.value,
                      })
                    }
                  />
                </div>

                <div
                  className={`flex gap-3 pt-6 border-t ${theme.divider} mt-4`}
                >
                  <button
                    type="button"
                    onClick={() => setEditingDish(null)}
                    className={`flex-1 py-4 text-sm rounded-2xl font-bold transition-colors ${theme.btnBack}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-indigo-500 text-sm text-white rounded-2xl hover:bg-indigo-600 font-extrabold transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDishes;
