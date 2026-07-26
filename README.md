# ResQAI – Smart Disaster Response & Emergency Coordination Platform

ResQAI is a production-quality, modular, real-time emergency management and disaster response platform. It allows citizens, rescue teams, government authorities, and administrators to coordinate emergency response efficiently.

---

## 🌟 Key Architectural Features

1. **Modular Layered Architecture**:
   - **Frontend**: Pure HTML5, CSS3, Modern JavaScript (ES6 Modules), Bootstrap 5, Axios, Leaflet.js, Chart.js, Font Awesome.
   - **Backend**: FastAPI, SQLAlchemy ORM, Pydantic v2, JWT Access/Refresh Tokens, WebSockets.
   - **Database**: SQLite (Zero-config out-of-the-box local running) / PostgreSQL ready.

2. **20 Architectural & Code Quality Improvements**:
   - Single dynamic `dashboard.html` rendering role-based views (`Citizen`, `Rescue Team`, `Government Authority`, `Admin`).
   - Clean 3-tier layering: `Controllers (Routers) -> Services -> Repositories -> Database`.
   - Pluggable AI Service interface (`backend/services/ai_service.py`) composing `SeverityPredictor`, `DuplicateDetector`, `ResourceRecommender`, and `RouteOptimizer`.
   - Event-driven WebSockets with typed event models.
   - Dual-token JWT authentication (Access & Refresh tokens) with automatic token refresh in Axios client.

---

## 📁 Directory Structure

```
ResQAI/
├── .env.example
├── .env
├── requirements.txt
├── README.md
│
├── frontend/
│   ├── index.html                   # Public landing page & live map
│   ├── login.html                   # Unified authentication & citizen registration
│   ├── dashboard.html               # Single dynamic role-based dashboard
│   ├── 404.html                     # Custom 404 error page
│   ├── 500.html                     # Custom 500 server error page
│   ├── css/                         # Modular CSS design system
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── tables.css
│   │   ├── forms.css
│   │   ├── map.css
│   │   ├── dashboard.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   └── responsive.css
│   └── js/
│       ├── app.js                   # Application entry point & router guard
│       ├── config.js                # Centralized config (API & WS URLs, Map defaults)
│       ├── websocket.js             # Event-driven WebSocket client
│       ├── dashboard.js             # Role-based dashboard view router
│       ├── api/                     # Centralized Axios API services
│       ├── services/                # Geolocation, storage, toast, validation
│       ├── components/              # Reusable dynamic HTML generators
│       └── utils/                   # Helpers, formatters, distance calculators
│
└── backend/
    ├── main.py                      # FastAPI application entry point
    ├── config.py                    # Environment settings (Pydantic BaseSettings)
    ├── database/
    │   ├── session.py               # SQLAlchemy engine (SQLite & PostgreSQL)
    │   └── init_db.py               # Database auto-creation & demo seed data
    ├── models/                      # Database Entities (SQLAlchemy)
    ├── schemas/                     # Data Contracts (Pydantic v2)
    ├── repositories/                # Repository Pattern DB Access Layer
    ├── services/                    # Business Logic & Pluggable AI Interfaces
    ├── auth/                        # JWT & Passlib Password Hashing
    ├── websocket/                   # Real-time WebSockets Manager
    ├── routers/                     # REST API Endpoints
    ├── logs/                        # Application & Audit log files
    └── tests/                       # Pytest Test Suite
```

---

## 🔑 Pre-Seeded Demo Accounts

Upon initial startup, `backend/database/init_db.py` automatically initializes default roles and demo accounts:

| Role | Email | Password | Access / Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@resqai.com` | `password123` | User management, system audit logs, full system control |
| **Government** | `gov@resqai.com` | `password123` | Heatmap analytics, shelter capacity, resource allocation |
| **Rescue Team** | `rescue@resqai.com` | `password123` | Assigned incident missions, live map, navigation support |
| **Citizen** | `citizen@resqai.com` | `password123` | Emergency report submission, GPS auto-detect, shelter finder |

---

## ⚡ Quick Start Guide (Local Execution)

### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI server with uvicorn (Port 8000)
python -m uvicorn backend.main:app --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

### 2. Frontend Execution
You can serve the `frontend/` directory using Python's built-in HTTP server or any static file server:

```bash
# Serve frontend on Port 3000
python -m http.server 3000 --directory frontend
```

Open your browser at:
- Landing Page: [http://localhost:3000/index.html](http://localhost:3000/index.html)
- Login Page: [http://localhost:3000/login.html](http://localhost:3000/login.html)
- Dashboard: [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)

---

## 🧪 Running Automated Tests

Run the test suite using `pytest`:
```bash
pytest backend/tests/
```

---

## 🤖 Pluggable AI Model Integration

All AI predictions (severity assessment, duplicate detection, resource recommendations, route optimization) are abstracted inside:
`backend/services/ai_service.py`

When real ML models or deep learning pipelines are ready, simply update the internal implementation inside `SeverityPredictor`, `DuplicateDetector`, `ResourceRecommender`, or `RouteOptimizer` inside `ai_service.py`. No changes to REST routers, database models, or frontend modules are needed!
