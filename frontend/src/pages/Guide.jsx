import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ALLERGEN_DATA,
  getThemeForAllergen,
} from "../components/AllergenGuide";
import BottomNav from "../components/BottomNav";

const GuideCard = ({ allergen, theme, isDark, autoExpand }) => {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const cardRef = useRef(null);
  const colors = getThemeForAllergen(allergen.id, isDark);

  useEffect(() => {
    if (autoExpand && cardRef.current) {
      setTimeout(() => {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [autoExpand]);

  return (
    <div
      ref={cardRef}
      className={`rounded-3xl border-l-4 border transition-all ${theme.card} ${colors.border}`}
    >
      {/* ── Summary Header (Always Visible) ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/40 select-none"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${colors.bg}`}
          >
            {allergen.emoji}
          </div>
          <div>
            <h3 className={`font-extrabold text-lg ${colors.text}`}>
              {allergen.name}
            </h3>
            <p className={`text-[11px] font-bold mt-0.5 ${theme.textSub}`}>
              {allergen.description}
            </p>
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-gray-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* ── Expanded Details ── */}
      {isExpanded && (
        <div
          className={`p-5 border-t ${theme.divider} ${isDark ? "bg-slate-950/30" : "bg-gray-50/50"}`}
        >
          <p
            className={`text-sm font-medium leading-relaxed mb-5 ${theme.textMain}`}
          >
            {allergen.details}
          </p>

          <div className="space-y-5">
            {/* Hidden Names */}
            <div>
              <h4
                className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme.textSub}`}
              >
                Hidden Names on Labels
              </h4>
              <div className="flex flex-wrap gap-2">
                {allergen.hiddenNames.map((name, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Cautions */}
            <div
              className={`p-4 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}
            >
              <h4
                className={`text-[10px] font-black uppercase tracking-widest mb-2 text-red-500`}
              >
                ⚠️ Key Cautions
              </h4>
              <ul className="flex flex-col gap-2">
                {allergen.cautions.map((caution, idx) => (
                  <li
                    key={idx}
                    className={`text-xs font-semibold flex items-start gap-2 ${theme.textMain}`}
                  >
                    <span className="text-red-500 opacity-70 mt-0.5">•</span>{" "}
                    {caution}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Guide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const expandId = location.state?.expandId;

  // 🔴 Theme State
  const isDark = localStorage.getItem("theme") === "dark";

  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-500",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    bottomNav: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
  };

  return (
    <div
      className={`min-h-screen ${theme.bgApp} flex justify-center font-sans`}
    >
      <div
        className={`w-full max-w-md ${theme.bgContainer} min-h-screen relative overflow-x-hidden pb-32 shadow-2xl sm:rounded-3xl sm:my-4 sm:h-[95vh] sm:overflow-y-auto custom-scrollbar transition-colors duration-300`}
      >
        {/* ── Header ── */}
        <div
          className={`px-6 pt-10 pb-6 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-10 border-b ${theme.divider}`}
        >
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 block mb-0.5">
              Encyclopedia
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Allergen Guide
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1 ${theme.btnBack}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        {/* ── Content ── */}
        <div className="px-6 mt-6">
          <p
            className={`${theme.textSub} text-sm mb-6 font-medium leading-relaxed`}
          >
            Learn about the most common food allergies, hidden label names, and
            cross-contamination hazards.
          </p>

          <div className="flex flex-col gap-4">
            {ALLERGEN_DATA.map((allergen) => (
              <GuideCard
                key={allergen.id}
                allergen={allergen}
                theme={theme}
                isDark={isDark}
                autoExpand={expandId === allergen.id}
              />
            ))}
          </div>
        </div>

        {/* ── Persistent Bottom Navigation Bar ── */}
        <BottomNav theme={theme} />
      </div>
    </div>
  );
};

export default Guide;
