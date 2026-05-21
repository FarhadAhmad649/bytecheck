import { useState, useRef } from "react";
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
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // ── Handlers ──
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

  const handleTextScan = async () => {
    if (!manualText.trim()) return setError("Please type ingredients.");
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

  const handleDishScan = async () => {
    if (!dishName.trim()) return setError("Please type a dish name.");
    setLoading(true);
    setError("");
    try {
      const response = await API.post("/scans/analyze-dish", {
        dishName: dishName.trim(),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze the dish.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setScanMode(mode);
    setResult(null);
    setError("");
    setPreviewUrl(null);
    setSelectedImage(null);
  };

  const resultStyles = result ? getStatusStyles(result.status) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4">
      <div className="max-w-2xl mx-auto py-12">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Food Label Checker
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Scan or search to check food safety.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-xl text-sm bg-slate-800 border border-slate-700"
          >
            Back
          </button>
        </div>

        {/* ── Mode Selection Tabs ── */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-8">
          {["image", "text", "dish"].map((mode) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl capitalize transition-all ${
                scanMode === mode
                  ? "bg-slate-800 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {mode === "image"
                ? "📷 Scan"
                : mode === "text"
                  ? "✍️ Text"
                  : "🍲 Dish"}
            </button>
          ))}
        </div>

        {/* ── Dynamic Input Area ── */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mb-8">
          {scanMode === "image" ? (
            <div className="flex flex-col items-center">
              {!previewUrl ? (
                <div className="flex gap-4 w-full mb-6">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                    ref={cameraInputRef}
                  />
                  <button
                    onClick={() => cameraInputRef.current.click()}
                    className="flex-1 py-8 bg-blue-900/20 text-blue-300 rounded-xl border border-blue-800 flex flex-col items-center gap-2"
                  >
                    <span>📸 Camera</span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex-1 py-8 bg-purple-900/20 text-purple-300 rounded-xl border border-purple-800 flex flex-col items-center gap-2"
                  >
                    <span>📁 Upload</span>
                  </button>
                </div>
              ) : (
                <div className="relative mb-6">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-64 object-contain rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedImage(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={handleImageScan}
                disabled={!selectedImage || loading}
                className="w-full py-3 bg-blue-600 rounded-lg font-bold disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Analyze Label"}
              </button>
            </div>
          ) : scanMode === "text" ? (
            <>
              <textarea
                rows={5}
                placeholder="Type ingredients..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4"
              />
              <button
                onClick={handleTextScan}
                className="w-full py-4 bg-emerald-600 rounded-xl font-semibold"
              >
                Check Text
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Enter dish name..."
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full px-4 py-3 mb-4 rounded-xl bg-slate-800 border border-slate-700"
              />
              <button
                onClick={handleDishScan}
                className="w-full py-4 bg-blue-600 rounded-xl font-semibold"
              >
                Check Dish
              </button>
            </>
          )}
        </div>

        {error && <p className="text-center text-red-400 mb-5">{error}</p>}

        {/* ── Result Card ── */}
        {result && (
          <div
            className={`rounded-2xl border-2 ${resultStyles.border} p-6 bg-slate-900`}
          >
            <h3 className={`text-xl font-bold mb-2 ${resultStyles.text}`}>
              {result.status}
            </h3>
            <p className="text-slate-300">{result.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
