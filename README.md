# FMCG Insight 360

<p align="center">
	<img src="resources/FMCG_logo.png" alt="FMCG Insight 360 Logo" width="980" />
</p>

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&pause=1200&color=00B8D4&center=true&vCenter=true&width=1000&lines=FMCG+Shelf+Audit+Platform;FastAPI+%7C+RabbitMQ+%7C+Redis+%7C+PostgreSQL;Detection+Workflow+with+Streamlit+Ops+Console;Product+Codes+%7C+Products+%7C+Models+%7C+Audit+History" alt="FMCG Insight animated intro" />
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
	<img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
	<img src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
	<img src="https://img.shields.io/badge/RabbitMQ-Async-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
	<img src="https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
	<img src="https://img.shields.io/badge/Streamlit-Ops_UI-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" alt="Streamlit" />
</p>

<p align="center">
	<b>📦 Product Ops</b> · <b>🧠 ML Inference</b> · <b>⚡ Async Processing</b> · <b>📊 Audit Analytics</b>
</p>

<p align="center">
	<b>Production-style FMCG shelf audit platform for product visibility, async inference, and operations control.</b>
</p>

<p align="center">
	FastAPI backend · PostgreSQL persistence · RabbitMQ workers · Redis caching · YOLO inference · Streamlit ops console
</p>

FMCG Insight 360 combines a FastAPI backend, PostgreSQL storage, RabbitMQ-based background processing, Redis caching, and YOLO inference into a single shelf-audit workflow. The repository also includes a Streamlit operations console and an optional Next.js frontend for web-based usage.

## 🎯 Overview

The platform covers the full audit lifecycle:

1. Create a product code.
2. Map products to that product code.
3. Register one or more YOLO models.
4. Submit a shelf image by URL or file upload.
5. Queue the audit in RabbitMQ.
6. Process inference in the worker.
7. Persist results in PostgreSQL and cache repeated reads in Redis.
8. Review status, history, and output artifacts in the UI.

## ✨ Highlights

- FastAPI REST and WebSocket APIs for audit orchestration.
- RabbitMQ-backed asynchronous inference workflow.
- Redis caching for completed audit reads and lookup acceleration.
- YOLO-based detection pipeline with in-memory model caching.
- Streamlit admin and operations console.
- Optional Next.js frontend in `frontend/`.
- Support for both image-URL and file-upload audit submission.

## 📚 Table of Contents

