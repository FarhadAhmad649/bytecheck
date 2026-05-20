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

// ─── Loading Screen ───────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
    <div className="w-9 h-9 rounded-full border-4 border-slate-800 border-t-emerald-500 anim-spin" />
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10 anim-fade-up">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
              Scan History
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Your Past Scans
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              A log of every food label you've scanned.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors duration-200"
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
            Dashboard
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-center text-red-400 text-sm mb-6">{error}</p>
        )}

        {/* ── Empty State ── */}
        {!loading && logs.length === 0 && (
          <div className="text-center rounded-2xl bg-slate-900/80 border border-slate-800 p-10 anim-slide-up">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="text-white font-semibold text-lg mb-1">
              No scans yet
            </p>
            <p className="text-slate-500 text-sm mb-6">
              You haven't scanned any food labels yet!
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200"
            >
              📷 Scan Your First Item
            </button>
          </div>
        )}

        {/* ── Log Cards ── */}
        <div className="flex flex-col gap-4">
          {logs.map((log, i) => {
            const styles = getStatusStyles(log.analysisResult.status);
            return (
              <div
                key={log._id}
                className={`rounded-2xl bg-slate-900/80 border border-slate-800 border-l-4 ${styles.border} p-5 shadow-lg hover:shadow-slate-900 transition-shadow duration-200 anim-slide-up`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${styles.badge}`}
                  >
                    {log.analysisResult.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Reason */}
                <p className="text-sm text-slate-300 mb-3">
                  <span className="text-white font-semibold">Reason: </span>
                  {log.analysisResult.reason}
                </p>

                {/* Flagged Ingredients */}
                {log.analysisResult.flaggedIngredients?.length > 0 && (
                  <p className="text-sm mb-3">
                    <span className="text-white font-semibold">Flagged: </span>
                    <span className="text-red-400 capitalize">
                      {log.analysisResult.flaggedIngredients.join(", ")}
                    </span>
                  </p>
                )}

                {/* Collapsible Label Text */}
                <details className="group cursor-pointer">
                  <summary className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 list-none flex items-center gap-1 select-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    View Extracted Label Text
                  </summary>
                  <p className="mt-3 text-xs text-slate-400 whitespace-pre-wrap bg-slate-800/60 border border-slate-700 rounded-xl p-4 leading-relaxed">
                    {log.extractedText}
                  </p>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default History;

/*
  CSS — keyframes only (add to your global CSS or History.css)
  =============================================================

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .anim-fade-up {
    animation: fadeUp 0.5s ease both;
  }

  .anim-slide-up {
    animation: slideUp 0.45s ease both;
  }

  .anim-spin {
    animation: spin 0.75s linear infinite;
  }
*/
