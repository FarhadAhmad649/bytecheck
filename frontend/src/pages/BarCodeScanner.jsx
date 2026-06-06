import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const BarcodeScanner = ({ onResult }) => {
  // 1. Store the callback in a ref so it doesn't trigger re-renders
  const onResultRef = useRef(onResult);

  // 2. Keep the ref updated with the latest function
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
       console.log("Barcode Scanner Error: ", error)
      },
    );

    // Cleanup function: only runs when the component is completely destroyed
    return () => {
      scanner.clear().catch(console.error);
    };
  }, []); // 🛑 CRITICAL: Empty dependency array! The camera only starts ONCE.

  return (
    // 🛑 CRITICAL UI FIX: Added bg-white and text-black so the default
    // scanner buttons are actually visible in your dark theme!
    <div
      id="reader"
      className="w-full bg-white text-black overflow-hidden rounded-2xl border-4 border-slate-700"
    ></div>
  );
};

export default BarcodeScanner;
