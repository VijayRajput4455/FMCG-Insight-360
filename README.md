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
10. [API Summary](#api-summary)
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
├── frontend/
├── ml_models/
├── outputs/
├── resources/
├── uploads/
├── streamlit_app.py
├── environment.yml
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
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

## 🔌 API Summary

Base prefix: `/api/v1`

### Product Codes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/product-codes/` | Create product code |
| GET | `/product-codes/` | List product codes |
| GET | `/product-codes/search/` | Search by partial code |
| GET | `/product-codes/by-code/{product_code}` | Get by code |
| GET | `/product-codes/{code_id}` | Get by id |
| PUT | `/product-codes/by-code/{product_code}` | Update by code |
| PUT | `/product-codes/{code_id}` | Update by id |
| DELETE | `/product-codes/by-code/{product_code}` | Delete by code |
| DELETE | `/product-codes/{code_id}` | Delete by id |

### Products

| Method | Endpoint | Description |
|---|---|---|
| POST | `/products/` | Create product |
| POST | `/products/bulk` | Bulk create products |
| GET | `/products/` | List products |
| GET | `/products/search/` | Search products |
| GET | `/products/by-name/{product_name}` | Get by name |
| GET | `/products/{product_id}` | Get by id |
| PUT | `/products/by-name/{product_name}` | Update by name |
| PUT | `/products/{product_id}` | Update by id |
| DELETE | `/products/by-name/{product_name}` | Delete by name |
| DELETE | `/products/{product_id}` | Delete by id |

### Models

| Method | Endpoint | Description |
|---|---|---|
| POST | `/models/` | Register model |
| GET | `/models/` | List models |
| GET | `/models/by-product-code/{product_code_id}` | Models by product code |
| GET | `/models/by-name/{model_name}` | Get by name |
| GET | `/models/{model_id}` | Get by id |
| PUT | `/models/by-name/{model_name}` | Update by name |
| PUT | `/models/{model_id}` | Update by id |
| DELETE | `/models/by-name/{model_name}` | Delete by name |
| DELETE | `/models/{model_id}` | Delete by id |

### Audit

| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit/` | List audits |
| GET | `/audit/by-code` | Submit audit by image URL |
| POST | `/audit/by-code/upload` | Submit audit by file upload |
| GET | `/audit/{audit_id}` | Poll audit status/result |
| WS | `/audit/ws/{audit_id}` | Real-time status stream |
| GET | `/audit/image/{filename}` | Serve annotated image |

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
