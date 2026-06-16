import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";
import BottomNav from "./BottomNav";

// ─── Helpers for Array Formatting ───
const arrayToString = (arr) => (arr && arr.length > 0 ? arr.join(", ") : "");
const parseStringToArray = (str) => {
  if (!str) return [];
  return str
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
};

const MyProfile = () => {
  const [user, setUser] = useState(null);
  const [healthData, setHealthData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null);
  const navigate = useNavigate();

  // Theme State
  const isDark = localStorage.getItem("theme") === "dark";

  // Dynamic Styling Classes Based on Theme
  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200 shadow-sm",
    innerCard: isDark ? "bg-slate-950/50" : "bg-gray-50",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-600",
    inputBg: isDark
      ? "bg-slate-950/50 border-slate-700 text-white placeholder-slate-600 focus:ring-emerald-500/50"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-emerald-500/50",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    modalBg: isDark
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-100",
    tagBlue: isDark
      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
      : "bg-blue-50 border-blue-200 text-blue-700",
    tagRed: isDark
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : "bg-red-50 border-red-200 text-red-700",
    tagYellow: isDark
      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
      : "bg-yellow-50 border-yellow-200 text-yellow-700",
    bottomNav: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/users/profile");
        const userData = response.data?.user || response.data;
        setUser(userData);

        if (userData.familyProfiles && userData.familyProfiles.length > 0) {
          setHealthData(userData.familyProfiles[0]);
        }
      } catch (err) {
        toast.error("Failed to load profile data.");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const openEditModal = (member) => {
    setEditingProfile({
      ...member,
      allergiesStr: arrayToString(member.allergies),
      illnessesStr: arrayToString(member.illnesses),
      prohibitedFoodsStr: arrayToString(member.prohibitedFoods),
    });
  };

  const handleDeleteProfile = async (profileId, profileName) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${profileName}'s profile?`,
      )
    ) {
      try {
        const response = await API.delete(`/users/family/${profileId}`);
        setUser({ ...user, familyProfiles: response.data.familyProfiles });
        toast.success(`${profileName}'s profile deleted! 🗑️`);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to delete profile.";
        toast.error(`Error: ${errorMessage}`);
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editingProfile.name.trim(),
        allergies: parseStringToArray(editingProfile.allergiesStr),
        illnesses: parseStringToArray(editingProfile.illnessesStr),
        prohibitedFoods: parseStringToArray(editingProfile.prohibitedFoodsStr),
      };

      const response = await API.put(
        `/users/family/${editingProfile._id}`,
        payload,
      );
      setUser({ ...user, familyProfiles: response.data.familyProfiles });
      setEditingProfile(null);
      toast.success("Profile updated successfully! ✨");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update profile.";
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
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  const avatarUrl =
    user?.profileImage ||
    `https://ui-avatars.com/api/?name=${user?.fullName || "User"}&background=10B981&color=fff&bold=true`;
  const familyMembers =
    user?.familyProfiles?.filter((member) => !member.isPrimary) || [];

  return (
    <div
      className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
    >
      <div
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative overflow-x-hidden pb-32 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        <div
          className={`px-6 pt-10 pb-6 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b ${theme.divider}`}
        >
          <h1
            className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
          >
            My Profile
          </h1>
        </div>

        <div className="px-6 mt-8 flex flex-col items-center">
          <div className="relative">
            <div
              className="w-28 h-28 rounded-full border-4 border-emerald-500 shadow-xl overflow-hidden"
              style={{
                backgroundImage: `url(${avatarUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <span className="absolute top-2 right-0 w-5 h-5 bg-emerald-500 border-4 border-white dark:border-slate-950 rounded-full"></span>
          </div>

          <h2
            className={`mt-5 text-2xl font-black tracking-tight capitalize ${theme.textMain}`}
          >
            {user?.fullName}
          </h2>
          <p className={`text-sm font-semibold mt-1 ${theme.textSub}`}>
            {user?.email}
          </p>

          <div className={`w-full h-px my-8 ${theme.divider}`}></div>

          <div className="w-full space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h3
                className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}
              >
                Your Dietary Profile
              </h3>
              <button
                onClick={() => navigate("/edit-profile")}
                className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md active:scale-95"
              >
                Edit Primary
              </button>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.card}`}>
              <span
                className={`text-xs font-bold uppercase tracking-wider block mb-3 ${theme.textSub}`}
              >
                Allergies
              </span>
              <div className="flex flex-wrap gap-2">
                {healthData.allergies?.length > 0 ? (
                  healthData.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${theme.tagRed}`}
                    >
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span className={`text-sm font-medium ${theme.textSub}`}>
                    No allergies listed.
                  </span>
                )}
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.card}`}>
              <span
                className={`text-xs font-bold uppercase tracking-wider block mb-3 ${theme.textSub}`}
              >
                Illnesses
              </span>
              <div className="flex flex-wrap gap-2">
                {healthData.illnesses?.length > 0 ? (
                  healthData.illnesses.map((illness, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${theme.tagYellow}`}
                    >
                      {illness}
                    </span>
                  ))
                ) : (
                  <span className={`text-sm font-medium ${theme.textSub}`}>
                    No illnesses listed.
                  </span>
                )}
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.card}`}>
              <span
                className={`text-xs font-bold uppercase tracking-wider block mb-3 ${theme.textSub}`}
              >
                Doctor Prohibited
              </span>
              <div className="flex flex-wrap gap-2">
                {healthData.prohibitedFoods?.length > 0 ? (
                  healthData.prohibitedFoods.map((food, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${theme.tagBlue}`}
                    >
                      {food}
                    </span>
                  ))
                ) : (
                  <span className={`text-sm font-medium ${theme.textSub}`}>
                    No prohibited foods listed.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`w-full h-px my-8 ${theme.divider}`}></div>

          <div className="w-full space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h3
                className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}
              >
                Family Members
              </h3>
              <button
                onClick={() => navigate("/manage-family")}
                className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-md active:scale-95"
              >
                Add New
              </button>
            </div>

            {familyMembers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {familyMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className={`border p-5 rounded-3xl shadow-sm flex flex-col justify-between transition-colors ${theme.card}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
                      >
                        👤
                      </div>
                      <h3
                        className={`font-extrabold capitalize text-lg ${theme.textMain}`}
                      >
                        {member.name}
                      </h3>
                    </div>

                    <div
                      className={`space-y-3 text-sm p-4 rounded-2xl ${theme.innerCard}`}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`font-bold text-[10px] uppercase tracking-wider mt-0.5 ${theme.textSub}`}
                        >
                          Allergies:
                        </span>
                        <span className="text-red-500 font-bold capitalize text-right text-xs">
                          {member.allergies?.length > 0
                            ? member.allergies.join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span
                          className={`font-bold text-[10px] uppercase tracking-wider mt-0.5 ${theme.textSub}`}
                        >
                          Illnesses:
                        </span>
                        <span className="text-yellow-600 dark:text-yellow-500 font-bold capitalize text-right text-xs">
                          {member.illnesses?.length > 0
                            ? member.illnesses.join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span
                          className={`font-bold text-[10px] uppercase tracking-wider mt-0.5 ${theme.textSub}`}
                        >
                          Prohibited:
                        </span>
                        <span className="text-blue-600 dark:text-blue-500 font-bold capitalize text-right text-xs">
                          {member.prohibitedFoods?.length > 0
                            ? member.prohibitedFoods.join(", ")
                            : "None"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 mt-4">
                      <button
                        onClick={() => openEditModal(member)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 ${isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteProfile(member._id, member.name)
                        }
                        className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`border border-dashed p-6 rounded-3xl text-center ${theme.card}`}
              >
                <p className={`font-bold mb-1 ${theme.textMain}`}>
                  No family members added
                </p>
                <p className={`text-xs ${theme.textSub}`}>
                  Add family to verify food safety for everyone at once.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Edit Family Member Modal ── */}
        {editingProfile && (
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
                    {editingProfile.name}
                  </span>
                </h3>
                <button
                  onClick={() => setEditingProfile(null)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-colors ${theme.btnBack}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Member Name
                  </label>
                  <input
                    required
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${theme.inputBg}`}
                    value={editingProfile.name}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Allergies{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (csv)
                    </span>
                  </label>
                  <input
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-red-500/50 text-red-500 ${theme.inputBg}`}
                    value={editingProfile.allergiesStr}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        allergiesStr: e.target.value,
                      })
                    }
                    placeholder="e.g. peanuts, dairy"
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Illnesses{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (csv)
                    </span>
                  </label>
                  <input
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-yellow-500/50 text-yellow-600 dark:text-yellow-500 ${theme.inputBg}`}
                    value={editingProfile.illnessesStr}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        illnessesStr: e.target.value,
                      })
                    }
                    placeholder="e.g. diabetes, hypertension"
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
                  >
                    Prohibited Foods{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (csv)
                    </span>
                  </label>
                  <input
                    className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500/50 text-blue-600 dark:text-blue-500 ${theme.inputBg}`}
                    value={editingProfile.prohibitedFoodsStr}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        prohibitedFoodsStr: e.target.value,
                      })
                    }
                    placeholder="e.g. sugar, salt"
                  />
                </div>

                <div
                  className={`flex gap-3 pt-6 border-t ${theme.divider} mt-4`}
                >
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
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

        {/* ── Persistent Bottom Navigation Bar ── */}
        <BottomNav theme={theme} />
      </div>
    </div>
  );
};

export default MyProfile;
