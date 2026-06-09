import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusStyles = (status) => {
  if (status === "Safe")
    return {
      border: "border-l-emerald-500",
      text: "text-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    };
  if (status === "Caution")
    return {
      border: "border-l-orange-400",
      text: "text-orange-400",
      badge: "bg-orange-500/15 text-orange-400 border border-orange-400/30",
    };
  return {
    border: "border-l-red-500",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

const HistoryWarningCard = ({ reasonText }) => {
  if (!reasonText || !reasonText.includes("poses a risk to")) {
    return (
      <div className="p-3 sm:p-4 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-2">
        ✅ {reasonText || "Safe to eat."}
      </div>
    );
  }

  const parsed = parseReasonText(reasonText);
  if (!parsed) {
    return (
      <div className="p-3 sm:p-4 mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        <p className="text-orange-400 text-xs sm:text-sm flex items-start gap-2">
          ⚠️ <span>{reasonText}</span>
        </p>
      </div>
    );
  }

  const { dishName, profiles } = parsed;

  return (
    <div className="p-3 sm:p-5 mb-4 bg-slate-950/50 border border-red-500/30 rounded-xl shadow-lg shadow-red-900/10">
      <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
        ⚠️ Hazard: <span className="capitalize text-white">{dishName}</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {profiles.map((profile, idx) => (
          <div
            key={idx}
            className="bg-slate-800/80 p-3 rounded-xl border border-slate-700"
          >
            <span className="font-bold text-slate-200 text-xs sm:text-sm block mb-2 flex items-center gap-1.5">
              👤 {profile.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.reasons.map((reason, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-500/10 text-red-300 text-[10px] sm:text-xs font-semibold rounded-md border border-red-500/20 capitalize"
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

const HistoryCard = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = getStatusStyles(log.analysisResult.status);

  // 🔴 NEW: Target Extraction Logic
  // Looks for the hidden "Target: " stamp we added in the backend
  const targetMatch = log.extractedText?.match(/^Target:\s*(.*?)\n/);
  const searchTarget = targetMatch ? targetMatch[1] : "Whole Family";

  // Removes the hidden stamp so it doesn't show up in the "Extracted Data" box
  const displayExtractedText = log.extractedText
    ? log.extractedText.replace(/^Target:\s*.*?\n+/, "")
    : "";

  // Attempt to extract a nice title for the collapsed view
  let title = "Scan Result";
  const parsed = parseReasonText(log.analysisResult.reason);
  if (parsed?.dishName) {
    title = parsed.dishName;
  } else if (log.scanType === "barcode") {
    title = "Barcode Scan";
  } else if (log.scanType === "image") {
    title = "Label Scan";
  } else if (log.scanType === "text" || log.scanType === "dish") {
    title = "Dish / Text Scan";
  }

  return (
    <div
      className={`rounded-2xl bg-slate-900/80 border border-slate-800 border-l-4 ${styles.border} shadow-lg transition-all duration-200 overflow-hidden`}
    >
      {/* ALWAYS VISIBLE SUMMARY (Tap to expand) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
      >
        <div className="flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${styles.badge}`}
            >
              {log.analysisResult.status}
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-slate-500">
              {formatDate(log.createdAt)}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white capitalize truncate pr-4">
            {title}
          </h3>

          {/* 🔴 NEW: "Searched for" Display Badge */}
          <span className="text-[10px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            🎯 Searched for:{" "}
            <strong className="text-indigo-400 capitalize">
              {searchTarget}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-indigo-400 hidden sm:block">
            {isExpanded ? "Close" : "Details"}
          </span>
          <div
            className={`w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* EXPANDABLE DETAILS SECTION */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-800/50 pt-4 bg-slate-900/40">
          <HistoryWarningCard reasonText={log.analysisResult.reason} />

          {/* Flagged Ingredients Fallback */}
          {log.analysisResult.flaggedIngredients?.length > 0 &&
            log.analysisResult.reason &&
            !log.analysisResult.reason.includes("poses a risk to") && (
              <p className="text-xs sm:text-sm mb-3">
                <span className="text-white font-semibold">Flagged: </span>
                <span className="text-red-400 capitalize">
                  {log.analysisResult.flaggedIngredients.join(", ")}
                </span>
              </p>
            )}

          {/* Raw Text Box */}
          <div className="mt-2">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
              Extracted Data
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 whitespace-pre-wrap bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 sm:p-4 leading-relaxed font-mono max-h-40 overflow-y-auto custom-scrollbar">
              {/* 🔴 NEW: Renders the text WITHOUT the hidden target stamp */}
              {displayExtractedText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Loading Screen ───────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
    <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
    <p className="text-slate-400 text-sm">Loading past scans…</p>
  </div>
);

// ─── Main History ─────────────────────────────────────────────────────────────

const History = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await API.get("/scans/history");
        setLogs(response.data.history);
      } catch (err) {
        setError("Failed to load scan history.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
              Your Past Scans
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Scan History
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors duration-200"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-center text-red-400 text-sm mb-6">{error}</p>
        )}

        {/* ── Empty State ── */}
        {!loading && logs.length === 0 && (
          <div className="text-center rounded-2xl bg-slate-900/80 border border-slate-800 p-8 sm:p-10">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="text-white font-semibold text-lg mb-1">
              No scans yet
            </p>
            <p className="text-slate-500 text-sm mb-6">
              You haven't scanned any food labels yet!
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200 shadow-lg shadow-emerald-900/20"
            >
              📷 Scan Your First Item
            </button>
          </div>
        )}

        {/* ── Log Cards ── */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {logs.map((log) => (
            <HistoryCard key={log._id} log={log} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default History;
