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

  const fetchDishes = async () => {
    try {
      const response = await API.get("/scans/dishes");

      // 🔴 NEW: Sort the dishes alphabetically by dishName
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
          err.response?.data?.message ||
          "Failed to delete dish. Check server logs.";
        toast.error(`Error: ${errorMessage}`);
        console.error("Delete error:", err);
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
      console.error("Update error:", err);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-6 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto bg-slate-900 p-4 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Food Dictionary
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage database entries, aliases, and dietary flags.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-slate-800 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-sm shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Table Container with Horizontal Scrolling */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20 custom-scrollbar shadow-inner">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="px-3 py-3 font-semibold min-w-[40px] text-center">
                  #
                </th>
                <th className="px-3 py-3 font-semibold min-w-[140px]">
                  Dish Name
                </th>
                <th className="px-3 py-3 font-semibold min-w-[140px]">
                  Aliases
                </th>
                <th className="px-3 py-3 font-semibold min-w-[140px]">
                  Allergies
                </th>
                <th className="px-3 py-3 font-semibold min-w-[140px]">
                  Illness Flags
                </th>
                <th className="px-3 py-3 font-semibold min-w-[140px] text-blue-400">
                  Dietary Flags
                </th>
                <th className="px-3 py-3 font-semibold min-w-[120px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dishes.map((dish, index) => (
                <tr
                  key={dish._id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="px-3 py-3 text-[10px] sm:text-xs text-slate-600 font-mono text-center">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 text-xs sm:text-sm font-semibold text-slate-200 capitalize whitespace-normal">
                    {dish.dishName}
                  </td>
                  <td className="px-3 py-3 text-[10px] sm:text-xs text-slate-400 font-medium capitalize whitespace-normal leading-relaxed">
                    {dish.aliases?.join(", ") || (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[10px] sm:text-xs text-red-400/90 font-medium whitespace-normal leading-relaxed">
                    {dish.containsAllergies?.join(", ") || (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[10px] sm:text-xs text-yellow-400/90 font-medium whitespace-normal leading-relaxed">
                    {dish.unsuitableForIllnesses?.join(", ") || (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[10px] sm:text-xs text-blue-400/90 font-medium whitespace-normal leading-relaxed capitalize">
                    {dish.dietaryFlags?.join(", ") || (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right flex justify-end gap-3 pt-4">
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
                      className="text-[11px] sm:text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors uppercase tracking-wide border border-white px-1 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dish._id)}
                      className="text-[11px] sm:text-xs text-red-500 hover:text-red-400 font-bold transition-colors uppercase tracking-wide border border-white px-1 py-1"
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
                    className="p-8 text-center text-xs text-slate-500"
                  >
                    No dishes found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Dish Modal */}
        {editingDish && (
          <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-5 sm:p-6 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black">
              <div className="mb-5 pb-3 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Edit{" "}
                  <span className="text-indigo-400 capitalize">
                    {editingDish.dishName}
                  </span>
                </h3>
                <button
                  onClick={() => setEditingDish(null)}
                  className="text-slate-500 hover:text-slate-300 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Dish Name
                    </label>
                    <input
                      className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors text-white"
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
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Aliases{" "}
                      <span className="normal-case tracking-normal font-normal opacity-70">
                        (comma separated)
                      </span>
                    </label>
                    <input
                      className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors text-slate-300"
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
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Ingredients{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (comma separated)
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors text-white resize-none"
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
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Allergies
                    </label>
                    <input
                      className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-red-500/50 outline-none transition-colors text-red-300"
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
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Illness Conflicts
                    </label>
                    <input
                      className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-yellow-500/50 outline-none transition-colors text-yellow-300"
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

                {/* Dietary Flags Input */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 mt-2">
                    Dietary Flags (Abstract Profile)
                    <span className="normal-case tracking-normal font-normal opacity-70 ml-1">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    className="w-full bg-slate-950/50 p-2.5 sm:p-3 text-xs sm:text-sm rounded-lg border border-slate-700 focus:border-blue-500/50 outline-none transition-colors text-blue-300"
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

                <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDish(null)}
                    className="flex-1 py-2.5 sm:py-3 bg-slate-800 text-xs sm:text-sm text-slate-300 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 sm:py-3 bg-indigo-600 text-xs sm:text-sm text-white rounded-lg hover:bg-indigo-500 font-bold transition-colors shadow-lg shadow-indigo-900/20"
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
