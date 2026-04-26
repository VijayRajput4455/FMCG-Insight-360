# FMCG Insight 360

<p align="center">
	<img src="resources/FMCG_logo.png" alt="FMCG Insight 360 Logo" width="240" />
</p>

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&pause=1200&color=00B8D4&center=true&vCenter=true&width=1000&lines=FMCG+Shelf+Audit+Platform;FastAPI+%7C+RabbitMQ+%7C+Redis+%7C+PostgreSQL;Detection+Workflow+with+Streamlit+Ops+Console;Product+Codes+%7C+Products+%7C+Models+%7C+Audit+History" alt="FMCG Insight animated intro" />
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
	<img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
	<img src="https://img.shields.io/badge/Streamlit-UI-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" alt="Streamlit" />
	<img src="https://img.shields.io/badge/RabbitMQ-Async-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
	<img src="https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</p>

<p align="center">
	<b>📦 Product Ops</b> · <b>🧠 ML Inference</b> · <b>⚡ Async Processing</b> · <b>📊 Audit Analytics</b>
</p>

End-to-end FMCG shelf audit platform with FastAPI backend, PostgreSQL storage, RabbitMQ-based async processing, Redis caching, and a Streamlit operations UI.

This project lets teams:
- manage product codes, products, and ML models,
- submit shelf images for audit,
- process detections asynchronously,
- track audit status and export reports.

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Features](#features)
4. [Technology Stack](#technology-stack)
5. [Core Libraries](#core-libraries)
6. [Screenshots](#screenshots)
7. [Architecture and Flow](#architecture-and-flow)
8. [Why RabbitMQ and Redis](#why-rabbitmq-and-redis)
9. [Installation and Setup](#installation-and-setup)
10. [Running the Project](#running-the-project)
11. [Environment Variables](#environment-variables)
12. [API Endpoints](#api-endpoints)
13. [Troubleshooting](#troubleshooting)

---

## 🧭 Quick Navigation

- 🚀 [Installation and Setup](#installation-and-setup)
- 🖼️ [Screenshots](#screenshots)
- 🧩 [API Endpoints](#api-endpoints)
- 🧠 [Architecture and Flow](#architecture-and-flow)
- 📨 [Why RabbitMQ and Redis](#why-rabbitmq-and-redis)
- 🛠️ [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

FMCG Insight 360 is designed for product visibility audits on shelf images.

High-level lifecycle:
1. Admin creates a Product Code.
2. Admin maps Products to that Product Code.
3. Admin registers one or more YOLO models for that Product Code.
4. User submits an image URL or uploads an image for audit.
5. API creates an audit record and queues an async job in RabbitMQ.
6. Worker consumes job, runs inference, and writes result to DB.
7. API returns status/results (with Redis acceleration for completed results).
8. Streamlit UI displays live progress, history, and exports.

---

## 🗂️ Folder Structure

```text
FMCG-Insight-360/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── audit.py
│   │           ├── models.py
│   │           ├── product_codes.py
│   │           └── products.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── logger.py
│   ├── models/
│   │   ├── audit_result.py
│   │   ├── model.py
│   │   ├── product.py
│   │   └── product_code.py
│   ├── repositories/
│   │   ├── audit_repo.py
│   │   ├── model_repo.py
│   │   └── product_repo.py
│   ├── schemas/
│   │   ├── audit.py
│   │   ├── error.py
│   │   ├── model.py
│   │   ├── product.py
│   │   └── product_code.py
│   ├── services/
│   │   ├── audit_service.py
│   │   ├── inference_service.py
│   │   ├── model_service.py
│   │   ├── rabbitmq_service.py
│   │   └── redis_cache.py
│   ├── workers/
│   │   └── worker.py
│   └── main.py
├── ml_models/
├── scripts/
├── tests/
├── streamlit_app.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## ✨ Features

### Backend Features
- Product Code CRUD
- Product CRUD + bulk create + search
- Model CRUD + per-product-code model association
- Audit submit (URL and file upload)
- Audit status polling and WebSocket updates
- Annotated output image serving
- Audit history listing and filtering

### Processing Features
- Async audit pipeline using RabbitMQ queue
- Retry and failed-queue handling for worker failures
- Multi-model inference support per product code
- Annotated image generation with detection coordinates
- Result persistence in PostgreSQL

### Performance Features
- Redis cache for product_code -> id lookup
- Redis cache for completed/failed audit result responses
- In-memory YOLO model cache with LRU and idle eviction

### Streamlit UI Features
- Unified admin console for product codes, products, models, audits
- Live audit status and result preview
- CSV export for tables
- PDF export for audit detail
- Scheduled report configuration UI

---

## 🧱 Technology Stack

- Python 3.10+
- FastAPI (REST and WebSocket APIs)
- SQLAlchemy 2 + PostgreSQL
- RabbitMQ (message broker)
- Redis (cache)
- YOLO via Ultralytics
- OpenCV (image I/O and annotation)
- Streamlit (admin and operations UI)

---

## 📦 Core Libraries

| Library | Purpose | Used In |
|---|---|---|
| fastapi | HTTP and WebSocket API framework | app/main.py, app/api/v1/endpoints/* |
| uvicorn | ASGI server | backend runtime |
| sqlalchemy | ORM and DB session management | app/core/database.py, models/repositories |
| psycopg2-binary | PostgreSQL driver | DB connectivity |
| pika | RabbitMQ publish/consume | app/services/rabbitmq_service.py, app/workers/worker.py |
| redis | Cache client | app/services/redis_cache.py |
| requests | Outbound HTTP for URL image fetch | app/api/v1/endpoints/audit.py |
| opencv-python | Image decode, annotation, save | audit/inference services |
| python-multipart | Multipart file upload parsing | audit upload endpoint |
| python-dotenv | .env loading | app/core/config.py |
| ultralytics | YOLO model runtime | app/services/model_service.py |
| streamlit | Admin UI | streamlit_app.py |
| Pillow | Image display in Streamlit | streamlit_app.py |
| streamlit-option-menu | Sidebar navigation UI | streamlit_app.py |
| reportlab | PDF report generation | streamlit_app.py |

---

## 🖼️ Screenshots

<p align="center">
	<img src="resources/workflow_preview.jpg" alt="Workflow Preview" width="820" />
</p>

<p align="center">
	<b>Audit workflow preview with annotated inference output</b>
</p>

<table>
	<tr>
		<td align="center">
			<img src="resources/audit_preview_1.jpg" alt="Audit Preview 1" width="390" /><br/>
			<b>Annotated Audit Output</b><br/>
			Detection-ready shelf image with drawn bounding boxes.
		</td>
		<td align="center">
			<img src="resources/audit_preview_2.jpg" alt="Audit Preview 2" width="390" /><br/>
			<b>Processed Inference Sample</b><br/>
			Example audit artifact produced by the async worker pipeline.
		</td>
	</tr>
</table>

> Note: these are bundled preview assets from the project workflow. If you want, UI screenshots from the Streamlit dashboard can be added next as dedicated admin-console previews.

---

## 🧠 Architecture and Flow

<p align="center">
  <img src="resources/workflow_preview.jpg" alt="Workflow Preview" width="760" />
</p>

```mermaid
flowchart LR
	UI[Streamlit UI] --> API[FastAPI API]
	API --> DB[(PostgreSQL)]
	API --> RMQ[(RabbitMQ audit.jobs)]
	API --> REDIS[(Redis Cache)]
	RMQ --> WORKER[Audit Worker]
	WORKER --> MODEL[YOLO Model Service]
	MODEL --> INF[Inference Service]
	INF --> DB
	INF --> OUT[outputs/audit/*.jpg]
	API --> UI
```

Detailed flow:
1. Client calls audit submit endpoint.
2. API validates product code and image.
3. API creates pending audit row in DB.
4. API publishes message to `audit.jobs` queue.
5. Worker consumes message and marks audit `processing`.
6. Worker loads model(s), runs inference, saves annotated image.
7. Worker updates audit row to `completed` or `failed`.
8. API status endpoint returns final payload (and caches completed result in Redis).

---

## 📨 Why RabbitMQ and Redis

### Why RabbitMQ
- Decouples API request time from heavy ML inference time.
- Prevents request timeout during model processing.
- Supports reliable job handling with durable queues.
- Enables retries and dead-letter style failed queue handling.
- Makes horizontal worker scaling possible.

### Why Redis
- Speeds up repeated lookups of `product_code -> id`.
- Caches completed audit result payloads for faster repeated reads.
- Reduces repeated DB reads under high polling traffic.
- Supports graceful fallback: if Redis is unavailable, app continues in DB-only mode.

---

## 🚀 Installation and Setup

### 1) Clone and enter project

```bash
git clone <your-repo-url>
cd FMCG-Insight-360
```

### 2) Create conda environment & install dependencies

**Option A — One-command setup (recommended):**

```bash
conda env create -f environment.yml
conda activate fmcg
```

**Option B — Manual setup:**

```bash
conda create -n fmcg python=3.10 -y
conda activate fmcg
pip install -r requirements.txt
pip install ultralytics
```

### 4) Prepare PostgreSQL database

Create DB and user (example):

```sql
CREATE DATABASE fmcg_db;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE fmcg_db TO admin;
```

### 5) Start RabbitMQ

Option A: local service

```bash
sudo systemctl start rabbitmq-server
```

Option B: Docker

```bash
docker run -d --name fmcg-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 6) Start Redis

Option A: local service

```bash
sudo systemctl start redis-server
```

Option B: conda package

```bash
conda install -n fmcg -c conda-forge redis-server -y
conda run -n fmcg redis-server --daemonize yes
```

### 7) Create `.env`

Create `.env` in project root:

```env
DATABASE_URL=postgresql://admin:admin123@localhost:5432/fmcg_db

AUTO_START_WORKER=false

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_DEFAULT_TTL_SECONDS=600
REDIS_AUDIT_RESULT_TTL_SECONDS=1800

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_HEARTBEAT=600
RABBITMQ_BLOCKED_TIMEOUT=300
RABBITMQ_EXCHANGE=fmcg.direct
RABBITMQ_AUDIT_QUEUE=audit.jobs
RABBITMQ_AUDIT_FAILED_QUEUE=audit.jobs.failed
RABBITMQ_MAX_RETRIES=3

AUDIT_INPUT_DIR=uploads/audit
AUDIT_OUTPUT_DIR=outputs/audit
MODEL_CACHE_SIZE=10
MODEL_MAX_IDLE_SECONDS=900
```

---

## ▶️ Running the Project

Open separate terminals.

### Terminal 1: FastAPI backend

```bash
conda activate fmcg
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Worker

```bash
conda activate fmcg
python -m app.workers.worker
```

### Terminal 3: Streamlit UI

```bash
conda activate fmcg
streamlit run streamlit_app.py --server.port 8501
```

Useful URLs:
- API root health: `http://127.0.0.1:8000/`
- FastAPI docs: `http://127.0.0.1:8000/docs`
- Streamlit UI: `http://127.0.0.1:8501`
- RabbitMQ UI (if management enabled): `http://127.0.0.1:15672`

---

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| DATABASE_URL | SQLAlchemy database URL | required |
| AUTO_START_WORKER | Start worker in API process startup | false |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| REDIS_DB | Redis db index | 0 |
| REDIS_PASSWORD | Redis password | empty |
| REDIS_DEFAULT_TTL_SECONDS | Generic cache TTL | 600 |
| REDIS_AUDIT_RESULT_TTL_SECONDS | Audit status cache TTL | 1800 |
| RABBITMQ_HOST | RabbitMQ host | localhost |
| RABBITMQ_PORT | RabbitMQ port | 5672 |
| RABBITMQ_USER | RabbitMQ user | guest |
| RABBITMQ_PASSWORD | RabbitMQ password | guest |
| RABBITMQ_VHOST | RabbitMQ virtual host | / |
| RABBITMQ_HEARTBEAT | Rabbit connection heartbeat | 600 |
| RABBITMQ_BLOCKED_TIMEOUT | Block timeout in seconds | 300 |
| RABBITMQ_EXCHANGE | Direct exchange name | fmcg.direct |
| RABBITMQ_AUDIT_QUEUE | Queue for audit jobs | audit.jobs |
| RABBITMQ_AUDIT_FAILED_QUEUE | Queue for terminal failures | audit.jobs.failed |
| RABBITMQ_MAX_RETRIES | Max worker retry attempts | 3 |
| AUDIT_INPUT_DIR | Saved uploaded/input images | uploads/audit |
| AUDIT_OUTPUT_DIR | Saved annotated images | outputs/audit |
| MODEL_CACHE_SIZE | Max loaded YOLO models in memory | 10 |
| MODEL_MAX_IDLE_SECONDS | Model idle eviction timeout | 900 |

---

## 🔌 API Endpoints

Base prefix: `/api/v1`

### Product Codes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/product-codes/` | Create product code |
| GET | `/product-codes/` | List product codes (`skip`, `limit<=200`) |
| GET | `/product-codes/search/` | Search by partial code (`q`) |
| GET | `/product-codes/by-code/{product_code}` | Get by code |
| GET | `/product-codes/{code_id}` | Get by id |
| PUT | `/product-codes/by-code/{product_code}` | Update by code |
| PUT | `/product-codes/{code_id}` | Update by id |
| DELETE | `/product-codes/by-code/{product_code}` | Delete by code |
| DELETE | `/product-codes/{code_id}` | Delete by id |

Create example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/product-codes/" \
	-H "Content-Type: application/json" \
	-d '{"product_code":"DEMO","description":"Beverage shelf audit"}'
```

### Products

| Method | Endpoint | Description |
|---|---|---|
| POST | `/products/` | Create product |
| POST | `/products/bulk` | Bulk create products |
| GET | `/products/` | List products (`skip`, `limit<=200`) |
| GET | `/products/search/` | Search (`product_code_id`, `name`, `brand`, `category`, `type`) |
| GET | `/products/by-name/{product_name}` | Get by name |
| GET | `/products/{product_id}` | Get by id |
| PUT | `/products/by-name/{product_name}` | Update by name |
| PUT | `/products/{product_id}` | Update by id |
| DELETE | `/products/by-name/{product_name}` | Delete by name |
| DELETE | `/products/{product_id}` | Delete by id |

Create example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/products/" \
	-H "Content-Type: application/json" \
	-d '{
		"product_code_id": 1,
		"product_name": "Pepsi 250ml",
		"brand": "Pepsi",
		"category": "Beverages",
		"ai_code": "pepsi_250ml",
		"type": "competitor"
	}'
```

### Models

| Method | Endpoint | Description |
|---|---|---|
| POST | `/models/` | Register model |
| GET | `/models/` | List models (`skip`, `limit<=200`) |
| GET | `/models/by-product-code/{product_code_id}` | Models by product code id |
| GET | `/models/by-name/{model_name}` | Get model by name |
| GET | `/models/{model_id}` | Get model by id |
| PUT | `/models/by-name/{model_name}` | Update model by name |
| PUT | `/models/{model_id}` | Update model by id |
| DELETE | `/models/by-name/{model_name}` | Delete model by name |
| DELETE | `/models/{model_id}` | Delete model by id |

Register model example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/models/" \
	-H "Content-Type: application/json" \
	-d '{
		"product_code_id": 1,
		"model_name": "yolo26",
		"model_path": "ml_models/yolo26m.pt",
		"image_size": 640,
		"conf_threshold": 0.25,
		"iou_threshold": 0.45
	}'
```

### Audit

| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit/` | List audits (`product_code`, `status`, `skip`, `limit<=200`) |
| GET | `/audit/by-code` | Submit audit by image URL (queues async job) |
| POST | `/audit/by-code/upload` | Submit audit by file upload (queues async job) |
| GET | `/audit/{audit_id}` | Poll audit status/result |
| WS | `/audit/ws/{audit_id}` | Real-time status stream |
| GET | `/audit/image/{filename}` | Serve annotated output image |

Submit by URL example:

```bash
curl "http://127.0.0.1:8000/api/v1/audit/by-code?product_code=DEMO&image_url=https://example.com/shelf.jpg"
```

Submit by upload example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audit/by-code/upload" \
	-F "product_code=DEMO" \
	-F "file=@/path/to/shelf.jpg"
```

Poll example:

```bash
curl "http://127.0.0.1:8000/api/v1/audit/123"
```

WebSocket example:

```text
ws://127.0.0.1:8000/api/v1/audit/ws/123
```

---

## 🛠️ Troubleshooting

### 1) 422 on list endpoints
Cause: `limit` exceeds API max of 200.
Fix: keep `limit<=200` for `/products/`, `/models/`, `/product-codes/`, `/audit/`.

### 2) Redis connection refused
Cause: Redis not running.
Fix:

```bash
redis-cli ping
```

Expected: `PONG`.

### 3) Audit stuck in pending
Possible causes:
- Worker process not running
- RabbitMQ not reachable
- No model mapped to product code

Checks:
1. Worker terminal logs
2. RabbitMQ queue depth
3. Model registration for selected product code

### 4) Model load errors
Cause: invalid `model_path` or missing model file.
Fix: verify file exists and path is accessible from backend runtime.

### 5) Streamlit port already in use
Fix: run on a different port, for example:

```bash
streamlit run streamlit_app.py --server.port 8502
```

---

## ❤️ Made With

<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Made with FastAPI" />
  <img src="https://img.shields.io/badge/Powered%20by-Ultralytics%20YOLO-111827?style=for-the-badge&logo=python&logoColor=white" alt="Powered by YOLO" />
  <img src="https://img.shields.io/badge/Async-RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/Cached%20with-Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/UI-Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" alt="Streamlit" />
</p>

<p align="center">
  Built for real-world FMCG shelf intelligence, from data ops to inference ops.
</p>
