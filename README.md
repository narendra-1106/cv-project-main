# LUXVISION AI

<div align="center">

**A Comparative Analysis Platform for Low-Light Image Enhancement and Object Detection**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch%202.x-EE4C2C?logo=pytorch)](https://pytorch.org)
[![YOLO11](https://img.shields.io/badge/Detection-YOLO11-00FFFF?logo=ultralytics)](https://docs.ultralytics.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Database%20%26%20Auth-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Redis](https://img.shields.io/badge/Queue-Redis%20%2B%20Celery-DC382D?logo=redis)](https://redis.io)

</div>

---

## 1. Project Abstract & Research Context

**LUXVISION AI** is an advanced research-based full-stack web platform built to evaluate and visualize how modern low-light image enhancement techniques impact downstream computer vision tasks—specifically **Object Detection** using **YOLO11** on the **ExDark (Exclusively Dark)** dataset.

The system is developed based on the academic research paper:
> **"Comparative Analysis of Low-Light Image Enhancement Techniques for Improved Object Detection"**

### The Core Scientific Question
*Do modern low-light enhancement algorithms actually improve object detection accuracy in dark environments, or do their perceptual visual enhancements introduce artifacts, over-saturation, or hallucinated textures that confuse deep convolutional and attention-based detectors?*

To answer this, LUXVISION AI provides a strictly controlled, real-time comparative pipeline across **four parallel conditions**.

---

## 2. The Four Experimental Conditions

```
                                      [ Low-Light Input Image ]
                                                  │
            ┌─────────────────────┬───────────────┴───────────────┬─────────────────────┐
            ▼                     ▼                               ▼                     ▼
     [ Condition 1 ]       [ Condition 2 ]                 [ Condition 3 ]       [ Condition 4 ]
     Original Image             CLAHE                         Zero-DCE            Retinexformer
       (Baseline)        (Classical Physics)               (Deep Curves)          (Transformer)
            │                     │                               │                     │
            └─────────────────────┴───────────────┬───────────────┴─────────────────────┘
                                                  ▼
                                      [ YOLO11 Detection Engine ]
                                  (Strictly Identical Parameters)
                                                  │
                                                  ▼
                                     [ Visual & Metric Analytics ]
```

| Condition | Paradigm | Method | Description |
| :--- | :--- | :--- | :--- |
| **Condition 1** | Baseline | **Original Low-Light** | Unmodified raw input image directly passed to YOLO11. Establishes the performance baseline. |
| **Condition 2** | Classical / Heuristic | **CLAHE** | Contrast Limited Adaptive Histogram Equalization applied in CIELAB color space. Zero-parameter learning, fast, classical baseline. |
| **Condition 3** | Deep Learning (Unsupervised) | **Zero-DCE** | Deep Curve Estimation. A lightweight CNN (~79K params) formulating enhancement as high-order tone curves without paired ground truth. |
| **Condition 4** | Deep Learning (SOTA Transformer) | **Retinexformer** | State-of-the-art Retinex-based transformer with Illumination-Guided Multi-Head Self-Attention (IG-MSA) for deep degradation restoration. |

---

## 3. The 12 ExDark Object Categories

The application supports the full taxonomy of the **ExDark (Exclusively Dark)** benchmark dataset:

```
 1. Bicycle     4. Bus         7. Chair       10. Motorbike
 2. Boat        5. Car         8. Cup         11. People
 3. Bottle      6. Cat         9. Dog         12. Table
```

---

## 4. Scientific Fairness Guarantees

To prevent bias and produce publication-ready results, LUXVISION AI strictly enforces:
1. **Identical Model Weights**: The exact same YOLO11 checkpoint (`yolo11n-exdark.pt`) is invoked across all four image conditions.
2. **Fixed Hyperparameters**: Detection confidence threshold ($\tau_{\text{conf}} = 0.25$), NMS IoU threshold ($\tau_{\text{iou}} = 0.45$), and input resolution ($640 \times 640$) are locked identically.
3. **Zero Synthetic Metrics**: All reported mAP@50, mAP@50-95, precision, recall, and IQA metrics (NIQE, Shannon Entropy) are calculated in real time by the PyTorch/NumPy evaluation engine.
4. **Isolated Latency Accounting**: Enhancement time is tracked separately from detection time to expose true inference trade-offs.

---

## 5. Technology Stack

- **Frontend**:
  - React 18+ with Vite & TypeScript
  - Tailwind CSS (Dark-mode academic aesthetic)
  - Recharts (Interactive comparative bar charts, trade-off radar charts, and latency waterfalls)
  - Custom 4-Way Synchronized Pan/Zoom Canvas Viewport
  - Supabase JS Client (`@supabase/supabase-js`)
- **Backend**:
  - Python 3.10+ with FastAPI (Asynchronous REST API)
  - Pydantic v2 (Strict request/response validation)
  - SQLAlchemy 2.0 (Async PostgreSQL ORM)
  - Celery + Redis (Asynchronous queue for batch ExDark dataset benchmarking)
- **AI / Computer Vision**:
  - PyTorch 2.x (CUDA accelerated inference with FP16 support)
  - OpenCV (CIELAB color space processing & CLAHE)
  - Ultralytics YOLO11 (ExDark 12-class detection wrapper)
  - Custom Zero-DCE & Retinexformer PyTorch implementations
  - Scikit-Image & SciPy (NIQE, Shannon Entropy, Michelson contrast)
- **Database & Cloud**:
  - PostgreSQL hosted on Supabase
  - Supabase Authentication (JWT-based role security)
  - Supabase Storage Buckets (`raw-images`, `enhanced-images`, `benchmark-exports`)

---

## 6. Project Directory Layout

```
luxvision-ai/
├── frontend/                     # React + Vite + TypeScript application
│   ├── src/
│   │   ├── components/
│   │   │   ├── comparison/       # 4-way synchronized canvas & detection overlays
│   │   │   ├── analytics/        # Recharts visual analytics components
│   │   │   ├── benchmark/        # Batch evaluation progress & runner UI
│   │   │   └── upload/           # Drag-and-drop & ExDark sample selector
│   │   ├── pages/                # Dashboard, Live Inference, Benchmark, Explorer
│   │   └── services/             # API client & Supabase service
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/endpoints/     # REST endpoints (inference, benchmark, exdark, auth)
│   │   ├── ml/
│   │   │   ├── enhancement/      # CLAHE, Zero-DCE, and Retinexformer models
│   │   │   ├── detection/        # YOLO11 wrapper & NMS processing
│   │   │   ├── evaluation/       # mAP@50, NIQE, and Shannon Entropy calculators
│   │   │   └── weights/          # Model checkpoints (.pt, .pth)
│   │   ├── workers/              # Celery batch background tasks
│   │   └── core/                 # Config, database engine, Redis setup
├── data/
│   ├── exdark/                   # Curated ExDark images, annotations & classes.json
│   └── scripts/                  # Dataset downloader & weights downloader
├── PROJECT_ARCHITECTURE.md       # Full architecture specification
├── DEVELOPMENT_ROADMAP.md        # Step-by-step implementation plan
├── DATABASE_SCHEMA.md            # PostgreSQL DDL & Supabase RLS policies
├── API_DESIGN.md                 # REST API endpoints & Celery contracts
├── .env.example                  # Environment configuration template
└── README.md                     # Project overview and instructions
```

---

## 7. Step-by-Step Setup Guide (For Students & Developers)

### Prerequisites
- **Python**: Version 3.10 or 3.11 installed.
- **Node.js**: Version 18.x or 20.x (with npm) installed.
- **NVIDIA GPU** *(Optional but recommended)*: CUDA 11.8+ or 12.x for PyTorch acceleration. (CPU execution is supported as a fallback).
- **Redis**: Running locally or via Docker (`docker run -p 6379:6379 redis:alpine`).
- **Supabase Account**: Free project created on [supabase.com](https://supabase.com).

---

### Step 1: Clone and Configure Environment Variables
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your Supabase project URL, Anon Key, and database credentials.

---

### Step 2: Database Setup (Supabase)
1. Open your Supabase dashboard and navigate to the **SQL Editor**.
2. Open the file [DATABASE_SCHEMA.md](file:///c:/Users/A/Desktop/cv%20project/DATABASE_SCHEMA.md).
3. Copy the SQL script under **Section 3** and run it in the Supabase SQL Editor.
4. Navigate to **Storage** in Supabase and create three public buckets:
   - `raw-images`
   - `enhanced-images`
   - `benchmark-exports`

---

### Step 3: Backend Python Environment Setup
Open a terminal in the root directory:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create a virtual environment
python -m venv .venv

# 3. Activate the virtual environment
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
# source .venv/bin/activate

# 4. Install backend dependencies
pip install -r requirements.txt
```

---

### Step 4: Download Model Weights

#### Zero-DCE Checkpoint (Required for Phase 4)

The Zero-DCE pretrained weights come from the **official repository** by Li Chongyi et al. (CVPR 2020):

| Property | Value |
| :--- | :--- |
| **Paper** | Zero-Reference Deep Curve Estimation for Low-Light Image Enhancement |
| **Authors** | Chongyi Li, Chunle Guo, Linghao Han, Jun Jiang, Ming-Ming Cheng, Jinwei Gu, Chen Change Loy |
| **GitHub** | [github.com/Li-Chongyi/Zero-DCE](https://github.com/Li-Chongyi/Zero-DCE) |
| **Google Drive** | [File ID: 1HVmYDliZ8C0bZIjLKSiMBg9LoNNX3YSQ](https://drive.google.com/file/d/1HVmYDliZ8C0bZIjLKSiMBg9LoNNX3YSQ/view) |
| **Architecture** | 7-layer CNN without pooling (~79K params), outputs 24-channel curve maps |
| **Destination** | `backend/app/ml/weights/zero_dce.pth` |

**Automated download** (from the backend directory, with venv active):
```bash
cd backend
python download_zero_dce_weights.py
```

**Manual download** (if automated download fails):
1. Download from [Google Drive](https://drive.google.com/file/d/1HVmYDliZ8C0bZIjLKSiMBg9LoNNX3YSQ/view)
2. Place the file at: `backend/app/ml/weights/zero_dce.pth`

> **Note:** If the checkpoint is missing at runtime, the application gracefully falls back to showing only Original and CLAHE results, with a warning banner.

#### All Weights (General Downloader)
Run the automated downloader script to acquire the pre-trained checkpoints for YOLO11, Zero-DCE, and Retinexformer:
```bash
python data/scripts/download_weights.py
```

---

### Step 5: Frontend React Setup
Open a separate terminal:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
```

---

### Step 6: Running the Application

#### 1. Start Redis Server
```bash
redis-server
```

#### 2. Start Celery Worker (In a dedicated terminal with backend .venv active)
```bash
cd backend
celery -A app.core.celery_app worker --loglevel=info -P solo
```

#### 3. Start FastAPI Backend Server
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API documentation will be available at: `http://localhost:8000/docs`

#### 4. Start React Frontend Dev Server
```bash
cd frontend
npm run dev
```
The web application will open at: `http://localhost:5173`

---

## 8. Academic Citation

If you use this software or methodology in your research, please cite:

```bibtex
@article{luxvision2026,
  title={Comparative Analysis of Low-Light Image Enhancement Techniques for Improved Object Detection},
  author={Research Team},
  journal={LUXVISION AI Technical Report},
  year={2026}
}
```

---

## 9. License
Distributed under the MIT License for educational and academic research purposes.

