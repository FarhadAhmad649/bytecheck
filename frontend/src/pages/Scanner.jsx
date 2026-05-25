import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import BarcodeScanner from "./BarcodeScanner";

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
  const [qrText, setQrText] = useState("");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileToUpload, options);

      const formData = new FormData();
      formData.append("labelImage", compressedFile, "ingredient-label.jpg");

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
      // Ensure we don't infinitely scan the same barcode while loading
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

  const resultStyles = result ? getStatusStyles(result.status) : null;

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

        {/* 🌟 UPGRADED: Segmented Control Tabs (Merged Buttons) */}
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
          {scanMode === "image" ? (
            <div className="flex flex-col items-center">
              {!previewUrl ? (
                // 🌟 UPGRADED: Merged Camera / Upload Buttons
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
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={handleImageScan}
                disabled={!selectedImage || loading}
                className="w-full py-3 bg-blue-600 rounded-lg font-bold disabled:opacity-50 transition-opacity"
              >
                {loading ? "Analyzing..." : "Analyze Label"}
              </button>
            </div>
          ) : scanMode === "qr" ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 text-sm text-center mb-2">
                Point your camera at a barcode or QR code.
              </p>

              {/* 🛑 FIX: Hide scanner if loading, if result exists, OR if error exists */}
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

                  {/* Button to instantly clear state and re-open the camera */}
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

        {/* Global Error Display (Hidden in QR mode to prevent duplicate error messages) */}
        {error && scanMode !== "qr" && (
          <p className="text-center text-red-400 mb-5">{error}</p>
        )}

        {result && (
          <div
            className={`rounded-2xl border-2 ${resultStyles.border} p-6 bg-slate-900 shadow-xl`}
          >
            <div className="flex justify-between items-center mb-4">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${resultStyles.badge}`}
              >
                {result.status}
              </span>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              <strong className="text-white">Reason:</strong> {result.reason}
            </p>
            {result.flaggedIngredients?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-white mb-2">
                  Flagged Ingredients:
                </p>
                <ul className="list-disc list-inside text-sm text-red-400 capitalize">
                  {result.flaggedIngredients.map((ing, idx) => (
                    <li key={idx}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.status !== "Safe" && !aiResult && (
              <button
                onClick={handleAskAI}
                disabled={aiLoading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {aiLoading
                  ? "Analyzing safe alternatives..."
                  : "✨ Ask AI for Safe Alternatives"}
              </button>
            )}
            {aiResult && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/50 to-purple-950/50 border border-indigo-500/40 mt-4 p-6">
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
                        <p className="text-slate-400 text-sm">{dish.reason}</p>
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
