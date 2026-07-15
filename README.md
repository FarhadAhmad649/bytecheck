# ByteCheck 🍽️

ByteCheck is an AI-powered food safety platform that analyzes food ingredients and restaurant menus based on a user's allergies, dietary restrictions, and medical conditions. It helps users make safer, faster food choices with instant, personalized recommendations.

**Live demo:** [bytecheck-tau.vercel.app](https://bytecheck-tau.vercel.app)

---

## ✨ Features

- **Smart Scan** — Point your camera at a food label, a restaurant menu, or a single dish and ByteCheck automatically detects what it's looking at and analyzes it.
- **Ingredient Label Analysis** — OCR-powered text extraction from packaged food labels, cross-checked against your allergy and dietary profile.
- **Barcode Scanning** — Quick product lookups via barcode/QR scanning.
- **Dish & Menu Analysis** — Search or scan a restaurant dish to see if it's safe for you, powered by a Pakistani food dictionary and Google Gemini AI.
- **AI-Generated Safe Alternatives** — When something isn't safe, get instant AI-suggested alternatives.
- **Family Profiles** — Manage allergy and dietary profiles for multiple family members from one account.
- **Scan History** — Keep a running history of everything you've scanned.
- **Safe Grocery List** — Build and manage a grocery list of items that are safe for you.
- **Admin Dish Dictionary** — Admins can add, update, and remove dishes from the shared dish dictionary.

## 🧱 Tech Stack

**Frontend**
- React 19 + Vite
- React Router
- Tailwind CSS
- Framer Motion (animations)
- `html5-qrcode` / `@yudiel/react-qr-scanner` (barcode & QR scanning)
- `react-easy-crop`, `browser-image-compression` (image handling)
- Axios

**Backend**
- Node.js + Express 5
- MongoDB with Mongoose
- JWT authentication (`jsonwebtoken`, `bcryptjs`)
- Multer (file uploads)
- Google Gemini API (`@google/genai`) for AI-driven analysis
- Python OCR microprocess (OpenCV + Tesseract via `pytesseract`) for label text extraction

**Deployment**
- Vercel (both frontend and backend, per `vercel.json`)

## 📂 Project Structure

```
bytecheck/
├── backend/
│   ├── ai_service/        # Python OCR processor (OpenCV + Tesseract)
│   ├── config/             # DB connection & allergen mapping config
│   ├── controllers/        # Route handlers (users, scans, dishes)
│   ├── middleware/         # Auth & admin middleware
│   ├── models/             # Mongoose schemas (User, Scan, FoodDictionary)
│   ├── routes/              # Express routes (userRoutes, scanRoutes)
│   ├── uploads/             # Uploaded scan images
│   ├── pakistan_food_database_200.json  # Seed dish/food data
│   ├── seed.js              # DB seed script
│   └── server.js            # App entry point
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components (BottomNav, PrivateRoute, etc.)
    │   ├── pages/            # App pages (Scanner, Dashboard, History, etc.)
    │   ├── context/          # React context providers
    │   ├── services/         # Axios API client
    │   └── utils/
    └── public/
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB Atlas connection string (or local MongoDB instance)
- A Google Gemini API key
- Python 3 with `opencv-python` and `pytesseract` installed, plus [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed on your system (for label OCR)

### 1. Clone the repo

```bash
git clone https://github.com/FarhadAhmad649/bytecheck.git
cd bytecheck
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_google_gemini_api_key
PORT=5000
```

Run the server:

```bash
npm run dev
```

The API will start on `http://localhost:5000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will start on the port Vite assigns (typically `http://localhost:5173`).

> **Note:** The frontend's Axios client currently points to a deployed backend URL by default. Update `frontend/src/services/api.js` to point at `http://localhost:5000/api` for local development against your own backend.

## 🔌 API Overview

**User routes** (`/api/users`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register a new user |
| POST | `/login` | Authenticate and receive a JWT |
| GET / PUT | `/profile` | Get or update the logged-in user's profile |
| POST | `/family` | Add a family member profile |
| PUT / DELETE | `/family/:id` | Update or remove a family member |
| POST | `/grocery` | Add an item to the safe grocery list |
| DELETE | `/grocery/:itemId` | Remove an item from the grocery list |

**Scan routes** (`/api/scans`)
| Method | Endpoint | Description |
|---|---|---|
| POST / GET | `/` | Create a scan entry / fetch a user's scans |
| GET | `/history` | Get scan history |
| POST | `/analyze-dish` | Analyze a dish by name |
| POST | `/analyze-text` | Analyze raw ingredient text |
| POST | `/analyze-smart` | Smart scan endpoint (auto-detects labels, dishes, or menus from an image) |
| POST | `/ai-alternatives` | Get AI-generated safe alternatives |
| POST | `/add-dish` | *(admin)* Add a dish to the dictionary |
| GET | `/dishes` | *(admin)* List all dishes |
| PUT / DELETE | `/dish/:id` | *(admin)* Update or delete a dish |

All routes except registration/login require a valid JWT (`Authorization: Bearer <token>`).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to open a pull request or an issue.

## 📄 License

ISC
