import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";

const ManageFamily = () => {
  const [formData, setFormData] = useState({
    name: "",
    allergies: "",
    illnesses: "",
    prohibitedFoods: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔴 Theme State
  const isDark = localStorage.getItem("theme") === "dark";

  // 🔴 Dynamic Styling Classes Based on Theme
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-500",
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white placeholder-slate-600 focus:ring-purple-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-purple-500/50",
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
      await API.post("/users/family", payload);

      toast.success(`${payload.name} has been added to your family! ✨`);

      setFormData({
        name: "",
        allergies: "",
        illnesses: "",
        prohibitedFoods: "",
      });

      // Optional: You could navigate them back to the dashboard right after adding
      // navigate("/dashboard");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to add family member.",
      );
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
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-purple-500 block mb-0.5">
              Dietary Setup
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Add Member
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1 ${theme.btnBack}`}
          >
            Cancel
          </button>
        </div>

        {/* ── Form Content ── */}
        <div className="px-6 mt-6">
          <div
            className={`p-6 mb-6 rounded-3xl border flex items-start gap-4 ${isDark ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-100"}`}
          >
            <span className="text-3xl mt-1">👨‍👩‍👧‍👦</span>
            <p
              className={`text-sm font-medium leading-relaxed ${isDark ? "text-purple-200" : "text-purple-800"}`}
            >
              Add family members below. BiteCheck will automatically verify food
              safety against{" "}
              <span className="font-bold">everyone's profiles at once</span>{" "}
              when you scan.
            </p>
          </div>

          <form onSubmit={handleAddMember} className="space-y-5">
            <div className={`p-6 rounded-3xl border ${theme.card}`}>
              <div className="space-y-4 flex flex-col gap-1">
                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Name{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (e.g. Sister, Dad)
                    </span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                  />
                </div>

                <div className={`h-px w-full my-2 ${theme.divider}`} />

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Allergies{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="allergies"
                    placeholder="e.g. Milk, Peanut"
                    value={formData.allergies}
                    onChange={handleChange}
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Illnesses{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="illnesses"
                    placeholder="e.g. Diabetes, Heart Disease"
                    value={formData.illnesses}
                    onChange={handleChange}
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Doctor Prohibited{" "}
                    <span className="normal-case opacity-70 tracking-normal">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="prohibitedFoods"
                    placeholder="e.g. Grapefruit, Spinach"
                    value={formData.prohibitedFoods}
                    onChange={handleChange}
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 ${theme.inputBg}`}
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full py-4 mt-4 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? "Adding Member..." : "Add to Family"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManageFamily;
