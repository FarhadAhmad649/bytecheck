import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import { COMMON_ALLERGIES } from "../utils/contants";

// ─────────────────────────────────────────────
// Reusable Input Field
// ─────────────────────────────────────────────
const Field = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  required = false,
  theme,
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
    >
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-emerald-500/50 ${theme.inputBg}`}
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
    profileImage: "", // 🔴 NEW: State for Profile Image
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Theme State
  const isDark = localStorage.getItem("theme") === "dark";
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-500",
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white placeholder-slate-600"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-700 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    tagSelected: isDark
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
      : "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm",
    tagUnselected: isDark
      ? "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 shadow-sm",
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/users/profile");
        const userData = data.user || data;
        const myProfile =
          userData.familyProfiles && userData.familyProfiles.length > 0
            ? userData.familyProfiles[0]
            : {};

        setFormData({
          fullName: userData.fullName || "",
          profileImage: userData.profileImage || "", // 🔴 Pull existing image from DB
          allergies: myProfile.allergies || [],
          illnesses: myProfile.illnesses?.join(", ") || "",
          prohibitedFoods: myProfile.prohibitedFoods?.join(", ") || "",
        });
      } catch (err) {
        toast.error("Failed to load profile data.");
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

  // 🔴 NEW: Handle Image File Selection & Convert to Base64 String
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // Limit to 2MB to keep MongoDB happy
        toast.error("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
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

      // 🔴 Send the profile image string directly in the body!
      await API.put("/users/profile", {
        fullName: formData.fullName,
        profileImage: formData.profileImage,
        healthProfile,
      });

      toast.success("Profile updated successfully! ✨");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${theme.bgContainer} flex flex-col items-center justify-center`}
      >
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  // Fallback UI Avatar if no custom image is set
  const avatarUrl =
    formData.profileImage ||
    `https://ui-avatars.com/api/?name=${formData.fullName || "U"}&background=10B981&color=fff&bold=true`;

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
            Edit Profile
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${theme.btnBack}`}
          >
            Cancel
          </button>
        </div>

        {/* ── Content ── */}
        <div className="px-6 mt-6">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className={`p-6 rounded-3xl border ${theme.card}`}>
              {/* 🔴 NEW: Interactive Avatar Uploader */}
              <div className="flex flex-col items-center mb-8">
                <div
                  className="relative group w-24 h-24 rounded-full border-4 border-emerald-500 shadow-md cursor-pointer overflow-hidden transition-transform active:scale-95"
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xl">📷</span>
                    <span className="text-white text-[10px] font-bold mt-1">
                      Change
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p
                  className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${theme.textSub}`}
                >
                  Profile Photo
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <Field
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  theme={theme}
                />
                <div className={`h-px w-full my-1 ${theme.divider}`} />

                {/* Smart Tags for Allergies */}
                <div className="flex flex-col gap-2.5">
                  <label
                    className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}
                  >
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
                          className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200 border active:scale-95 ${isSelected ? theme.tagSelected : theme.tagUnselected}`}
                        >
                          {isSelected ? "✓ " : "+ "} {allergy}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`h-px w-full my-1 ${theme.divider}`} />
                <Field
                  label="Illnesses (Comma-separated)"
                  name="illnesses"
                  placeholder="e.g. Heart Disease, Diabetes"
                  value={formData.illnesses}
                  onChange={handleChange}
                  theme={theme}
                />
                <Field
                  label="Prohibited by Doctor"
                  name="prohibitedFoods"
                  placeholder="e.g. High Sodium, Sugar"
                  value={formData.prohibitedFoods}
                  onChange={handleChange}
                  theme={theme}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
