import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const AddDish = () => {
  const [dishData, setDishData] = useState({
    dishName: "",
    aliases: "",
    ingredients: "",
    unsuitableForIllnesses: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Convert comma-separated strings into arrays
    const payload = {
      dishName: dishData.dishName,
      aliases: dishData.aliases.split(",").map((item) => item.trim()),
      ingredients: dishData.ingredients.split(",").map((item) => item.trim()),
      unsuitableForIllnesses: dishData.unsuitableForIllnesses
        .split(",")
        .map((item) => item.trim()),
    };

    try {
      await API.post("/scans/add-dish", payload);
      alert("Dish added successfully!");
      setDishData({
        dishName: "",
        aliases: "",
        ingredients: "",
        unsuitableForIllnesses: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Error adding dish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-xl mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800">
        <h2 className="text-2xl font-bold mb-6">Add New Dish to Dictionary</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Dish Name
            </label>
            <input
              required
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700"
              value={dishData.dishName}
              onChange={(e) =>
                setDishData({ ...dishData, dishName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Aliases (comma separated)
            </label>
            <input
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700"
              value={dishData.aliases}
              onChange={(e) =>
                setDishData({ ...dishData, aliases: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Ingredients (comma separated)
            </label>
            <input
              required
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700"
              value={dishData.ingredients}
              onChange={(e) =>
                setDishData({ ...dishData, ingredients: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Unsuitable For Illnesses (comma separated)
            </label>
            <input
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700"
              value={dishData.unsuitableForIllnesses}
              onChange={(e) =>
                setDishData({
                  ...dishData,
                  unsuitableForIllnesses: e.target.value,
                })
              }
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-3 bg-emerald-600 rounded-lg font-bold hover:bg-emerald-500 transition-colors"
          >
            {loading ? "Saving..." : "Save Dish"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddDish;
