import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const BarcodeScanner = ({ onResult }) => {
  // 1. Store the callback in a ref so it doesn't trigger re-renders
  const onResultRef = useRef(onResult);

  // 2. Read Theme Preference
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // 3. Keep the ref updated with the latest function
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    // Initialize the scanner
    const scanner = new Html5QrcodeScanner("reader", config, false);

    scanner.render(
      (decodedText) => {
        // Call the latest version of onResult via the ref
        if (onResultRef.current) {
          onResultRef.current(decodedText);
        }
      },
      (error) => {
        // Suppress continuous console spam from the scanner seeking a code
      },
    );

    // Cleanup function: only runs when the component is completely destroyed
    return () => {
      scanner.clear().catch(console.error);
    };
  }, []); // CRITICAL: Empty dependency array! The camera only starts ONCE.

  return (
    <div
      className={`w-full overflow-hidden rounded-[28px] border-2 shadow-sm transition-colors duration-300 p-2 ${
        isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
      }`}
    >
      {/* 🔴 CSS Override: Makes the default scanner UI look like your modern app! */}
      <style>{`
        #reader {
          border: none !important;
          background: transparent !important;
        }
        #reader button {
          background-color: #10B981 !important; /* Emerald 500 */
          color: white !important;
          border-radius: 12px !important;
          padding: 10px 20px !important;
          border: none !important;
          font-weight: bold !important;
          margin: 6px !important;
          cursor: pointer !important;
          transition: 0.2s all !important;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3) !important;
        }
        #reader button:hover {
          background-color: #059669 !important; /* Emerald 600 */
        }
        #reader select {
          border-radius: 12px !important;
          padding: 10px !important;
          border: 1px solid ${isDark ? "#334155" : "#E5E7EB"} !important;
          background-color: ${isDark ? "#1E293B" : "#F9FAFB"} !important;
          color: ${isDark ? "#F8FAFC" : "#111827"} !important;
          font-weight: 500 !important;
          margin-bottom: 10px !important;
          outline: none !important;
        }
        #reader__dashboard_section_csr span {
          color: ${isDark ? "#94A3B8" : "#6B7280"} !important; /* Slate 400 or Gray 500 */
          font-weight: 600 !important;
        }
        #reader a {
          color: #10B981 !important;
          text-decoration: none !important;
          font-weight: bold !important;
        }
      `}</style>

      {/* The actual target div for the scanner */}
      <div id="reader" className="w-full"></div>
    </div>
  );
};

export default BarcodeScanner;
