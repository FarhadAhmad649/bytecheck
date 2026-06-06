import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../index.css";

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatRow = ({ label, items }) => (
  <div>
    <span className="text-xs font-semibold tracking-widest uppercase text-emerald-500">
      {label}
    </span>
    {items?.length > 0 ? (
      <p className="text-white text-sm mt-1 capitalize">{items.join(", ")}</p>
    ) : (
      <p className="text-slate-500 italic text-sm mt-1">None listed.</p>
    )}
  </div>
);

// ─── Loading State ────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
    <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-emerald-500 anim-spin" />
    <p className="text-slate-400 text-sm">Loading your health profile…</p>
  </div>
);

// ─── Helpers for Array formatting ─────────────────────────────────────────────

const arrayToString = (arr) => (arr && arr.length > 0 ? arr.join(", ") : "");
const parseStringToArray = (str) => {
  if (!str) return [];
  return str
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null); // Modal state

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.info("Signing you out…", { autoClose: 1200 });
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 1400);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/users/profile");
        const userData = response.data?.user || response.data;
        setProfile(userData);

        toast.success(`Welcome back, ${userData?.fullName?.split(" ")[0]}!`, {
          autoClose: 3000,
        });
      } catch (err) {
        toast.error("Failed to load profile. Please log in again.");
        if (err.response?.status === 401) handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 🔴 Handle opening the edit modal and formatting arrays for text inputs
  const openEditModal = (member) => {
    setEditingProfile({
      ...member,
      allergiesStr: arrayToString(member.allergies),
      illnessesStr: arrayToString(member.illnesses),
      prohibitedFoodsStr: arrayToString(member.prohibitedFoods),
    });
  };

  // 🔴 The Delete Function
  const handleDeleteProfile = async (profileId, profileName) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${profileName}'s profile?`,
      )
    ) {
      try {
        const response = await API.delete(`/users/family/${profileId}`);
        // Update the main profile state with the new filtered array from the backend
        setProfile({
          ...profile,
          familyProfiles: response.data.familyProfiles,
        });
        toast.success(`${profileName}'s profile deleted! 🗑️`);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to delete profile.";
        toast.error(`Error: ${errorMessage}`);
      }
    }
  };

  // 🔴 The Update Function
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

      // Update the main profile state with the updated array from the backend
      setProfile({ ...profile, familyProfiles: response.data.familyProfiles });
      setEditingProfile(null); // Close the modal
      toast.success("Profile updated successfully! ✨");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update profile.";
      toast.error(`Error: ${errorMessage}`);
    }
  };

  if (loading) return <LoadingScreen />;

  const hp =
    profile?.familyProfiles?.length > 0 ? profile.familyProfiles[0] : {};

  // Exclude the primary user so we only list the added family members
  const familyMembers =
    profile?.familyProfiles?.filter((member) => !member.isPrimary) || [];

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-10 anim-fade-up">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
                Health Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Hello,{" "}
                <span className="text-emerald-400">
                  {profile?.fullName?.split(" ")[0]}
                </span>{" "}
                👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Here's your current health overview.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
              Logout
            </button>
          </div>

          {/* ── Health Profile Card ── */}
          <div className="rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-800 p-6 sm:p-8 mb-5 shadow-xl hover:shadow-emerald-900/20 transition-shadow duration-300 anim-slide-up">
            {/* Primary Profile Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <span className="text-lg">🩺</span>
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Your Primary Profile
                </h2>
              </div>
              <button
                onClick={() => navigate("/edit-profile")}
                className="text-sm font-medium text-emerald-400 border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                Edit Profile ⚙️
              </button>
            </div>

            <div className="space-y-5 divide-y divide-slate-800/70">
              <StatRow label="Allergies" items={hp?.allergies} />
              <div className="pt-5">
                <StatRow label="Illnesses" items={hp?.illnesses} />
              </div>
              <div className="pt-5">
                <StatRow
                  label="Prohibited Foods (Doctor's Orders)"
                  items={hp?.prohibitedFoods}
                />
              </div>
            </div>

            {/* Redesigned Family Members Section */}
            <div className="mt-8 pt-6 border-t border-slate-800/70">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
                  Protected Family Members
                </span>
                <button
                  onClick={() => navigate("/manage-family")}
                  className="text-xs font-medium text-blue-400 border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  Add Family ➕
                </button>
              </div>

              {/* Family Cards Grid */}
              {familyMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {familyMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl hover:border-slate-600 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">
                            👤
                          </div>
                          <h3 className="font-bold text-slate-200 capitalize">
                            {member.name}
                          </h3>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mt-0.5">
                              Allergies:
                            </span>
                            <span className="text-red-300 font-medium text-right capitalize">
                              {member.allergies?.length > 0
                                ? member.allergies.join(", ")
                                : "None"}
                            </span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mt-0.5">
                              Illnesses:
                            </span>
                            <span className="text-yellow-300 font-medium text-right capitalize">
                              {member.illnesses?.length > 0
                                ? member.illnesses.join(", ")
                                : "None"}
                            </span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mt-0.5">
                              Prohibited:
                            </span>
                            <span className="text-orange-300 font-medium text-right capitalize">
                              {member.prohibitedFoods?.length > 0
                                ? member.prohibitedFoods.join(", ")
                                : "None"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 🔴 NEW: Edit / Delete Buttons */}
                      <div className="flex justify-end gap-4 mt-4 pt-3 border-t border-slate-700/50">
                        <button
                          onClick={() => openEditModal(member)}
                          className="text-[10px] sm:text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wide transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteProfile(member._id, member.name)
                          }
                          className="text-[10px] sm:text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wide transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 border border-dashed border-slate-700 p-6 rounded-xl text-center">
                  <p className="text-slate-400 text-sm mb-2">
                    No family members added yet.
                  </p>
                  <p className="text-slate-500 text-xs">
                    Add your family to verify food safety for everyone at once.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/scan")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200 anim-slide-up anim-delay-1"
            >
              📷 Scan a Food Label
            </button>

            <button
              onClick={() => navigate("/history")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-orange-600 hover:bg-orange-500 transition-colors duration-200 anim-slide-up anim-delay-2"
            >
              🕒 View Scan History
            </button>

            {profile?.role === "admin" && (
              <>
                <button
                  onClick={() => navigate("/add-dish")}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white bg-purple-600 hover:bg-purple-500 transition-colors duration-200 anim-slide-up border border-purple-500 mt-4"
                >
                  ⚙️ Admin: Manage Food Database
                </button>
                <button
                  onClick={() => navigate("/manage-dishes")}
                  className="w-full py-4 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 transition-colors shadow-md"
                >
                  ⚙️ Manage Food Dictionary
                </button>
              </>
            )}
          </div>
        </div>

        {/* 🔴 NEW: Edit Family Profile Modal */}
        {editingProfile && (
          <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black">
              <div className="mb-5 pb-3 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Edit Profile:{" "}
                  <span className="text-blue-400 capitalize">
                    {editingProfile.name}
                  </span>
                </h3>
                <button
                  onClick={() => setEditingProfile(null)}
                  className="text-slate-500 hover:text-slate-300 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Member Name
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950/50 p-3 text-sm rounded-lg border border-slate-700 focus:border-blue-500 outline-none transition-colors text-white"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Allergies{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    className="w-full bg-slate-950/50 p-3 text-sm rounded-lg border border-slate-700 focus:border-red-500/50 outline-none transition-colors text-red-300"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Illnesses{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    className="w-full bg-slate-950/50 p-3 text-sm rounded-lg border border-slate-700 focus:border-yellow-500/50 outline-none transition-colors text-yellow-300"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Prohibited Foods{" "}
                    <span className="normal-case tracking-normal font-normal opacity-70">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    className="w-full bg-slate-950/50 p-3 text-sm rounded-lg border border-slate-700 focus:border-orange-500/50 outline-none transition-colors text-orange-300"
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

                <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="flex-1 py-3 bg-slate-800 text-sm text-slate-300 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-sm text-white rounded-lg hover:bg-blue-500 font-bold transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
