import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import BarcodeScanner from "./BarcodeScanner";
import { toast } from "react-toastify";

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
      badge: "bg-orange-500/15 text-orange-400 border border-orange-400/30",
      bar: "bg-orange-500",
    };
  if (score >= 60)
    return {
      border: "border-yellow-400",
      text: "text-yellow-400",
      badge: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/30",
      bar: "bg-yellow-400",
    };
  return {
    border: "border-emerald-500",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    bar: "bg-emerald-500",
  };
};

const Scanner = () => {
  const [scanMode, setScanMode] = useState("camera");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [manualText, setManualText] = useState("");
  const [textType, setTextType] = useState("ingredients");
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [qrText, setQrText] = useState("");

  const [profile, setProfile] = useState(null);
  const [scanTarget, setScanTarget] = useState("everyone");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [expandedDishes, setExpandedDishes] = useState({});

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resultRef = useRef(null); // Auto-scroll reference
  const navigate = useNavigate();

  // Auto-scroll to results
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get("/users/profile");
        setProfile(response.data?.user || response.data);
      } catch (err) {
        console.error("Failed to load profile data.");
      }
    };
    fetchProfile();
  }, []);

  const clearResults = () => {
    setResult(null);
    setError("");
    setAiResults({});
    setAiLoading({});
    setExpandedDishes({});
  };

  const toggleDishDetails = (name) => {
    setExpandedDishes((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleAddToGroceryList = async (productName) => {
    try {
      await API.post("/users/grocery", {
        productName,
        targetProfile: scanTarget,
      });
      toast.success(`${productName} added to Safe List for ${scanTarget}! 🛒`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add item.");
    }
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

  const processImageUpload = async () => {
    if (!croppedAreaPixels)
      return setError("Please adjust the crop area first.");
    setLoading(true);
    clearResults();
    try {
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const fileToUpload = new File([croppedBlob], "cropped-image.jpg", {
        type: "image/jpeg",
      });
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileToUpload, options);

      const formData = new FormData();
      formData.append("smartImage", compressedFile, "upload.jpg");
      formData.append("scanTarget", scanTarget);

      const response = await API.post("/scans/analyze-smart", formData);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  const handleTextScan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToScan = manualText.trim();
    if (!textToScan) return setError("Please type ingredients.");
    setLoading(true);
    clearResults();
    try {
      const response = await API.post("/scans/analyze-text", {
        ingredientsText: textToScan,
        scanTarget,
      });
      setResult(response.data);
    } catch (err) {
      setError("Failed to analyze.");
    } finally {
      setLoading(false);
    }
  };

  const handleDishScan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!dishName || !dishName.trim())
      return setError("Please type a dish name.");
    setLoading(true);
    clearResults();
    try {
      const response = await API.post("/scans/analyze-dish", {
        dishName: dishName.trim(),
        scanTarget,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze dish.");
    } finally {
      setLoading(false);
    }
  };

  const handleQrScan = (detectedText) => {
    if (detectedText) {
      const cleanText = detectedText.replace(/['"]/g, "").trim();
      if (cleanText !== qrText && !loading) {
        setQrText(cleanText);
        setManualText(cleanText);
        // Call backend immediately with the scanned QR text
        API.post("/scans/analyze-text", {
          ingredientsText: cleanText,
          scanTarget,
        })
          .then((res) => setResult(res.data))
          .catch(() => setError("Failed to analyze barcode."));
      }
    }
  };

  const handleAskAI = async (dishNameParam) => {
    const nameToUse = dishNameParam || result?.productName || result?.dishName;
    if (!nameToUse) return;

    setAiLoading((prev) => ({ ...prev, [nameToUse]: true }));
    try {
      const response = await API.post("/scans/ai-alternatives", {
        rejectedDish: nameToUse,
        targetProfile: scanTarget,
      });
      setAiResults((prev) => ({
        ...prev,
        [nameToUse]:
          response.data?.aiSuggestion ||
          response.data?.alternatives ||
          response.data,
      }));
    } catch (err) {
      toast.error(`Failed to get AI suggestions for ${nameToUse}.`);
    } finally {
      setAiLoading((prev) => ({ ...prev, [nameToUse]: false }));
    }
  };

  const switchMode = (mode) => {
    setScanMode(mode);
    clearResults();
    setPreviewUrl(null);
    setSelectedImage(null);
    setQrText("");
  };

  const resultStyles =
    result && !result.menuResults
      ? getSeverityColors(result.severityScore)
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 pb-20">
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-white mb-8">
          Food Safety Scanner
        </h1>

        {/* Mode Tabs */}
        <div className="flex w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-6">
          {["camera", "text", "qr"].map((mode) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`flex-1 py-4 text-xs sm:text-sm font-bold capitalize transition-colors border-r border-slate-800 last:border-r-0 ${
                scanMode === mode
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {mode === "camera"
                ? "📸 Smart Camera"
                : mode === "text"
                  ? "✍️ Type Manually"
                  : "🔍 Barcode"}
            </button>
          ))}
        </div>

        {/* Target Profile */}
        <div className="mb-6 pb-6 border-b border-slate-800">
          <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Target Profile
          </label>
          <select
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            className="w-full bg-slate-800 p-3.5 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none text-white cursor-pointer"
          >
            <option value="everyone">👨‍👩‍👧‍👦 Everyone (Family Mode)</option>
            {profile?.familyProfiles?.map((m, i) => (
              <option key={i} value={m.name}>
                👤 Just {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scan Input Panel */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mb-8 shadow-xl">
          {scanMode === "camera" && (
            <div className="flex flex-col items-center">
              <p className="text-slate-400 text-sm mb-4 text-center">
                Point your camera at a <b>Food Label</b>, a{" "}
                <b>Restaurant Menu</b>, or a <b>Dish Name</b>.<br />
                <span className="text-indigo-400">
                  Our AI will automatically detect what it is.
                </span>
              </p>
              {!previewUrl ? (
                <div className="flex w-full mb-6 rounded-xl overflow-hidden border border-slate-700">
                  <button
                    onClick={() => cameraInputRef.current.click()}
                    className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 border-r border-slate-700 transition-colors"
                  >
                    📸 Take Photo
                  </button>
                  <input
                    type="file"
                    ref={cameraInputRef}
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    📁 Upload Image
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative mb-6">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-48 object-contain rounded-lg"
                  />
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full hover:bg-red-400"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={processImageUpload}
                disabled={!selectedImage || loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Analyzing Context..." : "Analyze Image"}
              </button>
            </div>
          )}

          {scanMode === "qr" && (
            <div className="w-full max-w-sm mx-auto">
              <BarcodeScanner onResult={handleQrScan} />
            </div>
          )}

          {scanMode === "text" && (
            <div className="anim-fade-up">
              {/* Sub-Toggle Buttons */}
              <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setTextType("ingredients")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    textType === "ingredients"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Raw Ingredients
                </button>
                <button
                  onClick={() => setTextType("dish")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    textType === "dish"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dish Name
                </button>
              </div>

              {/* View 1: Raw Ingredients */}
              {textType === "ingredients" ? (
                <div>
                  <p className="text-slate-400 text-sm mb-4 text-center">
                    Type a list of ingredients manually to check for hidden
                    hazards.
                  </p>
                  <textarea
                    rows={4}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="E.g., Sugar, Salt, Milk, Peanuts..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 text-white focus:border-indigo-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleTextScan}
                    disabled={loading || !manualText.trim()}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg"
                  >
                    {loading ? "Analyzing Ingredients..." : "Check Ingredients"}
                  </button>
                </div>
              ) : (
                /* View 2: Dish Name */
                <div>
                  <p className="text-slate-400 text-sm mb-4 text-center">
                    Type the name of a dish to check its safety against our
                    medical database.
                  </p>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="E.g., Chicken Karahi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 text-white focus:border-blue-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleDishScan}
                    disabled={loading || !dishName.trim()}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg"
                  >
                    {loading ? "Analyzing Dish..." : "Check Dish Safety"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-center text-red-400 mb-5">{error}</p>}

        {/* ─── RESULTS SECTION ────────────────────────────────────────── */}
        {result && (
          <div ref={resultRef} className="space-y-6 scroll-mt-6">
            {/* CASE 1: MENU SCAN RESULTS */}
            {result.menuResults ? (
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl anim-fade-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-700/50 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      📜 Menu Analysis
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Target:{" "}
                      <span className="font-bold text-indigo-300 capitalize">
                        {scanTarget}
                      </span>
                    </p>
                  </div>
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold shadow-inner">
                    {result.menuResults.length} Dishes Found
                  </span>
                </div>

                {result.menuResults.length > 0 ? (
                  <div className="space-y-4">
                    {result.menuResults.map((item, idx) => {
                      const styles = getSeverityColors(item.severityScore);
                      const isExpanded = expandedDishes[item.dishName];
                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl border-2 ${styles.border} bg-slate-950 shadow-md transition-all duration-300 overflow-hidden`}
                        >
                          <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900">
                            <div>
                              <h3 className="text-lg sm:text-xl font-bold text-white capitalize">
                                {item.dishName}
                              </h3>
                              <p
                                className={`text-xs font-semibold mt-1 ${styles.text}`}
                              >
                                Max Severity: {item.severityScore}%
                              </p>
                            </div>
                            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
                              <span
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap text-center ${styles.badge}`}
                              >
                                {item.status}
                              </span>
                              <button
                                onClick={() => toggleDishDetails(item.dishName)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-600 transition-colors flex items-center gap-2"
                              >
                                {isExpanded
                                  ? "Hide Details ▲"
                                  : "View Details ▼"}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/50 anim-fade-down">
                              {item.familyBreakdown &&
                                item.familyBreakdown.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">
                                      Family Member Breakdown
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {item.familyBreakdown.map(
                                        (member, mIdx) => {
                                          const isCritical =
                                            member.severityScore === 100;
                                          const isCaution =
                                            member.severityScore >= 60 &&
                                            member.severityScore < 100;
                                          return (
                                            <div
                                              key={mIdx}
                                              className={`p-3.5 rounded-xl border ${isCritical ? "bg-red-500/10 border-red-500/30" : isCaution ? "bg-yellow-500/10 border-yellow-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}
                                            >
                                              <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                                                  👤{" "}
                                                  <span className="capitalize">
                                                    {member.memberName}
                                                  </span>
                                                  {member.isPrimary && (
                                                    <span className="text-[9px] bg-slate-700 px-1.5 py-0.5 rounded-md text-slate-300 uppercase tracking-widest">
                                                      You
                                                    </span>
                                                  )}
                                                </h5>
                                                <span
                                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isCritical ? "bg-red-500/20 text-red-400" : isCaution ? "bg-yellow-500/20 text-yellow-400" : "bg-emerald-500/20 text-emerald-400"}`}
                                                >
                                                  {member.status}
                                                </span>
                                              </div>
                                              {member.warnings &&
                                              member.warnings.length > 0 ? (
                                                <ul className="list-disc pl-5 text-[11px] space-y-1">
                                                  {member.warnings.map(
                                                    (warning, wIdx) => (
                                                      <li
                                                        key={wIdx}
                                                        className={
                                                          warning.includes(
                                                            "CRITICAL",
                                                          )
                                                            ? "text-red-300"
                                                            : "text-yellow-300"
                                                        }
                                                      >
                                                        {warning}
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              ) : (
                                                <p className="text-[11px] text-emerald-400/80 flex items-center gap-1 mt-1 font-medium">
                                                  ✅ Safe for consumption
                                                </p>
                                              )}
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}
                              {item.status !== "Safe" &&
                                !aiResults[item.dishName] && (
                                  <button
                                    onClick={() => handleAskAI(item.dishName)}
                                    disabled={aiLoading[item.dishName]}
                                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                                  >
                                    {aiLoading[item.dishName]
                                      ? "⏳ Finding alternatives..."
                                      : `✨ Find Safe Alternatives for ${item.dishName}`}
                                  </button>
                                )}
                              {aiResults[item.dishName] && (
                                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30">
                                  <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-wider mb-3">
                                    🤖 AI Safe Suggestions
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    {Array.isArray(aiResults[item.dishName]) &&
                                      aiResults[item.dishName].map(
                                        (altDish, altIdx) => (
                                          <div
                                            key={altIdx}
                                            className="bg-slate-900/60 border border-indigo-500/20 rounded-lg p-3"
                                          >
                                            <h5 className="text-indigo-200 font-bold text-sm mb-1">
                                              {altIdx + 1}. {altDish.name}
                                            </h5>
                                            <p className="text-slate-400 text-xs">
                                              {altDish.reason}
                                            </p>
                                          </div>
                                        ),
                                      )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                    <p className="text-slate-400">
                      No dishes from your database were detected on this menu.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* CASE 2: Single Product/Dish/Text Scan Results */
              <div
                className={`rounded-3xl border-2 ${resultStyles?.border} p-6 sm:p-8 bg-slate-900 shadow-2xl`}
              >
                <div className="flex justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-800 gap-4 flex-col sm:flex-row">
                  <div>
                    <h2 className="text-2xl font-bold text-white capitalize">
                      {result.productName || result.dishName || "Scan Result"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Target:{" "}
                      <span className="font-bold text-indigo-300 capitalize">
                        {scanTarget}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold px-4 py-2 rounded-xl ${resultStyles?.badge}`}
                  >
                    {result.status}
                  </span>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between text-sm font-semibold mb-2 text-slate-300">
                    <span>Overall Hazard Severity</span>
                    <span className={resultStyles?.text}>
                      {result.severityScore || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${resultStyles?.bar}`}
                      style={{ width: `${result.severityScore || 0}%` }}
                    ></div>
                  </div>
                </div>

                {result?.familyBreakdown &&
                  result.familyBreakdown.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {scanTarget === "everyone"
                          ? "👨‍👩‍👧‍👦 Family Safety Breakdown"
                          : "👤 Individual Breakdown"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.familyBreakdown.map((member, index) => {
                          const isCritical = member.severityScore === 100;
                          const isCaution =
                            member.severityScore >= 60 &&
                            member.severityScore < 100;
                          return (
                            <div
                              key={index}
                              className={`p-5 rounded-2xl border ${isCritical ? "bg-red-500/10 border-red-500/30" : isCaution ? "bg-yellow-500/10 border-yellow-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
                                  👤{" "}
                                  <span className="capitalize">
                                    {member.memberName}
                                  </span>
                                  {member.isPrimary && (
                                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-md text-slate-300 uppercase tracking-wider">
                                      You
                                    </span>
                                  )}
                                </h4>
                                <div
                                  className={`px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${isCritical ? "bg-red-500/20 text-red-400 border-red-500/50" : isCaution ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"}`}
                                >
                                  {member.status} ({member.severityScore}%)
                                </div>
                              </div>
                              {member.warnings && member.warnings.length > 0 ? (
                                <ul className="list-disc pl-5 text-xs space-y-1.5 mt-2">
                                  {member.warnings.map((warning, i) => (
                                    <li
                                      key={i}
                                      className={
                                        warning.includes("CRITICAL")
                                          ? "text-red-300 font-medium"
                                          : "text-yellow-300"
                                      }
                                    >
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-emerald-300/80 mt-1 flex items-center gap-1.5 font-medium">
                                  ✅ Safe to eat. No conflicts found.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {result.status !== "Safe" &&
                  !aiResults[result.productName || result.dishName] && (
                    <button
                      onClick={() => handleAskAI()}
                      disabled={
                        aiLoading[result.productName || result.dishName]
                      }
                      className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg border border-indigo-500/50"
                    >
                      {aiLoading[result.productName || result.dishName]
                        ? "⏳ Analyzing safe alternatives..."
                        : "✨ Ask AI for Safe Alternatives"}
                    </button>
                  )}

                {result.status === "Safe" && (
                  <button
                    onClick={() =>
                      handleAddToGroceryList(
                        result.productName || result.dishName,
                      )
                    }
                    className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-colors duration-300 shadow-lg shadow-emerald-900/20"
                  >
                    🛒 Add to Safe Grocery List
                  </button>
                )}

                {aiResults[result.productName || result.dishName] && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/50 to-purple-950/50 border border-indigo-500/40 mt-8 p-6 shadow-xl">
                    <h4 className="text-indigo-300 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      🤖 BiteCheck AI Consultant
                    </h4>
                    <div className="flex flex-col gap-3">
                      {Array.isArray(
                        aiResults[result.productName || result.dishName],
                      ) &&
                        aiResults[result.productName || result.dishName].map(
                          (dish, index) => (
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
                          ),
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showCropper && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md h-[60vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
            <Cropper
              image={previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <div className="flex gap-4 mt-6 w-full max-w-md">
            <button
              onClick={() => setShowCropper(false)}
              className="flex-1 py-4 bg-slate-800 rounded-xl text-white font-bold border border-slate-700 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowCropper(false);
                processImageUpload();
              }}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold shadow-lg"
            >
              Confirm Crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
