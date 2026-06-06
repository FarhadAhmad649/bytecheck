import cv2
import pytesseract
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Windows specific path configuration (Uncommented and verified)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_image(image_path):
    try:
        # 1. Load the image using OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not open or find the image.")

        # 2. Preprocessing: Convert to grayscale for better OCR accuracy
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 3. Preprocessing: Apply a threshold to make text stand out
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

        # 4. CRITICAL FIX: Use PSM 11 (Sparse text) which is perfect for 1 or 2 isolated, bold words.
        # If PSM 11 is ever messy, you can change this back to --psm 6
        custom_config = r'--oem 3 --psm 11'
        
        # Extract text ONCE using the custom configuration
        text = pytesseract.image_to_string(thresh, config=custom_config)

        # 5. Print the result as a JSON string so Node.js can easily parse it
        result = {
            "success": True, 
            "text": text.strip()  # Now we are returning the correctly configured text!
        }
        print(json.dumps(result))

    except Exception as e:
        # If anything goes wrong, send the error back to Node.js
        error_result = {
            "success": False, 
            "error": str(e)
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    # Node.js will pass the image path as a command-line argument when it triggers this script
    if len(sys.argv) > 1:
        image_file_path = sys.argv[1]
        extract_text_from_image(image_file_path)
    else:
        print(json.dumps({"success": False, "error": "No image path provided by Node.js"}))