import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import BarcodeScanner from "./BarcodeScanner";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import BottomNav from "../components/BottomNav"; // 🔴 Uses our new clean navigation!
import { ChevronDown } from "lucide-react"; // 🔴 Import the new arrow icon!

// ─── Severity Color Helper (Theme Aware) ──────────────────────────────────────
const getSeverityColors = (score = 0, isDark) => {
  if (score === 100)
    return {
      border: "border-red-500",
      text: "text-red-600 dark:text-red-400",
      badge: isDark
        ? "bg-red-500/15 text-red-400 border border-red-500/30"
        : "bg-red-50 text-red-700 border border-red-200",
      bar: "bg-red-500 animate-pulse",
    };
  if (score >= 80)
    return {
      border: "border-orange-500",
      text: "text-orange-600 dark:text-orange-400",
      badge: isDark
        ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
        : "bg-orange-50 text-orange-700 border border-orange-200",
      bar: "bg-orange-500",
    };
  if (score >= 60)
    return {
      border: "border-yellow-500",
      text: "text-yellow-600 dark:text-yellow-400",
      badge: isDark
        ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
        : "bg-yellow-50 text-yellow-700 border border-yellow-200",
      bar: "bg-yellow-400",
    };
  return {
    border: "border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: isDark
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
  const resultRef = useRef(null);
  const navigate = useNavigate();

  // Theme State
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
      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-emerald-500/50",
    divider: isDark ? "border-slate-800" : "border-gray-200",
    bottomNav: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
    tabBg: isDark ? "bg-slate-900" : "bg-gray-200/60",
    btnSecondary: isDark
      ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
      : "bg-white border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50",
    modalBg: isDark
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-100",
  };

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
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
      const compressedFile = await imageCompression(fileToUpload, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

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
      ? getSeverityColors(result.severityScore, isDark)
      : null;

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
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500 block mb-0.5">
              Analyzer
            </span>
            <h1
              className={`text-xl font-extrabold ${theme.textMain} tracking-tight`}
            >
              Food Scanner
            </h1>
          </div>
        </div>

        <div className="px-6 mt-6">
          {/* 🔴 FIXED: Target Profile Select with Custom Dropdown Arrow */}
          <div className="mb-6">
            <label
              className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}
            >
              Verify safety for
            </label>
            <div className="relative">
              <select
                value={scanTarget}
                onChange={(e) => setScanTarget(e.target.value)}
                className={`w-full p-4 text-sm font-bold rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer ${theme.inputBg}`}
              >
                <option value="everyone">👨‍👩‍👧‍👦 Whole Family</option>
                {profile?.familyProfiles?.map((m, i) => (
                  <option key={i} value={m.name}>
                    👤 {m.name}
                  </option>
                ))}
              </select>
              {/* THE NEW LUCIDE ARROW ICON */}
              <div
                className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "text-slate-400" : "text-gray-400"}`}
              >
                <ChevronDown size={20} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className={`flex p-1.5 rounded-2xl mb-6 ${theme.tabBg}`}>
            {["camera", "text", "qr"].map((mode) => (
              <button
                key={mode}
                onClick={(e) => {
                  e.preventDefault();
                  switchMode(mode);
                }}
                className={`flex-1 py-3 text-xs font-bold capitalize rounded-xl transition-all ${
                  scanMode === mode
                    ? "bg-emerald-500 text-white shadow-md"
                    : `${theme.textSub} hover:${theme.textMain}`
                }`}
              >
                {mode === "camera"
                  ? "📸 Camera"
                  : mode === "text"
                    ? "✍️ Text"
                    : "🔍 Barcode"}
              </button>
            ))}
          </div>

          {/* Scan Input Panel */}
          <div className={`p-6 border rounded-[32px] mb-8 ${theme.card}`}>
            {/* CAMERA MODE */}
            {scanMode === "camera" && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4">
                  📸
                </div>
                <p
                  className={`${theme.textSub} text-xs mb-6 text-center font-medium leading-relaxed`}
                >
                  Point your camera at a{" "}
                  <strong className={theme.textMain}>Food Label</strong> or{" "}
                  <strong className={theme.textMain}>Restaurant Menu</strong>.
                  Our AI will handle the rest.
                </p>

                {!previewUrl ? (
                  <div className="flex gap-3 w-full mb-6">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        cameraInputRef.current.click();
                      }}
                      className={`flex-1 py-4 border rounded-2xl font-bold text-xs flex flex-col items-center gap-2 transition-all active:scale-95 ${theme.btnSecondary}`}
                    >
                      <span className="text-xl">📷</span> Take Photo
                    </button>
                    <input
                      type="file"
                      ref={cameraInputRef}
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current.click();
                      }}
                      className={`flex-1 py-4 border rounded-2xl font-bold text-xs flex flex-col items-center gap-2 transition-all active:scale-95 ${theme.btnSecondary}`}
                    >
                      <span className="text-xl">📁</span> Upload File
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
                  <div className="relative mb-6 w-full">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-2xl border border-gray-200 dark:border-slate-700"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow-md font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    processImageUpload();
                  }}
                  disabled={!selectedImage || loading}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? "Analyzing..." : "Analyze Image"}
                </button>
              </div>
            )}

            {/* BARCODE MODE */}
            {scanMode === "qr" && (
              <div className="w-full mx-auto">
                <p
                  className={`${theme.textSub} text-xs mb-4 text-center font-medium leading-relaxed`}
                >
                  Scan any product barcode to fetch its ingredients instantly.
                </p>
                <BarcodeScanner onResult={handleQrScan} />
                {loading && (
                  <p className="text-emerald-500 text-center text-xs font-bold mt-4 animate-pulse">
                    Fetching product data...
                  </p>
                )}
              </div>
            )}

            {/* TEXT MODE */}
            {scanMode === "text" && (
              <div className="anim-fade-up">
                <div className={`flex p-1 rounded-xl mb-5 ${theme.tabBg}`}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setTextType("ingredients");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      textType === "ingredients"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : `${theme.textSub}`
                    }`}
                  >
                    Raw Ingredients
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setTextType("dish");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      textType === "dish"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : `${theme.textSub}`
                    }`}
                  >
                    Dish Name
                  </button>
                </div>

                {textType === "ingredients" ? (
                  <div>
                    <textarea
                      rows={4}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="E.g., Sugar, Salt, Milk, Peanuts..."
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-emerald-500/50 resize-none mb-4 ${theme.inputBg}`}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleTextScan();
                      }}
                      disabled={loading || !manualText.trim()}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      {loading ? "Checking..." : "Check Ingredients"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      placeholder="E.g., Chicken Karahi"
                      className={`w-full p-4 text-sm font-medium rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 mb-4 ${theme.inputBg}`}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDishScan();
                      }}
                      disabled={loading || !dishName.trim()}
                      className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      {loading ? "Searching..." : "Check Dish Safety"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-center text-red-500 text-xs font-bold mb-6">
              {error}
            </p>
          )}

          {/* ─── RESULTS SECTION ────────────────────────────────────────── */}
          {result && (
            <div ref={resultRef} className="space-y-6 scroll-mt-6 pb-6">
              {/* MENU SCAN RESULTS */}
              {result.menuResults ? (
                <div
                  className={`border rounded-[32px] p-6 sm:p-8 shadow-sm ${theme.card} anim-fade-up`}
                >
                  <div
                    className={`flex flex-col items-center mb-6 pb-6 border-b ${theme.divider}`}
                  >
                    <h2
                      className={`text-2xl font-extrabold flex items-center gap-2 ${theme.textMain}`}
                    >
                      📜 Menu Scan
                    </h2>
                    <p className={`text-xs mt-1 font-bold ${theme.textSub}`}>
                      Target:{" "}
                      <span className="text-emerald-500 capitalize">
                        {scanTarget}
                      </span>
                    </p>
                    <span className="mt-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border border-emerald-500/20">
                      {result.menuResults.length} Dishes Found
                    </span>
                  </div>

                  {result.menuResults.length > 0 ? (
                    <div className="space-y-4">
                      {result.menuResults.map((item, idx) => {
                        const styles = getSeverityColors(
                          item.severityScore,
                          isDark,
                        );
                        const isExpanded = expandedDishes[item.dishName];
                        return (
                          <div
                            key={idx}
                            className={`rounded-2xl border-l-4 border overflow-hidden transition-all ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-gray-100 shadow-sm"} ${styles.border}`}
                          >
                            <div
                              className={`p-4 flex flex-col gap-3 ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="pr-4">
                                  <h3
                                    className={`text-base font-extrabold capitalize ${theme.textMain}`}
                                  >
                                    {item.dishName}
                                  </h3>
                                  <p
                                    className={`text-[10px] font-bold mt-1 ${styles.text}`}
                                  >
                                    Severity: {item.severityScore}%
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${styles.badge}`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleDishDetails(item.dishName);
                                }}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${theme.btnSecondary}`}
                              >
                                {isExpanded ? "Hide Details" : "View Breakdown"}
                              </button>
                            </div>

                            {isExpanded && (
                              <div
                                className={`p-4 border-t ${theme.divider} ${isDark ? "bg-slate-950/50" : "bg-white"}`}
                              >
                                {item.familyBreakdown &&
                                  item.familyBreakdown.length > 0 && (
                                    <div className="space-y-3">
                                      <h4
                                        className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}
                                      >
                                        Family Breakdown
                                      </h4>
                                      <div className="grid grid-cols-1 gap-2.5">
                                        {item.familyBreakdown.map(
                                          (member, mIdx) => {
                                            const isCritical =
                                              member.severityScore === 100;
                                            const isCaution =
                                              member.severityScore >= 60 &&
                                              member.severityScore < 100;
                                            const bgClass = isCritical
                                              ? isDark
                                                ? "bg-red-500/10 border-red-500/30"
                                                : "bg-red-50 border-red-200"
                                              : isCaution
                                                ? isDark
                                                  ? "bg-orange-500/10 border-orange-500/30"
                                                  : "bg-orange-50 border-orange-200"
                                                : isDark
                                                  ? "bg-emerald-500/10 border-emerald-500/30"
                                                  : "bg-emerald-50 border-emerald-200";
                                            const textClass = isCritical
                                              ? isDark
                                                ? "text-red-400"
                                                : "text-red-700"
                                              : isCaution
                                                ? isDark
                                                  ? "text-orange-400"
                                                  : "text-orange-700"
                                                : isDark
                                                  ? "text-emerald-400"
                                                  : "text-emerald-700";

                                            return (
                                              <div
                                                key={mIdx}
                                                className={`p-3.5 rounded-xl border ${bgClass}`}
                                              >
                                                <div className="flex justify-between items-center mb-2">
                                                  <h5
                                                    className={`font-bold flex items-center gap-1.5 text-xs ${theme.textMain}`}
                                                  >
                                                    👤{" "}
                                                    <span className="capitalize">
                                                      {member.memberName}
                                                    </span>
                                                  </h5>
                                                  <span
                                                    className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-white/50 dark:bg-black/20 ${textClass}`}
                                                  >
                                                    {member.status}
                                                  </span>
                                                </div>
                                                {member.warnings &&
                                                member.warnings.length > 0 ? (
                                                  <ul className="flex flex-col gap-1.5 mt-2">
                                                    {member.warnings.map(
                                                      (warning, wIdx) => (
                                                        <li
                                                          key={wIdx}
                                                          className={`text-[10px] font-bold flex items-start gap-1.5 ${warning.includes("CRITICAL") ? "text-red-500" : "text-yellow-600 dark:text-yellow-500"}`}
                                                        >
                                                          <span className="mt-1 opacity-70">
                                                            •
                                                          </span>
                                                          {warning}
                                                        </li>
                                                      ),
                                                    )}
                                                  </ul>
                                                ) : (
                                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-bold">
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
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleAskAI(item.dishName);
                                      }}
                                      disabled={aiLoading[item.dishName]}
                                      className="w-full mt-4 py-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs active:scale-95"
                                    >
                                      {aiLoading[item.dishName]
                                        ? "⏳ Finding alternatives..."
                                        : `✨ Find Safe Alternatives`}
                                    </button>
                                  )}

                                {aiResults[item.dishName] && (
                                  <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-500/30">
                                    <h4 className="text-indigo-700 dark:text-indigo-300 font-black text-[10px] uppercase tracking-widest mb-3">
                                      🤖 AI Safe Suggestions
                                    </h4>
                                    <div className="flex flex-col gap-2.5">
                                      {Array.isArray(
                                        aiResults[item.dishName],
                                      ) &&
                                        aiResults[item.dishName].map(
                                          (altDish, altIdx) => (
                                            <div
                                              key={altIdx}
                                              className="bg-white dark:bg-slate-900/60 border border-indigo-50 dark:border-indigo-500/20 rounded-xl p-3 shadow-sm"
                                            >
                                              <h5 className="text-indigo-800 dark:text-indigo-200 font-extrabold text-xs mb-1">
                                                {altIdx + 1}. {altDish.name}
                                              </h5>
                                              <p
                                                className={`${theme.textSub} text-[10px] leading-relaxed font-medium`}
                                              >
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
                    <div
                      className={`text-center p-8 border border-dashed rounded-2xl ${theme.card}`}
                    >
                      <p className={`${theme.textSub} font-medium text-sm`}>
                        No dishes from your database were detected on this menu.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Single Product/Dish/Text Scan Results */
                <div
                  className={`rounded-[32px] border-2 ${resultStyles?.border} p-6 sm:p-8 shadow-sm ${theme.card}`}
                >
                  <div
                    className={`flex flex-col items-center mb-6 pb-6 border-b ${theme.divider}`}
                  >
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider mb-3 ${resultStyles?.badge}`}
                    >
                      {result.status}
                    </span>
                    <h2
                      className={`text-2xl font-extrabold capitalize text-center ${theme.textMain}`}
                    >
                      {result.productName || result.dishName || "Scan Result"}
                    </h2>
                    <p className={`text-xs mt-1 font-bold ${theme.textSub}`}>
                      Target:{" "}
                      <span className="text-emerald-500 capitalize">
                        {scanTarget}
                      </span>
                    </p>
                  </div>

                  <div className="mb-8">
                    <div
                      className={`flex justify-between text-xs font-bold mb-2 ${theme.textMain}`}
                    >
                      <span>Hazard Severity</span>
                      <span className={resultStyles?.text}>
                        {result.severityScore || 0}%
                      </span>
                    </div>
                    <div
                      className={`w-full rounded-full h-2.5 border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-gray-100 border-gray-200"}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${resultStyles?.bar}`}
                        style={{ width: `${result.severityScore || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {result?.familyBreakdown &&
                    result.familyBreakdown.length > 0 && (
                      <div className="space-y-4">
                        <h3
                          className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}
                        >
                          {scanTarget === "everyone"
                            ? "Family Breakdown"
                            : "Individual Breakdown"}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {result.familyBreakdown.map((member, index) => {
                            const isCritical = member.severityScore === 100;
                            const isCaution =
                              member.severityScore >= 60 &&
                              member.severityScore < 100;
                            const bgClass = isCritical
                              ? isDark
                                ? "bg-red-500/10 border-red-500/30"
                                : "bg-red-50 border-red-200"
                              : isCaution
                                ? isDark
                                  ? "bg-orange-500/10 border-orange-500/30"
                                  : "bg-orange-50 border-orange-200"
                                : isDark
                                  ? "bg-emerald-500/10 border-emerald-500/30"
                                  : "bg-emerald-50 border-emerald-200";
                            const textClass = isCritical
                              ? isDark
                                ? "text-red-400"
                                : "text-red-700"
                              : isCaution
                                ? isDark
                                  ? "text-orange-400"
                                  : "text-orange-700"
                                : isDark
                                  ? "text-emerald-400"
                                  : "text-emerald-700";

                            return (
                              <div
                                key={index}
                                className={`p-4 rounded-2xl border ${bgClass}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h4
                                    className={`font-bold flex items-center gap-2 text-sm ${theme.textMain}`}
                                  >
                                    👤{" "}
                                    <span className="capitalize">
                                      {member.memberName}
                                    </span>
                                  </h4>
                                  <div
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/50 dark:bg-black/20 ${textClass}`}
                                  >
                                    {member.status} ({member.severityScore}%)
                                  </div>
                                </div>
                                {member.warnings &&
                                member.warnings.length > 0 ? (
                                  <ul className="flex flex-col gap-1.5 mt-2">
                                    {member.warnings.map((warning, i) => (
                                      <li
                                        key={i}
                                        className={`text-[10px] font-bold flex items-start gap-1.5 ${warning.includes("CRITICAL") ? "text-red-500" : "text-yellow-600 dark:text-yellow-500"}`}
                                      >
                                        <span className="mt-1 opacity-70">
                                          •
                                        </span>
                                        {warning}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-bold">
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
                        onClick={(e) => {
                          e.preventDefault();
                          handleAskAI();
                        }}
                        disabled={
                          aiLoading[result.productName || result.dishName]
                        }
                        className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/30 active:scale-95 text-sm"
                      >
                        {aiLoading[result.productName || result.dishName]
                          ? "⏳ Analyzing..."
                          : "✨ Ask AI for Safe Alternatives"}
                      </button>
                    )}

                  {result.status === "Safe" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToGroceryList(
                          result.productName || result.dishName,
                        );
                      }}
                      className="w-full mt-6 py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
                    >
                      🛒 Add to Safe Grocery List
                    </button>
                  )}

                  {aiResults[result.productName || result.dishName] && (
                    <div className="mt-6 p-5 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
                      <h4 className="text-indigo-700 dark:text-indigo-300 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
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
                                className="bg-white dark:bg-slate-900/80 border border-indigo-50 dark:border-indigo-500/20 rounded-2xl p-4 shadow-sm"
                              >
                                <h5 className="text-indigo-800 dark:text-indigo-200 font-extrabold text-sm mb-1.5">
                                  #{index + 1} {dish.name}
                                </h5>
                                <p
                                  className={`${theme.textSub} text-xs leading-relaxed font-medium`}
                                >
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

        {/* 🔴 NEW: BOTTOM NAV COMPONENT */}
        <BottomNav theme={theme} />
      </div>

      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 z-[100] bg-gray-900/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-md h-[60vh] ${theme.modalBg} rounded-[32px] overflow-hidden shadow-2xl border`}
          >
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
          <div className="flex gap-4 mt-6 w-full max-w-md px-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowCropper(false);
              }}
              className={`flex-1 py-4 rounded-2xl font-bold transition-colors ${theme.btnBack}`}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowCropper(false);
                processImageUpload();
              }}
              className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-extrabold shadow-lg shadow-emerald-500/30"
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
