import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";
import BottomNav from "../components/BottomNav";

// ─── Dynamic Theme Stylers ───────────────────────────────────────────────────

const getStatusStyles = (status, isDark) => {
  if (status === "Safe")
    return {
      border: "border-l-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: isDark
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  if (status === "Caution")
    return {
      border: "border-l-orange-400",
      text: "text-orange-600 dark:text-orange-400",
      badge: isDark
        ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
        : "bg-orange-50 text-orange-700 border border-orange-200",
    };
  return {
    border: "border-l-red-500",
    text: "text-red-600 dark:text-red-400",
    badge: isDark
      ? "bg-red-500/15 text-red-400 border border-red-500/20"
      : "bg-red-50 text-red-700 border border-red-200",
  };
};

const formatDate = (dateString) => {
  if (!dateString) return "Unknown time";
  const d = new Date(dateString);
  const datePart = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} • ${timePart}`;
};

// ─── Smart History Parsing Component ──────────────────────────────────────────

const parseReasonText = (reasonText) => {
  if (!reasonText) return null;
  try {
    const dishMatch = reasonText.match(/Warning: (.*?) poses a risk to: (.*)/);
    if (!dishMatch) return null;

    const dishName = dishMatch[1];
    const profilesString = dishMatch[2];

    const profileRegex = /([^,]+?)\s*\(due to\s*(.+?)\)(?=\s*,|\s*\.|$)/g;
    let profiles = [];
    let match;

    while ((match = profileRegex.exec(profilesString)) !== null) {
      profiles.push({
        name: match[1].trim(),
        reasons: match[2].split(",").map((r) => r.trim()),
      });
    }

    return { dishName, profiles };
  } catch {
    return null;
  }
};

const HistoryWarningCard = ({ reasonText, theme, isDark }) => {
  if (!reasonText || !reasonText.includes("poses a risk to")) {
    return (
      <div
        className={`p-4 mb-4 border rounded-xl text-sm font-bold flex items-center gap-2 ${
          isDark
            ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}
      >
        ✅ {reasonText || "Safe to eat."}
      </div>
    );
  }

  const parsed = parseReasonText(reasonText);
  if (!parsed) {
    return (
      <div
        className={`p-4 mb-4 border rounded-xl ${
          isDark
            ? "bg-orange-950/20 border-orange-900/40"
            : "bg-orange-50 border-orange-200"
        }`}
      >
        <p className="text-orange-700 dark:text-orange-500 text-sm font-bold flex items-start gap-2">
          ⚠️ <span>{reasonText}</span>
        </p>
      </div>
    );
  }

  const { dishName, profiles } = parsed;

  return (
    <div
      className={`p-4 sm:p-5 mb-4 border rounded-2xl shadow-sm ${
        isDark ? "bg-slate-950/40 border-red-950" : "bg-red-50 border-red-200"
      }`}
    >
      <h4 className="text-red-600 dark:text-red-500 font-extrabold mb-3 flex items-center gap-2 text-sm sm:text-base">
        ⚠️ Hazard:{" "}
        <span className="capitalize font-black text-gray-900 dark:text-gray-100">
          {dishName}
        </span>
      </h4>

      <div className="grid grid-cols-1 gap-2.5">
        {profiles.map((profile, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <span
              className={`font-bold text-xs sm:text-sm block mb-2 flex items-center gap-1.5 ${theme.textMain}`}
            >
              👤 {profile.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.reasons.map((reason, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] sm:text-xs font-bold rounded-lg border border-red-200 dark:border-red-500/20 capitalize"
                >
                  🚨 {reason.replace(/hidden as/g, "found as")}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Individual Collapsible Card Component ────────────────────────────────────

const HistoryCard = ({ log, theme, isDark, autoExpand, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(autoExpand || false);
  const cardRef = useRef(null);
  const styles = getStatusStyles(log.analysisResult.status, isDark);

  useEffect(() => {
    if (autoExpand && cardRef.current) {
      setTimeout(() => {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [autoExpand]);

  const targetMatch = log.extractedText?.match(/^Target:\s*(.*?)\n/);
  const searchTarget = targetMatch ? targetMatch[1] : "Whole Family";

  const displayExtractedText = log.extractedText
    ? log.extractedText.replace(/^Target:\s*.*?\n+/, "")
    : "";

  let title = "Scan Result";
  const parsed = parseReasonText(log.analysisResult.reason);
  if (parsed?.dishName) {
    title = parsed.dishName;
  } else if (log.scanType === "barcode") {
    title = "Barcode Scan";
  } else if (log.scanType === "image" || log.scanType === "label") {
    title = "Label Scan";
  } else if (log.scanType === "text" || log.scanType === "dish") {
    title = "Dish / Text Scan";
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border-l-4 border shadow-sm overflow-hidden transition-all ${theme.card} ${styles.border}`}
    >
      {/* ── Header Container ── */}
      <div className="flex items-center pr-3">
        {/* Clickable Area for Expansion */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors select-none"
        >
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${styles.badge}`}
              >
                {log.analysisResult.status}
              </span>
              <span className={`text-[10px] font-bold ${theme.textSub}`}>
                {formatDate(log.createdAt)}
              </span>
            </div>
            <h3
              className={`text-base font-extrabold capitalize truncate pr-4 ${theme.textMain}`}
            >
              {title}
            </h3>
            <span
              className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${theme.textSub}`}
            >
              🎯 Target:{" "}
              <strong className="text-emerald-600 dark:text-emerald-500 capitalize">
                {searchTarget}
              </strong>
            </span>
          </div>

          {/* THE DROPDOWN ARROW */}
          <div
            className={`w-8 h-8 shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center transition-transform duration-300 mr-2 ${
              isExpanded ? "rotate-180" : ""
            }`}
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

        {/* THE DELETE BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(log._id);
          }}
          className="p-2.5 shrink-0 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
          title="Delete Scan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* ── Expanded Content ── */}
      {isExpanded && (
        <div
          className={`px-5 pb-5 border-t pt-4 ${
            isDark
              ? "bg-slate-950/20 border-slate-900"
              : "bg-gray-50/80 border-gray-200"
          }`}
        >
          <HistoryWarningCard
            reasonText={log.analysisResult.reason}
            theme={theme}
            isDark={isDark}
          />

          {log.analysisResult.flaggedIngredients?.length > 0 &&
            log.analysisResult.reason &&
            !log.analysisResult.reason.includes("poses a risk to") && (
              <p className="text-xs sm:text-sm mb-3 font-semibold text-gray-800 dark:text-slate-200">
                <span>Flagged culprits: </span>
                <span className="text-red-600 dark:text-red-500 capitalize font-bold">
                  {log.analysisResult.flaggedIngredients.join(", ")}
                </span>
              </p>
            )}

          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 ml-1">
              Extracted Raw Log Data
            </p>
            <p
              className={`text-xs font-mono whitespace-pre-wrap rounded-xl p-4 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar border ${theme.inputBg}`}
            >
              {displayExtractedText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main History Layout ─────────────────────────────────────────────────────

const History = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const expandLogId = location.state?.expandLogId;

  const isDark = localStorage.getItem("theme") === "dark";

  const theme = {
    bgApp: isDark ? "bg-black" : "bg-gray-900",
    bgContainer: isDark ? "bg-slate-950" : "bg-[#F8F9FA]",
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200 shadow-sm",
    textMain: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-slate-400" : "text-gray-600",
    inputBg: isDark
      ? "bg-slate-950/40 border-slate-800 text-slate-300"
      : "bg-white border-gray-200 text-gray-800 shadow-inner",
    btnBack: isDark
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    bottomNav: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await API.get("/scans/history");
        setLogs(response.data.history || []);
      } catch (err) {
        setError("Failed to locate past scan sequences.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this scan record permanently?")) {
      try {
        await API.delete(`/scans/${id}`);
        setLogs(logs.filter((log) => log._id !== id));
        toast.success("Scan deleted successfully!");
      } catch (err) {
        toast.error(
          "Failed to delete record. Please check your backend route.",
        );
      }
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
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-emerald-600 animate-spin" />
        </div>
      </div>
    );
  }

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
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 block mb-0.5">
              Secure History
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Scan Records
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

        <div className="px-6 mt-6">
          {error && (
            <p className="text-center text-red-600 dark:text-red-500 text-xs font-bold mb-4">
              {error}
            </p>
          )}

          {logs.length === 0 && (
            <div
              className={`text-center rounded-[32px] p-8 border ${theme.card}`}
            >
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className={`font-extrabold text-lg ${theme.textMain}`}>
                No records tracked
              </h3>
              <p
                className={`text-xs mt-2 max-w-[220px] mx-auto leading-relaxed font-bold ${theme.textSub}`}
              >
                You haven't evaluated any nutrition targets or menus yet.
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="mt-6 px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 active:scale-95"
              >
                Scan First Item
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {logs.map((log) => (
              <HistoryCard
                key={log._id}
                log={log}
                theme={theme}
                isDark={isDark}
                autoExpand={expandLogId === log._id}
                onDelete={handleDelete}
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

export default History;
