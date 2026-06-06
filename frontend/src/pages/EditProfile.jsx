import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import { COMMON_ALLERGIES } from "../utils/contants";

const Field = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  required = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
      {label}
    </label>
    <input
      type="text"
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
    />
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const EditProfile = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    allergies: [],
    illnesses: "",
    prohibitedFoods: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // 1. Fetch current user data when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/users/profile");

        // FIX 1: Safely grab the user object from the API response
        // (Sometimes APIs return {user: {...}}, sometimes just the object itself)
        const userData = data.user || data;

        const myProfile =
          userData.familyProfiles && userData.familyProfiles.length > 0
            ? userData.familyProfiles[0]
            : {};

        setFormData({
          fullName: userData.fullName || "",
          // FIX 2: Keep allergies as an ARRAY so your toggleAllergy function doesn't crash!
          allergies: myProfile.allergies || [],
          illnesses: myProfile.illnesses?.join(", ") || "",
          prohibitedFoods: myProfile.prohibitedFoods?.join(", ") || "",
        });
      } catch (err) {
        toast.error("Failed to load profile data.", err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAllergy = (allergy) => {
    setFormData((prev) => {
      const isSelected = prev.allergies.includes(allergy);
      return {
        ...prev,
        allergies: isSelected
          ? prev.allergies.filter((a) => a !== allergy)
          : [...prev.allergies, allergy],
      };
    });
  };

  // 2. Save the updated data
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const healthProfile = {
        allergies: formData.allergies,
        illnesses: formData.illnesses
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean),
        prohibitedFoods: formData.prohibitedFoods
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean),
      };

      await API.put("/users/profile", {
        fullName: formData.fullName,
        healthProfile,
      });

      toast.success("Profile updated successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-blue-500 anim-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans px-4 py-12">
      <div className="max-w-xl mx-auto anim-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            <p className="text-slate-500 text-sm mt-1">
              Update your medical safety preferences.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleUpdate} className="flex flex-col gap-5">
            <Field
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <div className="h-px bg-slate-800 my-2" />

            {/* Smart Tags for Allergies */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Standard Allergies
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((allergy) => {
                  const isSelected = formData.allergies.includes(allergy);
                  return (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 border ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "} {allergy}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field
              label="Illnesses (Comma-separated)"
              name="illnesses"
              value={formData.illnesses}
              onChange={handleChange}
            />
            <Field
              label="Prohibited by Doctor (Comma-separated)"
              name="prohibitedFoods"
              value={formData.prohibitedFoods}
              onChange={handleChange}
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};;

export default EditProfile;
