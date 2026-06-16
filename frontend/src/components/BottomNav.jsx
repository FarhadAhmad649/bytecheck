import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ScanLine, BookOpen, Clock, User } from "lucide-react";

const BottomNav = ({ theme }) => {
  const navigate = useNavigate();
  const location = useLocation(); // Gets the current URL path

  // Helper function to check if a tab is active
  const isActive = (path) => {
    // Exact match for dashboard, partial match for others (like /profile or /edit-profile)
    if (path === "/dashboard" && location.pathname === "/dashboard")
      return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path))
      return true;
    return false;
  };

  // Helper function to apply the correct Tailwind classes
  const getButtonClass = (path) => {
    return isActive(path)
      ? "flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-500 transition-colors"
      : `flex flex-col items-center gap-1 ${theme.textSub} hover:text-emerald-600 transition-colors`;
  };

  return (
    <div
      className={`fixed bottom-0 w-full max-w-md ${theme.bottomNav} border-t px-6 py-4 flex justify-between items-center rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-[100] transition-colors`}
    >
      <button
        onClick={() => navigate("/dashboard")}
        className={getButtonClass("/dashboard")}
      >
        <Home size={24} strokeWidth={isActive("/dashboard") ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Home</span>
      </button>

      <button
        onClick={() => navigate("/scan")}
        className={getButtonClass("/scan")}
      >
        <ScanLine size={24} strokeWidth={isActive("/scan") ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Scan</span>
      </button>

      <button
        onClick={() => navigate("/guide")}
        className={getButtonClass("/guide")}
      >
        <BookOpen size={24} strokeWidth={isActive("/guide") ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Guide</span>
      </button>

      <button
        onClick={() => navigate("/history")}
        className={getButtonClass("/history")}
      >
        <Clock size={24} strokeWidth={isActive("/history") ? 2.5 : 2} />
        <span className="text-[10px] font-bold">History</span>
      </button>

      {/* Using /profile as the base path for profile-related pages */}
      <button
        onClick={() => navigate("/profile")}
        className={getButtonClass("/profile")}
      >
        <User size={24} strokeWidth={isActive("/profile") ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Profile</span>
      </button>
    </div>
  );
};

export default BottomNav;
