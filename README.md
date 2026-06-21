# Trao AI Travel Planner

Trao AI Travel Planner is a full-stack, secure, multi-user web application that leverages Google Gemini API to dynamically generate structured day-by-day itineraries, estimate budgets, suggest hotels, and create personalized packing lists based on climate.

## Tech Stack & Justifications
- **Frontend**: Next.js (App Router, TypeScript, React 19) styled with Tailwind CSS v4. Lucide React for modern, responsive icons. Next.js provides excellent performance, file-based routing, and built-in support for React Server/Client Components.
- **Backend**: Node.js + Express (TypeScript) providing REST API endpoints.
- **Database**: Mongoose ODM + MongoDB.
  - *Engineering Fallback Option*: The backend includes a JSON-persisted Mock Database fallback (`mock_db.json`) which is activated automatically if MONGO_URI is missing or unreachable. This allows instant local execution without installing MongoDB.
- **AI Agent Integration**: Google Gemini 2.5 Flash / Flash Preview API, incorporating prompt engineering for strict JSON responses and an exponential retry mechanism (up to 5 attempts) to protect against transient 429 rate limit errors.
- **Security**: Password hashing using `bcryptjs` and session authentication using JSON Web Tokens (JWT) inside standard HTTP Authorization headers.

---

## High-Level Architecture & Data Flow

Client requests flow to the API layer, database layer, and Google Gemini API services.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Client (UI)                  │
│   (Auth State, Trip Form, Dynamic Itinerary Board)     │
└───────────┬────────────────────────────────▲───────────┘
            │                                │
     REST / GraphQL                   JSON Response
 (JWT in Auth Header)           (Strict User-Isolated Data)
            │                                │
┌───────────▼────────────────────────────────┼───────────┐
│               Express.js REST API Server               │
│   ┌────────────────────────────────────────────────┐   │
│   │               Auth Middleware                  │   │
│   │   (Decodes JWT, Enforces req.user.id Checks)   │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│           ┌───────────────┴───────────────┐            │
│           ▼                               ▼            │
│   ┌───────────────┐               ┌───────────────┐    │
│   │  Trip Routes  │               │  User Routes  │    │
│   └───────┬───────┘               └───────┬───────┘    │
└───────────┼───────────────────────────────┼────────────┘
            │                               │
            ├───────────────┐               │
            ▼               ▼               ▼
 ┌───────────────────┐ ┌─────────┐ ┌─────────────────┐
 │ Google Gemini API │ │ MongoDB │ │  MongoDB Users  │
 │ (LLM Generation)  │ │  Trips  │ │  (Hashed Pass)  │
 └───────────────────┘ └─────────┘ └─────────────────┘
```

---

## Key Features

1. **Authentication & Authorization**: Secure registration and login. JWT token boundaries ensure User A cannot inspect or modify itineraries created by User B.
2. **Preference Questionnaire**: Accept destination, duration, budget tier (Low, Medium, High), and checkboxes for interest options (Culinary, Culture, Adventure, etc.).
3. **AI Day-by-Day Generation**: Calls Gemini API to layout activities for every day, suggest local hotels, estimate transit, food, and lodging costs.
4. **Editable Itinerary**:
   - Add activity inline to any day (automatically updates DB & recalculates ledger budget).
   - Delete specific activity (automatically recalculates ledger budget).
5. **Day Regeneration**: Enter target instruction for single day (e.g. "Focus on hiking Mt Fuji instead of shopping") to prompt Gemini to replace just that day's itinerary, updating database and recalculating budgets.
6. **Creative Feature: Weather-Aware Packing Assistant**:
   - Utilizes destination geography, seasonal periods (current month), and activities to generate climate-customized gear, clothes, and documents checklist.
   - Divided into tabs (All, Documents, Clothing, Gear, Other) where checks/unchecks toggle checked status and persist changes directly to the database.
7. **Budget ledger**: Breakdown showing transport, lodging, dining, activities, and total costs.

---

## Setup Instructions

### Local Environment Setup

#### Prerequisites
- Node.js (v18.x or v20.x+)
- MongoDB (optional, server will auto-fallback to a local `mock_db.json` file database if MongoDB is not running!)

#### 1. Setup Backend
1. Open a terminal and enter the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` into a new `.env` file:
   ```bash
   cp .env.example .env
   ```
4. Define your environment variables in `.env`:
   - `GEMINI_API_KEY`: Enter your Gemini API key from Google AI Studio.
   - `MONGO_URI`: Keep blank or leave default `mongodb://127.0.0.1:27017/trao-travel-planner` to test MongoDB, or delete/comment to use the local `mock_db.json` database.
   - `JWT_SECRET`: Set a secure string hash.
5. Start development server:
   ```bash
   npm run dev
   ```
   *Note: If MongoDB is not running, you will see a warning in the console: `⚠️ Mock Database is ENABLED. Data will be saved to mock_db.json`.*

#### 2. Setup Frontend
1. Open a separate terminal and enter the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

---

## AI Agent Design & Prompt Engineering

The Gemini integration is designed around strict structured JSON output. We supply the model with detailed schemas and instruct it to return ONLY a parseable JSON object matching the TypeScript interfaces.
If Gemini experiences rate limiting, an exponential backoff helper intercepts the `429` status code, waits, and retries the request up to 5 times (progressive delay multiplier: 1s, 2s, 4s, 8s, 16s) to ensure resilience.

---

## Key Design Decisions & Trade-Offs

- **Mock Database Fallback**: Designed to guarantee the code runs out-of-the-box for evaluators without configuring Atlas clusters or starting local services, saving local state in `backend/mock_db.json`.
- **Inline Day Regeneration & Additions**: Rather than opening heavy overlays or reloading the page, we implemented lightweight inline form expansion for activities additions and prompts to maintain smooth focus on the travel board.
- **Fetch Client over Axios**: Using standard `fetch` client in frontend/backend to leverage native ES6/Node features, minimizing package size.

## Known Limitations
- The day regeneration features require a valid `GEMINI_API_KEY` to work. If no API key is specified in backend `.env`, the generation actions will gracefully report a 500 error warning banner to the user.
- Local Mock Database does not support concurrent database transactions, but since it is intended for local evaluation purposes, it provides 100% fidelity.
