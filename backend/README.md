# LUXVISION AI — Backend Service

The backend is built with **FastAPI** (Python 3.11) and serves the REST API, AI/ML enhancement and detection pipeline, and Celery asynchronous batch runners.

---

## 1. Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── health.py          # System status and hardware diagnostics
│   │       └── router.py              # API v1 route aggregator
│   ├── core/
│   │   └── config.py                  # Pydantic Settings & environment variables
│   ├── db/                            # SQLAlchemy models & migrations
│   ├── ml/                            # Enhancement (CLAHE, Zero-DCE, Retinexformer), YOLO11
│   ├── workers/                       # Celery tasks
│   └── main.py                        # FastAPI application entry point
├── tests/                             # Pytest unit and integration tests
├── .env.example                       # Environment configuration template
├── .gitignore                         # Python & venv ignore rules
└── requirements.txt                   # Pinned Python package dependencies
```

---

## 2. Setup Instructions

### Step 1: Activate Virtual Environment
Open PowerShell in the `backend/` directory:
```powershell
# Activate the existing virtual environment:
.\.venv\Scripts\Activate.ps1
```

### Step 2: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Update `DATABASE_URL`, `SUPABASE_URL`, and keys with your credentials.

---

## 3. Running the Server

Start the development server with live reload:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Root Verification**: http://localhost:8000
- **Interactive Swagger Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

