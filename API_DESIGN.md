# LUXVISION AI — API Specification (v1)

## 1. Overview & Conventions

The **LUXVISION AI** backend exposes an asynchronous RESTful API built on **FastAPI**.

- **Base URL**: `http://localhost:8000/api/v1`
- **Authentication**: Supabase JWT passed as `Authorization: Bearer <jwt_token>` header. Public endpoints (such as `/health` or ExDark reference catalog) do not require authentication.
- **Content Negotiation**: All requests with a payload body must use `application/json` (except multi-part file uploads using `multipart/form-data`).
- **Response Format**: All successful responses return JSON wrapped in standard envelopes.

### Standard Error Response Format
```json
{
  "error": {
    "code": "IMAGE_DECODING_FAILED",
    "message": "The provided image buffer could not be decoded by OpenCV.",
    "details": "Unsupported file format or corrupted header.",
    "timestamp": "2026-11-16T10:15:30Z"
  }
}
```

---

## 2. API Endpoints Summary

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | Hardware (CUDA/GPU), VRAM, Redis, Celery, and DB status |
| **Auth** | `GET` | `/auth/me` | Fetch authenticated user profile & research role |
| **Auth** | `POST` | `/auth/sync` | Synchronize Supabase Auth user into PostgreSQL profile |
| **Inference** | `POST` | `/inference/compare` | Execute 4-way enhancement & YOLO11 detection pipeline |
| **Inference** | `GET` | `/inference/{experiment_id}` | Retrieve cached 4-way results for an existing experiment |
| **Inference** | `POST` | `/inference/single-method` | Run a specific enhancement method with custom parameters |
| **Benchmark** | `POST` | `/benchmark/start` | Trigger asynchronous batch ExDark evaluation (Celery) |
| **Benchmark** | `GET` | `/benchmark/status/{benchmark_id}` | Poll execution progress and completed image counts |
| **Benchmark** | `GET` | `/benchmark/results/{benchmark_id}`| Get comprehensive mAP@50, IQA, and per-class AP results |
| **Benchmark** | `GET` | `/benchmark/history` | List all historical benchmark runs |
| **ExDark** | `GET` | `/exdark/categories` | List the 12 ExDark categories and dataset statistics |
| **ExDark** | `GET` | `/exdark/samples` | Browse ExDark reference images filtered by class & light condition |
| **ExDark** | `GET` | `/exdark/samples/{sample_id}` | Get sample metadata and ground-truth annotations |
| **Analytics** | `GET` | `/analytics/summary` | Aggregated metrics formatted for Recharts dashboards |
| **Export** | `GET` | `/export/csv/{benchmark_id}` | Download research results formatted as CSV |
| **Export** | `GET` | `/export/latex/{benchmark_id}` | Generate IEEE/CVPR formatted LaTeX table code |

---

## 3. Detailed Endpoint Specifications

