import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import BarcodeScanner from "./BarcodeScanner";

// ─── UPGRADED: Dynamic Severity Styles ─────────────────────────────────────────
const getSeverityColors = (score = 0) => {
  if (score === 100)
    return {
      border: "border-red-500",
      text: "text-red-400",
      badge: "bg-red-500/15 text-red-400 border border-red-500/30",
      bar: "bg-red-600 animate-pulse",
    };
  if (score >= 80)
    return {
      border: "border-orange-500",
      text: "text-orange-400",
      badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
      bar: "bg-orange-500",
    };
  if (score >= 60)
    return {
      border: "border-yellow-400",
      text: "text-yellow-400",
      badge: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
      bar: "bg-yellow-400",
    };
  // Default Safe (0)
  return {
    border: "border-emerald-500",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    bar: "bg-emerald-500",
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
  const [qrText, setQrText] = useState("");

  // 🔴 NEW: State for Profile and Scan Target
  const [profile, setProfile] = useState(null);
  const [scanTarget, setScanTarget] = useState("everyone");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // 🔴 NEW: Fetch profile to populate the dropdown
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/users/profile");
        const userData = response.data?.user || response.data;
        setProfile(userData);
      } catch (err) {
        console.error("Failed to load profile data for scanner.");
      }
    };
    fetchProfile();
  }, []);

  const clearResults = () => {
    setResult(null);
    setError("");
    setAiResult(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      clearResults();
      setShowCropper(true);
    }
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  };

  const handleImageScan = async () => {
    if (!croppedAreaPixels)
      return setError("Please adjust the crop area first.");
    setLoading(true);
    clearResults();

    try {
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const fileToUpload = new File([croppedBlob], "cropped-ingredient.jpg", {
        type: "image/jpeg",
      });
      const options = {
        maxSizeMB: 1.5, // 🔴 INCREASED: Allow larger file size for crisp text
        maxWidthOrHeight: 1200, // 🔴 INCREASED: Keep the resolution high so Tesseract can read it
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileToUpload, options);

      const formData = new FormData();
      formData.append("labelImage", compressedFile, "ingredient-label.jpg");
      // 🔴 Send the selected target to the backend!
      formData.append("scanTarget", scanTarget);

      const response = await API.post("/scans/analyze-image", formData);
      setResult(response.data);
    } catch (err) {
      console.error("Processing Error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to process image. Make sure to crop a clear area.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTextScan = async (textToScan = manualText) => {
    if (!textToScan || !textToScan.trim())
      return setError("Please type ingredients or scan a code.");
    setLoading(true);
    clearResults();
    try {
      const response = await API.post("/scans/analyze-text", {
        ingredientsText: textToScan,
        scanTarget: scanTarget, // 🔴 Send the selected target
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
    clearResults();
    try {
      const response = await API.post("/scans/analyze-dish", {
        dishName: dishName.trim(),
        scanTarget: scanTarget, // 🔴 Send the selected target
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze the dish.");
    } finally {
      setLoading(false);
    }
  };

  const handleQrScan = (detectedText) => {
    if (detectedText) {
      const cleanText = detectedText.replace(/['"]/g, "").trim();
      if (cleanText !== qrText && !loading) {
        setQrText(cleanText);
        handleTextScan(cleanText);
      }
    }
  };

  const handleAskAI = async () => {
    setAiLoading(true);
    try {
      const foodName =
        scanMode === "dish"
          ? dishName
          : scanMode === "text"
            ? manualText.slice(0, 60)
            : "the scanned food product";
      const response = await API.post("/scans/alternatives", {
        rejectedDish: foodName,
      });
      setAiResult(response.data.aiSuggestion);
    } catch (err) {
      console.error("AI error:", err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Failed to reach the AI Consultant.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const switchMode = (mode) => {
    setScanMode(mode);
    clearResults();
    setPreviewUrl(null);
    setSelectedImage(null);
    setQrText("");
  };

  // Get dynamic styles based on the severity score from the backend
  const resultStyles = result ? getSeverityColors(result.severityScore) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4">
      <div className="max-w-2xl mx-auto py-12">
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
            className="px-4 py-2 rounded-xl text-sm bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-8 shadow-sm">
          {["image", "qr", "text", "dish"].map((mode) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`flex-1 py-3.5 text-sm font-bold capitalize transition-colors duration-200 border-r border-slate-800 last:border-r-0 ${
                scanMode === mode
                  ? "bg-indigo-600 text-white shadow-inner"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {mode === "image"
                ? "📷 OCR"
                : mode === "qr"
                  ? "🔍 Barcode"
                  : mode === "text"
                    ? "✍️ Text"
                    : "🍲 Dish"}
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mb-8">
          {/* 🔴 NEW: Who is Eating Dropdown */}
          <div className="mb-6 pb-6 border-b border-slate-800">
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Target Profile
            </label>
            <select
              value={scanTarget}
              onChange={(e) => setScanTarget(e.target.value)}
              className="w-full bg-slate-800 p-3.5 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none text-white transition-colors cursor-pointer"
            >
              <option value="everyone">👨‍👩‍👧‍👦 Everyone (Family Mode)</option>
              {profile?.familyProfiles?.map((member, idx) => (
                <option key={idx} value={member.name}>
                  👤 Just {member.name} {member.isPrimary ? "(Me)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Select whose allergies and illnesses BiteCheck should scan for.
            </p>
          </div>

          {scanMode === "image" ? (
            <div className="flex flex-col items-center">
              {!previewUrl ? (
                <div className="flex w-full mb-6 rounded-xl overflow-hidden border border-slate-700 shadow-sm">
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
                    className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 transition-colors flex flex-col items-center gap-2 border-r border-slate-700"
                  >
                    <span className="text-2xl">📸</span>
                    <span className="text-slate-300 font-semibold text-sm">
                      Take Photo
                    </span>
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
                    className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 transition-colors flex flex-col items-center gap-2"
                  >
                    <span className="text-2xl">📁</span>
                    <span className="text-slate-300 font-semibold text-sm">
                      Upload File
                    </span>
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
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full text-white hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={handleImageScan}
                disabled={!selectedImage || loading}
                className="w-full py-4 bg-blue-600 rounded-xl font-bold disabled:opacity-50 transition-opacity"
              >
                {loading ? "Analyzing..." : "Analyze Label"}
              </button>
            </div>
          ) : scanMode === "qr" ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 text-sm text-center mb-2">
                Point your camera at a barcode or QR code.
              </p>

              {!result && !loading && !error ? (
                <div className="w-full max-w-sm">
                  <BarcodeScanner onResult={handleQrScan} />
                </div>
              ) : (
                <div className="w-full py-8 text-center bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                  {loading ? (
                    <>
                      <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
                      <p className="text-indigo-400 font-bold">
                        Fetching ingredients from database...
                      </p>
                    </>
                  ) : error ? (
                    <>
                      <p className="text-red-400 font-bold text-xl mb-2">
                        ⚠️ Not Found
                      </p>
                      <p className="text-slate-400 text-sm px-4 mb-4">
                        {error}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-emerald-400 font-bold text-xl mb-2">
                        ✅ Scanned Successfully!
                      </p>
                      <p className="text-slate-400 text-sm mb-4">
                        Code:{" "}
                        <span className="font-mono text-white bg-slate-900 px-2 py-1 rounded">
                          {qrText}
                        </span>
                      </p>
                    </>
                  )}

                  <button
                    onClick={() => switchMode("qr")}
                    className="mt-2 px-6 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Scan Another Code
                  </button>
                </div>
              )}
            </div>
          ) : scanMode === "text" ? (
            <>
              <textarea
                rows={5}
                placeholder="Type ingredients..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <button
                onClick={() => handleTextScan()}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 rounded-xl font-semibold disabled:opacity-50 transition-opacity"
              >
                {loading ? "Analyzing..." : "Check Text"}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Enter dish name (e.g. Chicken Biryani)..."
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full px-4 py-3 mb-4 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleDishScan}
                disabled={loading}
                className="w-full py-4 bg-blue-600 rounded-xl font-semibold disabled:opacity-50 transition-opacity"
              >
                {loading ? "Analyzing..." : "Check Dish"}
              </button>
            </>
          )}
        </div>

        {error && scanMode !== "qr" && (
          <p className="text-center text-red-400 mb-5">{error}</p>
        )}

        {/* 🌟 UPGRADED: Dynamic Hazard Result Card */}
        {result && (
          <div
            className={`rounded-2xl border-2 ${resultStyles.border} p-6 bg-slate-900 shadow-xl transition-colors duration-500`}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white">
                {result.productName || "Scan Result"}
              </h2>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${resultStyles.badge}`}
              >
                {result.status}
              </span>
            </div>

            {/* 🔥 NEW: Hazard Percentage Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm font-semibold mb-2 text-slate-300">
                <span>Hazard Severity</span>
                <span className={resultStyles.text}>
                  {result.severityScore || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${resultStyles.bar}`}
                  style={{ width: `${result.severityScore || 0}%` }}
                ></div>
              </div>
            </div>

            {/* --- 🔴 NEW: FAMILY BREAKDOWN SECTION --- */}
            {result?.familyBreakdown && result.familyBreakdown.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  {scanTarget === "everyone"
                    ? "👨‍👩‍👧‍👦 Family Safety Breakdown"
                    : "👤 Individual Safety Breakdown"}
                </h3>

                <div className="space-y-4">
                  {result.familyBreakdown.map((member, index) => {
                    // Dynamically style the card based on the severity score!
                    const isCritical = member.severityScore === 100;
                    const isCaution =
                      member.severityScore >= 60 && member.severityScore < 100;

                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-xl border ${
                          isCritical
                            ? "bg-red-500/10 border-red-500/30"
                            : isCaution
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : "bg-emerald-500/10 border-emerald-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
                            👤{" "}
                            <span className="capitalize">
                              {member.memberName}
                            </span>
                            {member.isPrimary && (
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full text-slate-300 uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </h4>

                          <div
                            className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                              isCritical
                                ? "bg-red-500/20 text-red-400 border-red-500/50"
                                : isCaution
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            }`}
                          >
                            {member.status} ({member.severityScore}%)
                          </div>
                        </div>

                        {/* Render Warnings or Safe Message */}
                        {member.warnings && member.warnings.length > 0 ? (
                          <ul className="list-disc pl-5 text-sm space-y-1.5 mt-2">
                            {member.warnings.map((warning, i) => (
                              <li
                                key={i}
                                className={`${
                                  warning.includes("CRITICAL")
                                    ? "text-red-300 font-medium"
                                    : "text-yellow-300"
                                }`}
                              >
                                {warning}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-emerald-300/80 mt-1 flex items-center gap-1.5">
                            ✅ Safe to eat. No conflicting ingredients found.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback to old reason string just in case */}
            {(!result.warnings || result.warnings.length === 0) &&
              result.reason &&
              result.status !== "Safe" && (
                <p className="text-slate-300 text-sm mt-4">
                  <strong className="text-white">Notice:</strong>{" "}
                  {result.reason}
                </p>
              )}

            {/* AI Consultant Integration */}
            {result.status !== "Safe" && !aiResult && (
              <button
                onClick={handleAskAI}
                disabled={aiLoading}
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg"
              >
                {aiLoading
                  ? "Analyzing safe alternatives..."
                  : "✨ Ask AI for Safe Alternatives"}
              </button>
            )}

            {aiResult && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/50 to-purple-950/50 border border-indigo-500/40 mt-6 p-6">
                <h4 className="text-indigo-300 font-bold text-lg mb-4">
                  BiteCheck AI Consultant
                </h4>
                <div className="flex flex-col gap-3">
                  {Array.isArray(aiResult) &&
                    aiResult.map((dish, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-4"
                      >
                        <h5 className="text-indigo-300 font-bold text-base mb-1">
                          #{index + 1} {dish.name}
                        </h5>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {dish.reason}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showCropper && previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full h-[60vh] bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="flex gap-4 mt-6 w-full max-w-sm">
              <button
                onClick={() => setShowCropper(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCropper(false);
                  handleImageScan();
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-colors"
              >
                Confirm Crop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
