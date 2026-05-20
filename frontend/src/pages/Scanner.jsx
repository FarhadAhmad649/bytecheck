import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusStyles = (status) => {
  if (status === "Safe")
    return {
      border: "border-emerald-500",
      text: "text-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    };
  if (status === "Caution")
    return {
      border: "border-orange-400",
      text: "text-orange-400",
      badge: "bg-orange-500/15 text-orange-400 border border-orange-400/30",
    };
  return {
    border: "border-red-500",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
};

// ─── Main Scanner ─────────────────────────────────────────────────────────────

const Scanner = () => {
  const [scanMode, setScanMode] = useState("image");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ── Image Handlers ──
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError("");
    }
  };

  const handleImageScan = async () => {
    if (!selectedImage) return setError("Please select an image first.");
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("labelImage", selectedImage);
    try {
      const response = await API.post("/scans/analyze-image", formData);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze the image.");
    } finally {
      setLoading(false);
    }
  };

  // ── Text Handlers ──
  const handleTextScan = async () => {
    if (!manualText.trim())
      return setError("Please type some ingredients to check.");
    setLoading(true);
    setError("");
    try {
      const response = await API.post("/scans/analyze-text", {
        ingredientsText: manualText,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze the text.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setScanMode(mode);
    setResult(null);
    setError("");
  };

  const resultStyles = result ? getStatusStyles(result.status) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10 anim-fade-up">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">
              Label Scanner
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Food Label Checker
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Scan or type ingredients to check if they're safe for you.
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

        {/* ── Mode Toggle ── */}
        <div className="flex gap-3 mb-6 anim-slide-up">
          <button
            onClick={() => switchMode("image")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 border ${
              scanMode === "image"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            📷 Camera Scan
          </button>
          <button
            onClick={() => switchMode("text")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 border ${
              scanMode === "text"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            ✍️ Manual Text
          </button>
        </div>

        {/* ── Input Area ── */}
        <div className="rounded-2xl bg-slate-900/80 border-2 border-dashed border-slate-700 p-6 text-center mb-5 anim-slide-up">
          {scanMode === "image" ? (
            <>
              <label className="flex flex-col items-center justify-center gap-2 cursor-pointer group mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-colors duration-200">
                  <span className="text-2xl">📁</span>
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors duration-200">
                  Click to choose an image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="mb-5">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-72 rounded-xl mx-auto border border-slate-700 object-contain"
                  />
                </div>
              )}

              <button
                onClick={handleImageScan}
                disabled={!selectedImage || loading}
                className="w-full py-4 rounded-xl font-semibold text-base text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? "🤖 AI is analyzing image…" : "Analyze Image"}
              </button>
            </>
          ) : (
            <>
              <textarea
                rows={5}
                placeholder="Type ingredients here (e.g., water, sugar, peanuts…)"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors duration-200 mb-4"
              />
              <button
                onClick={handleTextScan}
                disabled={!manualText.trim() || loading}
                className="w-full py-4 rounded-xl font-semibold text-base text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? "🔍 Checking ingredients…" : "Check Text"}
              </button>
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-center text-red-400 text-sm mb-5">{error}</p>
        )}

        {/* ── Result Card ── */}
        {result && (
          <div
            className={`rounded-2xl bg-slate-900/80 border-2 ${resultStyles.border} p-6 anim-slide-up`}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${resultStyles.badge}`}
              >
                {result.status}
              </span>
              <span className="text-xs text-slate-500">Analysis Result</span>
            </div>

            <p className="text-sm text-slate-300 mb-4">
              <span className="text-white font-semibold">Reason: </span>
              {result.reason}
            </p>

            {result.flaggedIngredients?.length > 0 && (
              <div>
                <p className="text-sm text-white font-semibold mb-2">
                  Flagged Ingredients:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {result.flaggedIngredients.map((ing, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-red-400 font-semibold capitalize flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;

/*
  CSS — keyframes only (add to your global CSS or Scanner.css)
  =============================================================

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .anim-fade-up {
    animation: fadeUp 0.5s ease both;
  }

  .anim-slide-up {
    animation: slideUp 0.45s ease both;
  }
*/