### 3.1 System Health
#### `GET /api/v1/health`
Checks all backend subsystems and hardware acceleration availability.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "hardware": {
    "cuda_available": true,
    "device_name": "NVIDIA GeForce RTX 4070 Laptop GPU",
    "device_count": 1,
    "allocated_vram_mb": 1240.5,
    "total_vram_mb": 8192.0
  },
  "services": {
    "database": "connected",
    "redis": "connected",
    "celery_workers": 2,
    "supabase_storage": "accessible"
  },
  "models_loaded": {
    "clahe": true,
    "zero_dce": true,
    "retinexformer": true,
    "yolo11": true
  }
}
```

---

### 3.2 Four-Way Comparative Inference
#### `POST /api/v1/inference/compare`
The central research pipeline endpoint. Accepts a low-light image (via upload or ExDark sample reference), processes it in parallel through the 4 conditions, runs YOLO11 detection with fixed parameters, and computes IQA metrics.

**Request**: `multipart/form-data`
- `file`: (Binary image file: JPEG/PNG/WebP, max 20MB)
- `sample_id`: (Optional UUID of an existing ExDark dataset image)
- `confidence_threshold`: Float (default: `0.25`, range: `0.05` to `0.95`)
- `iou_threshold`: Float (default: `0.45`, range: `0.1` to `0.9`)
- `experiment_title`: String (Optional, e.g., "Night Street Pedestrians Test")

**Response `200 OK`**:
```json
{
  "experiment_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "original_image": {
    "url": "https://xyz.supabase.co/storage/v1/object/public/raw-images/9b1deb4d.jpg",
    "width": 1280,
    "height": 720,
    "file_size_bytes": 348210
  },
  "detection_settings": {
    "model": "YOLO11",
    "weights": "yolo11n-exdark.pt",
    "confidence_threshold": 0.25,
    "iou_threshold": 0.45,
    "input_resolution": [640, 640]
  },
  "conditions": [
    {
      "condition_name": "original",
      "display_name": "Condition 1: Original (Baseline)",
      "enhanced_image_url": "https://xyz.supabase.co/storage/v1/object/public/raw-images/9b1deb4d.jpg",
      "metrics": {
        "enhancement_latency_ms": 0.0,
        "detection_latency_ms": 14.2,
        "total_latency_ms": 14.2,
        "niqe_score": 6.84,
        "shannon_entropy": 5.12,
        "mean_contrast": 18.4
      },
      "detection": {
        "total_detections": 2,
        "class_counts": {
          "People": 1,
          "Car": 1
        },
        "detections": [
          {
            "box_id": 1,
            "class_id": 10,
            "class_name": "People",
            "confidence": 0.421,
            "bbox": {
              "x1": 210, "y1": 340, "x2": 260, "y2": 490,
              "normalized": [0.164, 0.472, 0.203, 0.680]
            }
          },
          {
            "box_id": 2,
            "class_id": 4,
            "class_name": "Car",
            "confidence": 0.589,
            "bbox": {
              "x1": 550, "y1": 380, "x2": 720, "y2": 480,
              "normalized": [0.429, 0.527, 0.562, 0.666]
            }
          }
        ]
      }
    },
    {
      "condition_name": "clahe",
      "display_name": "Condition 2: CLAHE (Classical)",
      "enhanced_image_url": "https://xyz.supabase.co/storage/v1/object/public/enhanced-images/clahe_9b1deb4d.png",
      "metrics": {
        "enhancement_latency_ms": 4.8,
        "detection_latency_ms": 14.1,
        "total_latency_ms": 18.9,
        "niqe_score": 5.92,
        "shannon_entropy": 6.45,
        "mean_contrast": 34.2
      },
      "detection": {
        "total_detections": 4,
        "class_counts": {
          "People": 2,
          "Car": 2
        },
        "detections": [ /* ... */ ]
      }
    },
    {
      "condition_name": "zero_dce",
      "display_name": "Condition 3: Zero-DCE (Deep Curve)",
      "enhanced_image_url": "https://xyz.supabase.co/storage/v1/object/public/enhanced-images/zerodce_9b1deb4d.png",
      "metrics": {
        "enhancement_latency_ms": 12.3,
        "detection_latency_ms": 14.3,
        "total_latency_ms": 26.6,
        "niqe_score": 4.81,
        "shannon_entropy": 7.15,
        "mean_contrast": 42.1
      },
      "detection": {
        "total_detections": 6,
        "class_counts": {
          "People": 4,
          "Car": 2
        },
        "detections": [ /* ... */ ]
      }
    },
    {
      "condition_name": "retinexformer",
      "display_name": "Condition 4: Retinexformer (SOTA Transformer)",
      "enhanced_image_url": "https://xyz.supabase.co/storage/v1/object/public/enhanced-images/retinex_9b1deb4d.png",
      "metrics": {
        "enhancement_latency_ms": 86.5,
        "detection_latency_ms": 14.2,
        "total_latency_ms": 100.7,
        "niqe_score": 3.75,
        "shannon_entropy": 7.62,
        "mean_contrast": 48.9
      },
      "detection": {
        "total_detections": 8,
        "class_counts": {
          "People": 5,
          "Car": 2,
          "Bicycle": 1
        },
        "detections": [ /* ... */ ]
      }
    }
  ]
}
```

---

### 3.3 Asynchronous Benchmarking (Celery Tasks)
#### `POST /api/v1/benchmark/start`
Enqueues a heavy evaluation job processing an ExDark test split across all 4 conditions.

**Request Body**:
```json
{
  "name": "ExDark 12-Class Full Test Evaluation",
  "dataset_split": "test",
  "category_filter": null,
  "limit": 100,
  "confidence_threshold": 0.25,
  "iou_threshold": 0.45
}
```

**Response `202 Accepted`**:
```json
{
  "benchmark_id": "4a73bb22-8356-4c48-89c0-6d808c16db2e",
  "celery_task_id": "a9019b88-5182-411a-8c34-eb1f486b72a9",
  "status": "pending",
  "total_images": 100,
  "estimated_duration_seconds": 120
}
```

#### `GET /api/v1/benchmark/status/{benchmark_id}`
Returns live task progress for polling frontend components.

**Response `200 OK`**:
```json
{
  "benchmark_id": "4a73bb22-8356-4c48-89c0-6d808c16db2e",
  "status": "running",
  "progress_percentage": 64.0,
  "processed_images": 64,
  "total_images": 100,
  "current_stage": "retinexformer_inference",
  "elapsed_seconds": 45.2,
  "eta_seconds": 25.4
}
```

#### `GET /api/v1/benchmark/results/{benchmark_id}`
Returns the finalized academic evaluation results comparing the 4 conditions.

**Response `200 OK`**:
```json
{
  "benchmark_id": "4a73bb22-8356-4c48-89c0-6d808c16db2e",
  "name": "ExDark 12-Class Full Test Evaluation",
  "dataset_split": "test",
  "total_images_evaluated": 100,
  "completed_at": "2026-11-16T10:45:00Z",
  "summary_comparison": [
    {
      "condition": "original",
      "map_50": 0.384,
      "map_50_95": 0.218,
      "mean_precision": 0.442,
      "mean_recall": 0.365,
      "mean_f1": 0.399,
      "avg_enhancement_ms": 0.0,
      "avg_detection_ms": 14.3,
      "mean_niqe": 6.82,
      "mean_entropy": 5.21
    },
    {
      "condition": "clahe",
      "map_50": 0.442,
      "map_50_95": 0.256,
      "mean_precision": 0.489,
      "mean_recall": 0.421,
      "mean_f1": 0.452,
      "avg_enhancement_ms": 5.1,
      "avg_detection_ms": 14.2,
      "mean_niqe": 5.91,
      "mean_entropy": 6.42
    },
    {
      "condition": "zero_dce",
      "map_50": 0.518,
      "map_50_95": 0.304,
      "mean_precision": 0.562,
      "mean_recall": 0.495,
      "mean_f1": 0.526,
      "avg_enhancement_ms": 12.8,
      "avg_detection_ms": 14.3,
      "mean_niqe": 4.79,
      "mean_entropy": 7.12
    },
    {
      "condition": "retinexformer",
      "map_50": 0.589,
      "map_50_95": 0.352,
      "mean_precision": 0.631,
      "mean_recall": 0.567,
      "mean_f1": 0.597,
      "avg_enhancement_ms": 88.2,
      "avg_detection_ms": 14.4,
      "mean_niqe": 3.71,
      "mean_entropy": 7.68
    }
  ],
  "per_class_map50": {
    "original": { "Bicycle": 0.32, "Boat": 0.25, "Bottle": 0.28, "Bus": 0.55, "Car": 0.52, "Cat": 0.38, "Chair": 0.31, "Cup": 0.22, "Dog": 0.41, "Motorbike": 0.48, "People": 0.58, "Table": 0.31 },
    "clahe": { "Bicycle": 0.39, "Boat": 0.31, "Bottle": 0.34, "Bus": 0.61, "Car": 0.59, "Cat": 0.44, "Chair": 0.36, "Cup": 0.29, "Dog": 0.47, "Motorbike": 0.54, "People": 0.65, "Table": 0.37 },
    "zero_dce": { "Bicycle": 0.49, "Boat": 0.39, "Bottle": 0.42, "Bus": 0.69, "Car": 0.68, "Cat": 0.52, "Chair": 0.43, "Cup": 0.36, "Dog": 0.54, "Motorbike": 0.62, "People": 0.72, "Table": 0.45 },
    "retinexformer": { "Bicycle": 0.58, "Boat": 0.47, "Bottle": 0.49, "Bus": 0.76, "Car": 0.74, "Cat": 0.59, "Chair": 0.50, "Cup": 0.42, "Dog": 0.61, "Motorbike": 0.70, "People": 0.79, "Table": 0.52 }
  }
}
```

---

### 3.4 ExDark Dataset Explorer
#### `GET /api/v1/exdark/categories`
Returns the 12 ExDark categories with counts and visualization styles.

#### `GET /api/v1/exdark/samples`
**Query Parameters**:
- `category`: String (e.g. `People`, `Car`, `Bicycle`)
- `lighting`: String (e.g. `Low`, `Night`, `Twilight`, `Indoor`)
- `page`: Integer (default: 1)
- `limit`: Integer (default: 20)

---

### 3.5 Academic Export Endpoints
#### `GET /api/v1/export/latex/{benchmark_id}`
Returns a LaTeX code snippet formatted for IEEE/CVPR research publications:

```latex
\begin{table}[htbp]
\centering
\caption{Comparative Performance of Enhancement Techniques on ExDark using YOLO11}
\begin{tabular}{lcccccc}
\hline
\textbf{Enhancement Method} & \textbf{mAP@50} & \textbf{mAP@50-95} & \textbf{Precision} & \textbf{Recall} & \textbf{Latency (ms)} & \textbf{NIQE} $\downarrow$ \\
\hline
Original (Baseline) & 0.384 & 0.218 & 0.442 & 0.365 & 14.2 & 6.82 \\
CLAHE & 0.442 & 0.256 & 0.489 & 0.421 & 18.9 & 5.91 \\
Zero-DCE & 0.518 & 0.304 & 0.562 & 0.495 & 26.6 & 4.79 \\
Retinexformer & \textbf{0.589} & \textbf{0.352} & \textbf{0.631} & \textbf{0.567} & 100.7 & \textbf{3.71} \\
\hline
\end{tabular}
\label{tab:enhancement_yolo11_exdark}
\end{table}
```

