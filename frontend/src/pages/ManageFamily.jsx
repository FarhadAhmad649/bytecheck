import { useState } from "react";
import API from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ManageFamily = () => {
  const [formData, setFormData] = useState({
    name: "",
    allergies: "",
    illnesses: "",
    prohibitedFoods: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to neatly parse strings into arrays
  const parseStringToArray = (str) => {
    if (!str) return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      allergies: parseStringToArray(formData.allergies),
      illnesses: parseStringToArray(formData.illnesses),
      prohibitedFoods: parseStringToArray(formData.prohibitedFoods),
    };

    try {
      // Calls the new backend route we just made
      await API.post("/users/family", payload);

      toast.success(`${payload.name} has been added to your family!`);

      // Reset form (Cleaned up!)
      setFormData({
        name: "",
        allergies: "",
        illnesses: "",
        prohibitedFoods: "",
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to add family member.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 flex justify-center items-center">
      <div className="max-w-xl w-full bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Family Member</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-6">
          Add your family members' dietary restrictions. When you scan a
          product, BiteCheck will verify it against everyone at once!
        </p>

        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Name (e.g. Sister, Dad) *
            </label>
            <input
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Allergies (comma separated)
            </label>
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="e.g. Milk, Peanut"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Illnesses (comma separated)
            </label>
            <input
              type="text"
              name="illnesses"
              value={formData.illnesses}
              onChange={handleChange}
              placeholder="e.g. Diabetes, Heart Disease"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          {/* NEW: Prohibited Foods Input Added Here */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Doctor Prohibited Foods (comma separated)
            </label>
            <input
              type="text"
              name="prohibitedFoods"
              value={formData.prohibitedFoods}
              onChange={handleChange}
              placeholder="e.g. Grapefruit, Spinach"
              className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <button
            disabled={loading}
            className="w-full py-4 mt-6 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add to Family"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManageFamily;