1. [Architecture](#architecture)
2. [Technology Stack](#technology-stack)
3. [Repository Layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Configuration](#environment-configuration)
7. [Run Modes](#run-modes)
8. [Smoke Test](#smoke-test)
9. [First Audit Checklist](#first-audit-checklist)
10. [🔌 API Documentation](#-api-documentation)
    - [Product Codes API](#-product-codes-api)
    - [Products API](#-products-api)
    - [Models API](#-models-api)
    - [Audit API](#-audit-api)
    - [Error Responses](#-error-response-format)
    - [How to Use with Postman](#-how-to-use-apis-with-postman)
11. [Environment Variables](#environment-variables)
12. [Screenshots](#screenshots)
13. [Troubleshooting](#troubleshooting)

## 🧠 Architecture

```mermaid
flowchart LR
		UI[Streamlit UI] --> API[FastAPI API]
		WEB[Optional Next.js Frontend] --> API
		API --> DB[(PostgreSQL)]
		API --> RMQ[(RabbitMQ)]
		API --> REDIS[(Redis)]
		RMQ --> WORKER[Audit Worker]
		WORKER --> MODEL[YOLO Model Service]
		MODEL --> INF[Inference Service]
		INF --> DB
		INF --> OUT[outputs/audit]
```

Operational flow:

1. The client submits an audit request.
2. FastAPI validates the payload and creates an audit record.
3. The API publishes the audit job to RabbitMQ.
4. The worker consumes the message and runs inference.
5. Results are written to PostgreSQL.
6. Completed responses may be cached in Redis.
7. Streamlit or the optional web frontend reads audit status and artifacts.

## 🧱 Technology Stack

| Layer | Technology |
|---|---|
| API | FastAPI, Uvicorn |
| Database | PostgreSQL, SQLAlchemy 2 |
| Queue | RabbitMQ, Pika |
| Cache | Redis |
| ML | Ultralytics YOLO, OpenCV |
| Admin UI | Streamlit |
| Optional Web UI | Next.js 14, React 18 |

## 🗂️ Repository Layout

```text
FMCG-Insight-360/
├── .dockerignore
├── .env
├── .env.docker
├── .git/
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── environment.yml
├── README.md
├── requirements.txt
├── resources/
│   └── FMCG_logo.png
├── ml_models/
│   ├── yolo26m.pt
│   └── yolov26/
│       ├── config.json
│       └── yolo26m.pt
├── outputs/
│   └── audit/
├── uploads/
│   └── audit/
├── logs/
│   └── FMCG-Insight-360.log
├── monitoring/
│   ├── loki-config.yml
│   ├── prometheus.yml
│   ├── promtail-config.yml
│   ├── README.md
│   └── grafana/
│       ├── dashboards/
│       │   └── fmcg-dashboard.json
│       └── provisioning/
│           ├── dashboards/
│           │   └── dashboards.yml
│           └── datasources/
│               └── datasources.yml
├── streamlit_app.py
├── frontend/
│   ├── next-env.d.ts
│   ├── next.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── audit/
│       │   │   └── [id]/page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── history/page.tsx
│       │   └── product-codes/page.tsx
│       ├── components/
│       │   ├── AuditConsole.tsx
│       │   ├── AuditHistoryTable.tsx
│       │   ├── ErrorBox.tsx
│       │   ├── ProductCodeManager.tsx
│       │   └── Skeleton.tsx
│       └── lib/
│           ├── api.ts
│           ├── history.ts
│           └── ws.ts
└── app/
    ├── __init__.py
    ├── api/
    │   └── v1/
    │       ├── __init__.py
    │       ├── router.py
    │       └── endpoints/
    │           ├── __init__.py
    │           ├── audit.py
    │           ├── models.py
    │           ├── product_codes.py
    │           └── products.py
    ├── core/
    │   ├── __init__.py
    │   ├── config.py
    │   ├── context.py
    │   ├── database.py
    │   ├── logger.py
    │   └── metrics.py
    ├── models/
    │   ├── __init__.py
    │   ├── audit_result.py
    │   ├── model.py
    │   ├── product.py
    │   └── product_code.py
    ├── repositories/
    │   ├── __init__.py
    │   ├── audit_repo.py
    │   ├── model_repo.py
    │   └── product_repo.py
    ├── schemas/
    │   ├── __init__.py
    │   ├── audit.py
    │   ├── error.py
    │   ├── model.py
    │   ├── product.py
    │   └── product_code.py
    ├── services/
    │   ├── __init__.py
    │   ├── audit_service.py
    │   ├── inference_service.py
    │   ├── model_service.py
    │   ├── rabbitmq_service.py
    │   └── redis_cache.py
    ├── utils/
    │   ├── __init__.py
    │   ├── file_handler.py
    │   └── model_cache.py
    ├── workers/
    │   ├── __init__.py
    │   └── worker.py
    └── main.py
```

## ✅ Prerequisites

Install or make available the following before setup:

- Git
- Conda or Miniconda
- Python 3.10
- PostgreSQL
- RabbitMQ
- Redis
- Optional: Node.js 18+ and npm if you want to run the Next.js frontend in `frontend/`
- Optional: Docker if you prefer to run infrastructure services in containers

Recommended local-development baseline:

- Conda environment name: `fmcg`
- Python version: `3.10`
- PostgreSQL on port `5432`
- RabbitMQ on port `5672`
- Redis on port `6379`

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/VijayRajput4455/FMCG-Insight-360.git
cd FMCG-Insight-360
```

### 2. Create the Conda environment

Recommended:

```bash
conda env create -f environment.yml
conda activate fmcg
```

Manual alternative:

```bash
conda create -n fmcg python=3.10 -y
conda activate fmcg
pip install -r requirements.txt
pip install ultralytics
```

### 3. Prepare PostgreSQL

Example SQL:

```sql
CREATE DATABASE fmcg_db;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE fmcg_db TO admin;
```

### 4. Start RabbitMQ

Local service:

```bash
sudo systemctl start rabbitmq-server
```

Docker alternative:

```bash
docker run -d --name fmcg-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 5. Start Redis

Local service:

```bash
sudo systemctl start redis-server
```

Conda-based alternative:

```bash
conda install -n fmcg -c conda-forge redis-server -y
conda run -n fmcg redis-server --daemonize yes
```

### 6. Optional: run infrastructure with Docker

If you do not want local PostgreSQL, RabbitMQ, and Redis installations, you can run the required infrastructure with Docker instead:

```bash
docker run -d --name fmcg-postgres \
	-e POSTGRES_DB=fmcg_db \
	-e POSTGRES_USER=admin \
	-e POSTGRES_PASSWORD=admin123 \
	-p 5432:5432 \
	postgres:16

docker run -d --name fmcg-rabbitmq \
	-p 5672:5672 \
	-p 15672:15672 \
	rabbitmq:3-management

docker run -d --name fmcg-redis \
	-p 6379:6379 \
	redis:7
```

If you use these defaults, the example `.env` values below work without changes.

### 6B. Full Dockerized App (API + Worker + Infra)

This repository now includes a full containerized stack using `Dockerfile`, `docker-compose.yml`, and `.env.docker`.

```bash
docker compose up --build -d
```

Useful commands:

```bash
# See all services
docker compose ps

# API logs
docker compose logs -f api

# Worker logs
docker compose logs -f worker

# Stop everything
docker compose down
```

Endpoints after startup:

- API: `http://localhost:8000`
- RabbitMQ management: `http://localhost:15672` (guest/guest)

Notes:

- The Docker stack uses `.env.docker` with container hostnames (`postgres`, `redis`, `rabbitmq`).
- `AUTO_START_WORKER=false` in Docker because worker runs as a separate container.

### 7. Create `.env`

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://admin:admin123@localhost:5432/fmcg_db
LOG_LEVEL=INFO

AUTO_START_WORKER=true

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

## ⚙️ Environment Configuration

Local recommendation:

- Use `AUTO_START_WORKER=true` for the simplest developer setup.
- Use `AUTO_START_WORKER=false` when you want the worker in a separate terminal or deployment unit.
- The application currently creates database tables on startup for development convenience.

Important behavior:

- If `AUTO_START_WORKER=true`, starting `uvicorn` also starts the embedded worker thread.
- If `AUTO_START_WORKER=false`, you must run `python -m app.workers.worker` separately.
- Do not run both embedded and separate worker modes together unless you intentionally want multiple consumers.

## ▶️ Run Modes

### Option A. Recommended local mode

Use this when you want the fastest local setup.

Terminal 1: FastAPI backend and embedded worker

```bash
conda activate fmcg
uvicorn app.main:app --reload --port 8000
```

Terminal 2: Streamlit UI

```bash
conda activate fmcg
streamlit run streamlit_app.py --server.port 8501
```

Optional Terminal 3: Next.js frontend

```bash
cd frontend
npm install
npm run dev
```

### Option B. Separate worker mode

Use this when you want clearer process separation or when preparing for scaled deployment.

Set this in `.env` first:

```env
AUTO_START_WORKER=false
```

Terminal 1: FastAPI backend

```bash
conda activate fmcg
uvicorn app.main:app --reload --port 8000
```

Terminal 2: Worker

```bash
conda activate fmcg
python -m app.workers.worker
```

Terminal 3: Streamlit UI

```bash
conda activate fmcg
streamlit run streamlit_app.py --server.port 8501
```

Optional Terminal 4: Next.js frontend

```bash
cd frontend
npm install
npm run dev
```

Useful URLs:

- API root: `http://127.0.0.1:8000/`
- FastAPI docs: `http://127.0.0.1:8000/docs`
- Streamlit UI: `http://127.0.0.1:8501`
- Next.js frontend: `http://127.0.0.1:3000`
- RabbitMQ management UI: `http://127.0.0.1:15672`

## 🧪 Smoke Test

After startup, verify the stack in this order.

### 1. API health

```bash
curl http://127.0.0.1:8000/
```

Expected response:

```json
{"status":"OK"}
```

### 2. Database connectivity

```bash
curl http://127.0.0.1:8000/test-db
```

Expected response:

```json
{"status":"DB connected successfully"}
```

### 3. FastAPI docs availability

Open:

```text
http://127.0.0.1:8000/docs
```

### 4. Product-code endpoint availability

```bash
curl http://127.0.0.1:8000/api/v1/product-codes/
```

If this responds without infrastructure errors, the API stack is in usable shape.

## 📋 First Audit Checklist

Before testing a real audit, complete these steps in order:

1. Create a product code.
2. Create one or more products linked to that product code.
3. Register a model whose `model_path` points to a valid file in `ml_models/`.
4. Submit an audit by image URL or file upload.

Example sequence:

Create a product code:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/product-codes/" \
	-H "Content-Type: application/json" \
	-d '{"product_code":"DEMO","description":"Beverage shelf audit"}'
```

Create a product:

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

Register a model:

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

Submit an audit by URL:

```bash
curl "http://127.0.0.1:8000/api/v1/audit/by-code?product_code=DEMO&image_url=https://example.com/shelf.jpg"
```

Submit an audit by upload:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audit/by-code/upload" \
	-F "product_code=DEMO" \
	-F "file=@/path/to/shelf.jpg"
```

Poll the audit:

```bash
curl "http://127.0.0.1:8000/api/v1/audit/123"
```

## 🔌 API Documentation

Base URL: `http://localhost:8000/api/v1`

### 📌 Endpoint Quick Reference

| 🏷️ Resource | 📝 Method | 🔗 Endpoint | 📋 Description |
|---|---|---|---|
| **Product Codes** | `POST` | `/product-codes/` | Create product code |
| | `GET` | `/product-codes/` | List all product codes |
| | `GET` | `/product-codes/search/` | Search product codes |
| | `GET` | `/product-codes/by-code/{product_code}` | Get by code name |
| | `GET` | `/product-codes/{code_id}` | Get by ID |
| | `PUT` | `/product-codes/by-code/{product_code}` | Update by code |
| | `DELETE` | `/product-codes/by-code/{product_code}` | Delete by code |
| **Products** | `POST` | `/products/` | Create single product |
| | `POST` | `/products/bulk` | Create multiple products |
| | `GET` | `/products/` | List all products |
| | `GET` | `/products/search/` | Search with filters |
| | `GET` | `/products/by-name/{product_name}` | Get by name |
| | `GET` | `/products/{product_id}` | Get by ID |
| | `PUT` | `/products/by-name/{product_name}` | Update by name |
| | `PUT` | `/products/{product_id}` | Update by ID |
| | `DELETE` | `/products/by-name/{product_name}` | Delete by name |
| | `DELETE` | `/products/{product_id}` | Delete by ID |
| **Models** | `POST` | `/models/` | Register YOLO model |
| | `GET` | `/models/` | List all models |
| | `GET` | `/models/by-product-code/{product_code_id}` | Get by product code |
| | `GET` | `/models/by-name/{model_name}` | Get by name |
| | `GET` | `/models/{model_id}` | Get by ID |
| | `PUT` | `/models/by-name/{model_name}` | Update by name |
| | `PUT` | `/models/{model_id}` | Update by ID |
| | `DELETE` | `/models/by-name/{model_name}` | Delete by name |
| **Audit** | `GET` | `/audit/` | List audits with filters |
| | `GET` | `/audit/by-code` | Submit audit (URL) |
| | `POST` | `/audit/by-code/upload` | Submit audit (upload) |
| | `GET` | `/audit/{audit_id}` | Get audit status |
| | `WS` | `/audit/ws/{audit_id}` | WebSocket: Real-time updates |
| | `GET` | `/audit/image/{filename}` | Download annotated image |

---

## 🧭 Route Mapping

The API router is configured in `app/api/v1/router.py`.
The following route prefixes are mounted under the base API path `/api/v1`.

| Prefix | Router Module | Function |
|---|---|---|
| `/products` | `app.api.v1.endpoints.products` | Product CRUD and search |
| `/product-codes` | `app.api.v1.endpoints.product_codes` | Product code CRUD and search |
| `/models` | `app.api.v1.endpoints.models` | Model registration and management |
| `/audit` | `app.api.v1.endpoints.audit` | Audit submission, status, WebSocket, images |

**Example:**
- `app/api/v1/router.py` includes `products.router` with `prefix='/products'`
- Therefore the full URL for product creation is `http://localhost:8000/api/v1/products/`

---

## 📦 Product Codes API

Manage brand/product code identifiers.

### ✅ Create Product Code
**POST** `/product-codes/`

**Description:** Create a new product code (e.g., "PEPSI", "AMUL").

**Request Body:**
```json
{
  "product_code": "PEPSI",
  "description": "Pepsi brand beverages - Cola category"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `product_code` | string | ✅ Yes | 1-50 chars, alphanumeric + `-` `_` |
| `description` | string | ❌ No | Max 500 chars |

**Response (201):**
```json
{
  "id": 1,
  "product_code": "PEPSI",
  "description": "Pepsi brand beverages - Cola category",
  "created_at": "2026-05-14T10:30:45.123456"
}
```

**Error Responses:**
- **400** - Product code already exists
- **422** - Validation error (invalid format)

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/
Method: POST
Headers: Content-Type: application/json
Body (raw JSON):
{
  "product_code": "PEPSI",
  "description": "Cola beverages"
}
```

---

### 📋 List All Product Codes
**GET** `/product-codes/`

**Description:** Retrieve all product codes with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `skip` | integer | 0 | Number of records to skip |
| `limit` | integer | 50 | Max records to return (1-200) |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code": "PEPSI",
    "description": "Cola beverages",
    "created_at": "2026-05-14T10:30:45.123456"
  },
  {
    "id": 2,
    "product_code": "AMUL",
    "description": "Dairy products",
    "created_at": "2026-05-14T10:31:20.654321"
  }
]
```

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/?skip=0&limit=50
Method: GET
```

---

### 🔍 Search Product Codes
**GET** `/product-codes/search/`

**Description:** Search product codes by partial name.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ Yes | Partial product code (min 1 char) |
| `skip` | integer | ❌ No | Skip records (default: 0) |
| `limit` | integer | ❌ No | Limit results (default: 50) |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code": "PEPSI",
    "description": "Cola beverages",
    "created_at": "2026-05-14T10:30:45.123456"
  }
]
```

**Error Responses:**
- **422** - Missing or invalid `q` parameter

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/search/?q=PEP
Method: GET
```

---

### 🎯 Get Product Code by Code
**GET** `/product-codes/by-code/{product_code}`

**Description:** Fetch a specific product code by name.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `product_code` | string | Product code name (e.g., "PEPSI") |

**Response (200):**
```json
{
  "id": 1,
  "product_code": "PEPSI",
  "description": "Cola beverages",
  "created_at": "2026-05-14T10:30:45.123456"
}
```

**Error Responses:**
- **404** - Product code not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/by-code/PEPSI
Method: GET
```

---

### 🎯 Get Product Code by ID
**GET** `/product-codes/{code_id}`

**Description:** Fetch a specific product code by numeric ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `code_id` | integer | Product code ID |

**Response (200):**
```json
{
  "id": 1,
  "product_code": "PEPSI",
  "description": "Cola beverages",
  "created_at": "2026-05-14T10:30:45.123456"
}
```

**Error Responses:**
- **404** - Product code not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/1
Method: GET
```

---

### ✏️ Update Product Code
**PUT** `/product-codes/by-code/{product_code}`

**Description:** Update a product code and/or its description.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `product_code` | string | Current product code name |

**Request Body:**
```json
{
  "product_code": "PEPSI_COLA",
  "description": "Updated description"
}
```

| Field | Type | Required |
|---|---|---|
| `product_code` | string | ❌ No |
| `description` | string | ❌ No |

**Response (200):**
```json
{
  "id": 1,
  "product_code": "PEPSI_COLA",
  "description": "Updated description",
  "created_at": "2026-05-14T10:30:45.123456"
}
```

**Error Responses:**
- **400** - New product code already exists
- **404** - Product code not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/by-code/PEPSI
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "description": "Updated cola beverages"
}
```

---

### ✏️ Update Product Code by ID
**PUT** `/product-codes/{code_id}`

**Description:** Update a product code by its numeric ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `code_id` | integer | Product code ID |

**Request Body:**
```json
{
  "product_code": "PEPSI_COLA",
  "description": "Updated description"
}
```

| Field | Type | Required |
|---|---|---|
| `product_code` | string | ❌ No |
| `description` | string | ❌ No |

**Response (200):**
```json
{
  "id": 1,
  "product_code": "PEPSI_COLA",
  "description": "Updated description",
  "created_at": "2026-05-14T10:30:45.123456"
}
```

**Error Responses:**
- **400** - New product code already exists
- **404** - Product code not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/1
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "product_code": "PEPSI_COLA"
}
```

---

### 🗑️ Delete Product Code
**DELETE** `/product-codes/by-code/{product_code}`

**Description:** Delete a product code.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `product_code` | string | Product code to delete |

**Response (200):**
```json
{
  "message": "Product code deleted successfully"
}
```

**Error Responses:**
- **404** - Product code not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/by-code/PEPSI
Method: DELETE
```

---

### 🗑️ Delete Product Code by ID
**DELETE** `/product-codes/{code_id}`

**Description:** Delete a product code by its numeric ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `code_id` | integer | Product code ID |

**Response (200):**
```json
{
  "message": "Product code deleted successfully"
}
```

**Error Responses:**
- **404** - Product code not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/product-codes/1
Method: DELETE
```

---

## 📦 Products API

Manage individual products linked to product codes.

### ✅ Create Single Product
**POST** `/products/`

**Description:** Create a new product (e.g., "Pepsi 250ml").

**Request Body:**
```json
{
  "product_code_id": 1,
  "product_name": "Pepsi 250ml",
  "brand": "Pepsi",
  "category": "Beverages",
  "ai_code": "pepsi_250ml",
  "type": "competitor"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `product_code_id` | integer | ✅ Yes | Must be valid product code ID |
| `product_name` | string | ✅ Yes | 1-100 chars, must be unique |
| `brand` | string | ❌ No | Max 100 chars |
| `category` | string | ❌ No | Max 100 chars |
| `ai_code` | string | ❌ No | Max 50 chars (internal AI reference) |
| `type` | enum | ❌ No | `"own"` or `"competitor"` |

**Response (201):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "product_name": "Pepsi 250ml",
  "brand": "Pepsi",
  "category": "Beverages",
  "ai_code": "pepsi_250ml",
  "type": "competitor",
  "created_at": "2026-05-14T10:35:22.123456"
}
```

**Error Responses:**
- **400** - Invalid `product_code_id` or product already exists
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/
Method: POST
Headers: Content-Type: application/json
Body:
{
  "product_code_id": 1,
  "product_name": "Pepsi 250ml",
  "brand": "Pepsi",
  "category": "Beverages",
  "type": "competitor"
}
```

---

### 📦 Bulk Create Products
**POST** `/products/bulk`

**Description:** Create multiple products at once. Validates all items first, then atomically commits (all or nothing).

**Request Body:**
```json
[
  {
    "product_code_id": 1,
    "product_name": "Pepsi 250ml",
    "brand": "Pepsi",
    "category": "Beverages",
    "type": "competitor"
  },
  {
    "product_code_id": 1,
    "product_name": "Coca-Cola 250ml",
    "brand": "Coca-Cola",
    "category": "Beverages",
    "type": "competitor"
  }
]
```

**Response (201):**
```json
{
  "created": [
    {
      "id": 1,
      "product_code_id": 1,
      "product_name": "Pepsi 250ml",
      "brand": "Pepsi",
      "category": "Beverages",
      "type": "competitor",
      "created_at": "2026-05-14T10:36:10.123456"
    },
    {
      "id": 2,
      "product_code_id": 1,
      "product_name": "Coca-Cola 250ml",
      "brand": "Coca-Cola",
      "category": "Beverages",
      "type": "competitor",
      "created_at": "2026-05-14T10:36:10.654321"
    }
  ],
  "skipped": []
}
```

**Response with Duplicates (201):**
```json
{
  "created": [
    {
      "id": 1,
      "product_code_id": 1,
      "product_name": "Pepsi 250ml",
      ...
    }
  ],
  "skipped": ["Coca-Cola 250ml"]
}
```

**Error Responses:**
- **400** - Invalid `product_code_id` for one or more items
- **500** - Transaction rollback (all changes reverted)
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/bulk
Method: POST
Headers: Content-Type: application/json
Body (raw JSON array):
[
  {
    "product_code_id": 1,
    "product_name": "Sprite 250ml",
    "brand": "Sprite",
    "category": "Beverages"
  },
  {
    "product_code_id": 1,
    "product_name": "Fanta 250ml",
    "brand": "Fanta",
    "category": "Beverages"
  }
]
```

---

### 📋 List All Products
**GET** `/products/`

**Description:** Get all products with pagination.

**Query Parameters:**
| Parameter | Type | Default |
|---|---|---|
| `skip` | integer | 0 |
| `limit` | integer | 50 |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code_id": 1,
    "product_name": "Pepsi 250ml",
    "brand": "Pepsi",
    "category": "Beverages",
    "type": "competitor",
    "created_at": "2026-05-14T10:35:22.123456"
  }
]
```

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/?skip=0&limit=50
Method: GET
```

---

### 🔍 Search Products
**GET** `/products/search/`

**Description:** Advanced search with multiple filter options.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `product_code_id` | integer | Filter by product code ID |
| `name` | string | Partial product name search |
| `brand` | string | Partial brand search |
| `category` | string | Partial category search |
| `type` | string | Filter: `"own"` or `"competitor"` |
| `skip` | integer | Skip records (default: 0) |
| `limit` | integer | Limit results (default: 50) |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code_id": 1,
    "product_name": "Pepsi 250ml",
    "brand": "Pepsi",
    "category": "Beverages",
    "type": "competitor",
    "created_at": "2026-05-14T10:35:22.123456"
  }
]
```

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/search/?product_code_id=1&brand=Pepsi&type=competitor
Method: GET
```

---

### ✏️ Update Product
**PUT** `/products/{product_id}`

**Description:** Update a product by ID.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `product_id` | integer |

**Request Body:** (all fields optional)
```json
{
  "product_name": "Pepsi 500ml",
  "brand": "Pepsi",
  "category": "Beverages",
  "type": "own"
}
```

**Response (200):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "product_name": "Pepsi 500ml",
  "brand": "Pepsi",
  "category": "Beverages",
  "type": "own",
  "created_at": "2026-05-14T10:35:22.123456"
}
```

**Error Responses:**
- **400** - Duplicate product name or invalid `product_code_id`
- **404** - Product not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/1
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "product_name": "Pepsi 500ml"
}
```

---

### 🗑️ Delete Product
**DELETE** `/products/{product_id}`

**Description:** Delete a product by ID.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `product_id` | integer |

**Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

**Error Responses:**
- **404** - Product not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/products/1
Method: DELETE
```

---

## ⚙️ Models API

Manage YOLO detection models.

### ✅ Create/Register Model
**POST** `/models/`

**Description:** Register a YOLO model for a product code.

**Request Body:**
```json
{
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.25,
  "iou_threshold": 0.45
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `product_code_id` | integer | ✅ Yes | Valid product code ID |
| `model_name` | string | ✅ Yes | 1-100 chars, unique per product code |
| `model_path` | string | ✅ Yes | 1-500 chars (path to .pt file) |
| `image_size` | integer | ❌ No | 320-2048 (default: 1280) |
| `conf_threshold` | float | ❌ No | 0.0-1.0 (default: 0.25) |
| `iou_threshold` | float | ❌ No | 0.0-1.0 (default: 0.45) |

**Response (201):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.25,
  "iou_threshold": 0.45,
  "created_at": "2026-05-14T10:40:00.123456"
}
```

**Error Responses:**
- **400** - Invalid `product_code_id` or model already exists
- **422** - Validation error (threshold out of range, etc.)

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/
Method: POST
Headers: Content-Type: application/json
Body:
{
  "product_code_id": 1,
  "model_name": "yolo_v8_large",
  "model_path": "ml_models/yolov8l.pt",
  "image_size": 800,
  "conf_threshold": 0.3,
  "iou_threshold": 0.5
}
```

---

### 📋 List All Models
**GET** `/models/`

**Description:** Get all registered models with pagination.

**Query Parameters:**
| Parameter | Type | Default |
|---|---|---|
| `skip` | integer | 0 |
| `limit` | integer | 50 |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code_id": 1,
    "model_name": "yolo26m",
    "model_path": "ml_models/yolo26m.pt",
    "image_size": 640,
    "conf_threshold": 0.25,
    "iou_threshold": 0.45,
    "created_at": "2026-05-14T10:40:00.123456"
  }
]
```

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/?skip=0&limit=50
Method: GET
```

---

### 🔎 Get Model by Name
**GET** `/models/by-name/{model_name}`

**Description:** Fetch a model by its name.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `model_name` | string | Model name |

**Response (200):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.25,
  "iou_threshold": 0.45,
  "created_at": "2026-05-14T10:40:00.123456"
}
```

**Error Responses:**
- **404** - Model not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/by-name/yolo26m
Method: GET
```

---

### ✏️ Update Model by Name
**PUT** `/models/by-name/{model_name}`

**Description:** Update a model record by its name.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `model_name` | string | Model name |

**Request Body:** (all fields optional)
```json
{
  "product_code_id": 1,
  "model_path": "ml_models/yolo26m.pt",
  "conf_threshold": 0.30
}
```

**Response (200):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.30,
  "iou_threshold": 0.45,
  "created_at": "2026-05-14T10:40:00.123456"
}
```

**Error Responses:**
- **400** - Invalid `product_code_id` or duplicate model
- **404** - Model not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/by-name/yolo26m
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "conf_threshold": 0.35
}
```

---

### ✏️ Update Model by ID
**PUT** `/models/{model_id}`

**Description:** Update a model record by its numeric ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `model_id` | integer | Model ID |

**Request Body:** (all fields optional)
```json
{
  "conf_threshold": 0.30,
  "iou_threshold": 0.50
}
```

**Response (200):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.30,
  "iou_threshold": 0.50,
  "created_at": "2026-05-14T10:40:00.123456"
}
```

**Error Responses:**
- **400** - Invalid `product_code_id` or duplicate model
- **404** - Model not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/1
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "conf_threshold": 0.35
}
```

---

### 🗑️ Delete Model by ID
**DELETE** `/models/{model_id}`

**Description:** Delete a model by its numeric ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `model_id` | integer | Model ID |

**Response (200):**
```json
{
  "message": "Model deleted successfully"
}
```

**Error Responses:**
- **404** - Model not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/1
Method: DELETE
```

---

### 🔍 Get Models by Product Code
**GET** `/models/by-product-code/{product_code_id}`

**Description:** Get all models linked to a specific product code.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `product_code_id` | integer |

**Response (200):**
```json
[
  {
    "id": 1,
    "product_code_id": 1,
    "model_name": "yolo26m",
    "model_path": "ml_models/yolo26m.pt",
    "image_size": 640,
    "conf_threshold": 0.25,
    "iou_threshold": 0.45,
    "created_at": "2026-05-14T10:40:00.123456"
  }
]
```

**Error Responses:**
- **404** - Product code not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/by-product-code/1
Method: GET
```

---

### ✏️ Update Model
**PUT** `/models/{model_id}`

**Description:** Update model parameters.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `model_id` | integer |

**Request Body:** (all fields optional)
```json
{
  "conf_threshold": 0.30,
  "iou_threshold": 0.50
}
```

**Response (200):**
```json
{
  "id": 1,
  "product_code_id": 1,
  "model_name": "yolo26m",
  "model_path": "ml_models/yolo26m.pt",
  "image_size": 640,
  "conf_threshold": 0.30,
  "iou_threshold": 0.50,
  "created_at": "2026-05-14T10:40:00.123456"
}
```

**Error Responses:**
- **400** - Invalid values or duplicate model
- **404** - Model not found
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/1
Method: PUT
Headers: Content-Type: application/json
Body:
{
  "conf_threshold": 0.35
}
```

---

### 🗑️ Delete Model
**DELETE** `/models/by-name/{model_name}`

**Description:** Delete a model by name.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `model_name` | string |

**Response (200):**
```json
{
  "message": "Model deleted successfully"
}
```

**Error Responses:**
- **404** - Model not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/models/by-name/yolo26m
Method: DELETE
```

---

## 📊 Audit API

Submit shelf audit jobs and retrieve results.

### 📝 List Audits
**GET** `/audit/`

**Description:** List all audits with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `product_code` | string | Filter by product code (partial match) |
| `status` | string | Filter: `"pending"`, `"processing"`, `"completed"`, `"failed"` |
| `skip` | integer | Skip records (default: 0) |
| `limit` | integer | Limit results (default: 50) |

**Response (200):**
```json
[
  {
    "id": 1,
    "audit_id": 1,
    "product_code": "PEPSI",
    "status": "completed",
    "created_at": "2026-05-14T10:45:00.123456",
    "error_message": null
  },
  {
    "id": 2,
    "audit_id": 2,
    "product_code": "PEPSI",
    "status": "pending",
    "created_at": "2026-05-14T10:46:15.654321",
    "error_message": null
  }
]
```

**Postman Example:**
```
URL: http://localhost:8000/api/v1/audit/?product_code=PEPSI&status=completed&limit=20
Method: GET
```

---

### 🔥 Submit Audit (Image URL)
**GET** `/audit/by-code`

**Description:** Submit a shelf audit using a public image URL. Rate limited: 10 requests/minute per IP.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_code` | string | ✅ Yes | Product code (2+ chars) |
| `image_url` | string | ✅ Yes | Public image URL or `file://` path |

**Response (200):**
```json
{
  "audit_id": 1,
  "status": "pending",
  "message": "Audit job queued"
}
```

**Error Responses:**
- **400** - Invalid product code
- **429** - Rate limit exceeded (10 req/min per IP)
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/audit/by-code?product_code=PEPSI&image_url=https://example.com/shelf.jpg
Method: GET
```

**Alternative with local file:**
```
URL: http://localhost:8000/api/v1/audit/by-code?product_code=PEPSI&image_url=file:///path/to/image.jpg
Method: GET
```

---

### 📤 Submit Audit (File Upload)
**POST** `/audit/by-code/upload`

**Description:** Submit a shelf audit using file upload. Rate limited: 10 requests/minute per IP.

**Form Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `product_code` | string | ✅ Yes | Product code |
| `file` | file | ✅ Yes | Image file (JPG, PNG) |

**Response (200):**
```json
{
  "audit_id": 2,
  "status": "pending",
  "message": "Audit job queued"
}
```

**Error Responses:**
- **400** - Invalid product code or empty file
- **429** - Rate limit exceeded
- **422** - Validation error

**Postman Example:**
```
URL: http://localhost:8000/api/v1/audit/by-code/upload
Method: POST
Headers: (auto-set multipart/form-data)
Form Data:
  - product_code (text): PEPSI
  - file (file): [select image file]
```

---

### ✅ Get Audit Status & Result
**GET** `/audit/{audit_id}`

**Description:** Poll audit status and retrieve results when complete. Cached for 30 minutes after completion.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `audit_id` | integer |

**Response - Pending (200):**
```json
{
  "audit_id": 1,
  "status": "pending",
  "error_message": null
}
```

**Response - Completed (200):**
```json
{
  "audit_id": 1,
  "status": "completed",
  "error_message": null,
  "result_json": {
    "product_image_url": "http://localhost:8000/api/v1/audit/image/annotated_abc123.jpg",
    "image_name": "annotated_abc123.jpg",
    "detected_products": [
      {
        "name": "Pepsi 250ml",
        "confidence": 0.95,
        "count": 3
      }
    ],
    "total_product_count": 5,
    "total_self_count": 3,
    "total_competition_count": 2,
    "brand_counts": [
      {"brand": "Pepsi", "count": 3},
      {"brand": "Coca-Cola", "count": 2}
    ],
    "detection_coordinates": [
      {"x": 100, "y": 150, "width": 50, "height": 80}
    ]
  }
}
```

**Response - Failed (200):**
```json
{
  "audit_id": 1,
  "status": "failed",
  "error_message": "Model not found for product code"
}
```

**Error Responses:**
- **404** - Audit not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/audit/1
Method: GET
```

---

### 🌐 WebSocket: Real-time Status Updates
**WS** `/audit/ws/{audit_id}`

**Description:** Connect to WebSocket for real-time audit status updates.

**Connection:**
```
ws://localhost:8000/api/v1/audit/ws/1
```

**Message Sequence:**
```
1. Client connects to WS
2. Server sends: {"status": "pending", "message": "Processing..."}
3. Worker processes...
4. Server sends: {"status": "completed", "result_json": {...}}
5. Connection closes or client disconnects
```

**Sample Message:**
```json
{
  "status": "processing",
  "message": "Running YOLO inference...",
  "progress": 45
}
```

**Postman Example:**
1. Go to "New" → "WebSocket Request"
2. Enter URL: `ws://localhost:8000/api/v1/audit/ws/1`
3. Click "Connect"
4. View incoming messages in real-time

---

### 📥 Download Annotated Image
**GET** `/audit/image/{filename}`

**Description:** Download the annotated detection image from a completed audit.

**Path Parameters:**
| Parameter | Type |
|---|---|
| `filename` | string |

**Response (200):** Binary image file

**Error Responses:**
- **404** - Image not found

**Postman Example:**
```
URL: http://localhost:8000/api/v1/audit/image/annotated_abc123.jpg
Method: GET
(Response will be the image file - preview in browser or save)
```

---

## 📚 Error Response Format

All errors follow this consistent format:

**4xx/5xx Error Response:**
```json
{
  "detail": "Error description explaining what went wrong"
}
```

**Common Status Codes:**

| Code | Meaning | Example |
|---|---|---|
| **200** | ✅ Success | Request completed successfully |
| **201** | ✅ Created | Resource created successfully |
| **400** | ❌ Bad Request | Invalid input data or business logic error |
| **404** | ❌ Not Found | Resource doesn't exist |
| **422** | ❌ Validation Error | Invalid data type or format |
| **429** | ⚠️ Rate Limited | Too many requests (audit endpoints: 10/min per IP) |
| **500** | ❌ Server Error | Internal error (transaction rollback, etc.) |

---

## 🚀 How to Use APIs with Postman

### Step 1: Setup Postman Environment

1. **Open Postman** and create a new **Environment**
2. Add these variables:
   ```
   base_url: http://localhost:8000/api/v1
   product_code_id: 1
   product_id: 1
   model_id: 1
   audit_id: 1
   ```

3. **In your requests, use:** `{{base_url}}` instead of hardcoding URL

### Step 2: Test Workflow

1. **Create Product Code**
   - POST `{{base_url}}/product-codes/`
   - Body: `{"product_code": "DEMO", "description": "Demo"}`
   - Save the response ID → update `product_code_id` variable

2. **Create Product**
   - POST `{{base_url}}/products/`
   - Body: `{"product_code_id": {{product_code_id}}, "product_name": "Demo Product", ...}`
   - Save response ID → update `product_id` variable

3. **Register Model**
   - POST `{{base_url}}/models/`
   - Body: `{"product_code_id": {{product_code_id}}, "model_name": "yolo26m", ...}`
   - Save response ID → update `model_id` variable

4. **Submit Audit**
   - GET `{{base_url}}/audit/by-code?product_code=DEMO&image_url=https://example.com/image.jpg`
   - Save response `audit_id` → update variable

5. **Poll Status**
   - GET `{{base_url}}/audit/{{audit_id}}`
   - Repeat until `status` = "completed"

6. **Download Result Image**
   - Extract `product_image_url` from audit result
   - GET that URL to download the annotated image

### Step 3: Advanced Features

- **Bulk Import:** Use Postman's "Collections" feature to import a pre-built collection
- **Tests:** Add test scripts to auto-validate responses
- **Monitoring:** Set up Postman Monitor for scheduled API checks

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| DATABASE_URL | SQLAlchemy database URL | required |
| LOG_LEVEL | Global log verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | INFO |
| AUTO_START_WORKER | `true` starts the worker with `uvicorn`; `false` requires a separate worker process | false |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| REDIS_DB | Redis database index | 0 |
| REDIS_PASSWORD | Redis password | empty |
| REDIS_DEFAULT_TTL_SECONDS | Default cache TTL | 600 |
| REDIS_AUDIT_RESULT_TTL_SECONDS | Audit-result cache TTL | 1800 |
| RABBITMQ_HOST | RabbitMQ host | localhost |
| RABBITMQ_PORT | RabbitMQ port | 5672 |
| RABBITMQ_USER | RabbitMQ user | guest |
| RABBITMQ_PASSWORD | RabbitMQ password | guest |
| RABBITMQ_VHOST | RabbitMQ virtual host | / |
| RABBITMQ_HEARTBEAT | RabbitMQ heartbeat | 600 |
| RABBITMQ_BLOCKED_TIMEOUT | RabbitMQ blocked timeout | 300 |
| RABBITMQ_EXCHANGE | Exchange name | fmcg.direct |
| RABBITMQ_AUDIT_QUEUE | Primary audit queue | audit.jobs |
| RABBITMQ_AUDIT_FAILED_QUEUE | Failed-job queue | audit.jobs.failed |
| RABBITMQ_MAX_RETRIES | Maximum retry attempts | 3 |
| AUDIT_INPUT_DIR | Uploaded/input image directory | uploads/audit |
| AUDIT_OUTPUT_DIR | Annotated output directory | outputs/audit |
| MODEL_CACHE_SIZE | Maximum in-memory model cache size | 10 |
| MODEL_MAX_IDLE_SECONDS | Model idle eviction threshold | 900 |

## 🖼️ Screenshots

<p align="center">
	<img src="resources/workflow_preview.png" alt="Workflow Preview" width="900" />
</p>

<p align="center">
	<b>Workflow preview from the current project assets</b>
</p>

Current repository assets include the workflow preview above. If you export Streamlit or Next.js UI screenshots later, they can be added here as dedicated product views.

## 🛠️ Troubleshooting

### Common setup mistakes

These are the most common reasons a fresh setup fails:

- `DATABASE_URL` is missing or points to the wrong database.
- PostgreSQL, RabbitMQ, or Redis is not actually running.
- `AUTO_START_WORKER=true` is set, but a separate worker is also started manually.
- `AUTO_START_WORKER=false` is set, but no worker process is started.
- A model is not registered for the selected product code.
- `model_path` in the database does not match the actual file inside `ml_models/`.
- Users try audit endpoints before creating product code, product, and model records.

### API starts but audits stay pending

Check these first:

- RabbitMQ is running.
- The worker is actually running.
- `AUTO_START_WORKER` matches your chosen run mode.
- A model exists for the selected product code.

### Redis connection refused

Verify Redis:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

### Database connection errors

Common causes:

- Invalid `DATABASE_URL`
- PostgreSQL service not running
- Database or user not created yet

Check:

```bash
curl http://127.0.0.1:8000/test-db
```

### Model load failures

Verify that:

- The model file exists.
- The `model_path` stored in the database matches the real file path.
- The runtime environment can access `ml_models/`.

### Streamlit or frontend port already in use

Use a different port.

Streamlit example:

```bash
streamlit run streamlit_app.py --server.port 8502
```

Next.js example:

```bash
cd frontend
npm run dev -- --port 3001
```

## 📝 Notes for New Users

- Start with Option A unless you specifically need a separate worker process.
- Use the FastAPI docs at `/docs` for interactive testing.
- If you are only validating the backend, Streamlit and Next.js are optional.
- Verify health, DB, and product-code endpoints before attempting a full audit.
