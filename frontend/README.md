# LUXVISION AI — Frontend Client

The frontend is an advanced research web interface built with **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 1. Directory Structure

```
frontend/
├── public/                # Static assets (favicons, public images)
├── src/
│   ├── assets/            # CSS styles, brand graphics
│   ├── components/
│   │   ├── common/        # Buttons, cards, modals, loaders
│   │   ├── layout/        # Navbar, footer, page wrappers
│   │   ├── comparison/    # 4-way synchronized canvas & detection overlays
│   │   ├── analytics/     # Recharts comparative graphs
│   │   └── benchmark/     # Dataset runner & batch progress bars
│   ├── pages/             # Route views (Dashboard, Inference, Benchmark, Explorer)
│   ├── services/          # API & Supabase service clients
│   ├── hooks/             # Custom React hooks (zoom/pan, auth, theme)
│   ├── types/             # TypeScript interfaces for API & detection schemas
│   ├── App.tsx            # Main application component & routes
│   └── main.tsx           # React DOM root entry point
├── .env.example           # Frontend environment template
├── .gitignore             # Node & build ignore rules
├── package.json           # npm dependencies and scripts
├── tailwind.config.js     # Tailwind CSS theme configuration
└── vite.config.ts         # Vite bundler configuration
```

---

## 2. Setup Instructions

### Step 1: Install Dependencies
Open PowerShell in the `frontend/` directory:
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your backend (`http://localhost:8000/api/v1`).

---

## 3. Running the Development Server

```powershell
npm run dev
```

- **Application URL**: http://localhost:5173
- Changes in `src/` will hot-reload instantly.

