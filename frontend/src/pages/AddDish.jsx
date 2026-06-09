import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const AddDish = () => {
  const [dishData, setDishData] = useState({
    dishName: "",
    aliases: "",
    ingredients: "",
    unsuitableForIllnesses: "",
    containsAllergies: "", // NEW
    dietaryFlags: "", // NEW
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper function to cleanly convert "A, B" into ["A", "B"]
  // and prevent empty strings like [""] from going to MongoDB
  const parseStringToArray = (str) => {
    if (!str) return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== ""); // Removes empty items
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Apply the clean parsing logic to all array fields
    const payload = {
      dishName: dishData.dishName.trim(),
      aliases: parseStringToArray(dishData.aliases),
      ingredients: parseStringToArray(dishData.ingredients),
      unsuitableForIllnesses: parseStringToArray(
        dishData.unsuitableForIllnesses,
      ),
      containsAllergies: parseStringToArray(dishData.containsAllergies), // NEW
      dietaryFlags: parseStringToArray(dishData.dietaryFlags), // NEW
    };

    try {
      await API.post("/scans/add-dish", payload);
      alert("Dish added successfully with Medical Ontology!");

      // Reset the form
      setDishData({
        dishName: "",
        aliases: "",
        ingredients: "",
        unsuitableForIllnesses: "",
        containsAllergies: "",
        dietaryFlags: "",
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add New Dish to Dictionary</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Dish Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="e.g. Chicken Biryani"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
              value={dishData.dishName}
              onChange={(e) =>
                setDishData({ ...dishData, dishName: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Ingredients (comma separated){" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="e.g. Rice, Chicken, Oil, Spices"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
              value={dishData.ingredients}
              onChange={(e) =>
                setDishData({ ...dishData, ingredients: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Aliases (comma separated)
            </label>
            <input
              placeholder="e.g. Murg Biryani, Sindhi Biryani"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
              value={dishData.aliases}
              onChange={(e) =>
                setDishData({ ...dishData, aliases: e.target.value })
              }
            />
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <h3 className="text-indigo-400 font-bold mb-3 text-sm uppercase tracking-wider">
              Medical Ontology Engine
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Contains Allergies (comma separated)
                </label>
                <input
                  placeholder="e.g. Peanut, Milk, Wheat"
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
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
                <label className="block text-sm text-slate-400 mb-1">
                  Unsuitable For Illnesses (comma separated)
                </label>
                <input
                  placeholder="e.g. Heart Disease, Hypertension"
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
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
                <label className="block text-sm text-slate-400 mb-1">
                  Dietary Flags (comma separated)
                </label>
                <input
                  placeholder="e.g. High Sodium, High Sugar, Deep Fried"
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
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
            className="w-full py-4 mt-6 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Dish"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddDish;
