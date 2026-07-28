# 🚨 ResQAI — Smart Disaster Response & Emergency Coordination Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)](https://firebase.google.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ResQAI is a production-ready disaster response platform featuring **AI-powered incident triage**, **real-time WebSocket coordination**, **Firebase Firestore persistence**, and a **Vanilla JS + Bootstrap 5** frontend — built for Government Authorities, Rescue Teams, and Volunteers.

---

## 📐 Architecture

```
ResQAI/
├── backend/
│   ├── auth/              # JWT auth, role-based dependencies
│   ├── database/          # Firebase manager, Firestore client, mock fallback
│   ├── middleware/        # Rate limiting (slowapi)
│   ├── models/            # Pydantic-like entity classes (Firestore documents)
│   ├── repositories/      # Firestore CRUD abstraction per entity
│   ├── routers/           # FastAPI routers (auth, incidents, shelters, resources, …)
│   ├── schemas/           # Pydantic request/response schemas
│   ├── services/          # Business logic (Auth, Incident, Shelter, Resource, …)
│   ├── utils/             # Logger, API response helpers
│   ├── websocket/         # WebSocket manager (JWT auth, role broadcasting)
│   └── main.py            # Application entry point
├── frontend/
│   ├── css/               # Variables (Light/Dark themes), base, components
│   ├── js/
│   │   ├── services/      # apiService, storageService, themeService, …
│   │   ├── websocket.js   # JWT-authenticated WebSocket client
│   │   └── app.js         # Main application bootstrap
│   └── index.html
├── .env.example           # Environment variable template
└── requirements.txt
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/rohanpilankar/ResQAI.git
cd ResQAI
```

### 2. Set Up Python Environment

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Long random string for JWT signing (min 32 chars) |
| `FIREBASE_CREDENTIALS` | Absolute path to Firebase service account JSON |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `ENVIRONMENT` | `development` / `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create Project
2. Enable **Firestore Database** (Production or Test mode)
3. Enable **Firebase Storage**
4. Go to **Project Settings → Service Accounts → Generate new private key**
5. Save the downloaded JSON and set `FIREBASE_CREDENTIALS=/path/to/key.json`

> **Note:** Without a credentials file, the app auto-starts with an **in-memory mock** — perfect for local development and testing.

### 5. Run the Backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

API Docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)  
Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 6. Run the Frontend

```bash
npm install
npm start           # Starts a static file server
# or
npm run dev         # With file watching
```

---

## 🔐 Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header.

```http
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass!123",
  "phone_number": "9876543210",
  "role_id": 1
}
```

**Roles:**

| role_id | Role Name |
|---|---|
| 1 | Volunteer |
| 2 | Rescue Team |
| 3 | Admin |
| 4 | Government Authority |

---

## 🌐 WebSocket

Connect to the real-time event stream with a valid JWT token:

```javascript
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/ws/my_client?token=${token}`);
```

**Event Types:**
- `INCIDENT_CREATED` — New emergency reported
- `INCIDENT_UPDATED` — Status/severity change
- `RESOURCE_ASSIGNED` — Resources dispatched
- `SHELTER_UPDATED` — Occupancy change
- `NOTIFICATION_CREATED` — New alert broadcast
- `MISSION_COMPLETED` — Incident resolved

---

## 📡 API Response Format

Every API response follows a consistent envelope:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

On error:
```json
{
  "success": false,
  "message": "Detailed error description",
  "data": {}
}
```

---

## 🎨 Theme System

The frontend supports **Light and Dark themes** via CSS custom properties.

Toggle programmatically:
```javascript
import { themeService } from './js/services/themeService.js';
themeService.init();    // Call on page load
themeService.toggle();  // Switch theme
```

Add a toggle button in HTML:
```html
<button data-theme-toggle aria-pressed="true">
  <span class="theme-icon">☀️</span>
  <span class="theme-label">Light Mode</span>
</button>
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest backend/tests/ -v

# With coverage report
pytest backend/tests/ -v --cov=backend --cov-report=term-missing

# Run specific test file
pytest backend/tests/test_auth.py -v
```

> Tests use an **in-memory mock Firestore** automatically — no Firebase credentials required.

---

## 📋 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Obtain JWT access token |
| GET | `/api/incidents` | List all incidents (paginated) |
| POST | `/api/incidents` | Report a new incident |
| GET | `/api/incidents/{id}` | Get incident details |
| PUT | `/api/incidents/{id}` | Update incident |
| GET | `/api/shelters` | List active shelters |
| POST | `/api/shelters` | Register a shelter |
| GET | `/api/resources` | List available resources |
| POST | `/api/resources` | Add a resource |
| GET | `/api/notifications` | Get user notifications |
| GET | `/api/analytics/overview` | Platform analytics |
| POST | `/api/ai/analyze` | AI triage & classification |
| GET | `/api/health` | Health check |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run tests before committing: `pytest backend/tests/ -v`
4. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
