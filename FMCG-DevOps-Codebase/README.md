# 🐳 FMCG DevOps & Docker Operations Guide

This directory contains the complete infrastructure orchestration, monitoring stack, and container initialization logic for the **FMCG Insight 360** multi-service platform.

---

## 📑 Table of Contents

- [Architectural Topology](#-architectural-topology)
- [Quick Service Access & Port Reference](#-quick-service-access--port-reference)
- [Essential Docker Commands (Everyday Use)](#-essential-docker-commands-everyday-use)
- [Managing Logs & Observability](#-managing-logs--observability)
- [Interactive Container Debugging & Shell Access](#-interactive-container-debugging--shell-access)
- [Targeted Service Operations](#-targeted-service-operations)
- [Hardware & GPU Acceleration (NVIDIA)](#-hardware--gpu-acceleration-nvidia)
- [Data Volumes & Storage Persistence](#-data-volumes--storage-persistence)
- [Clean Reset & Cache Purging](#-clean-reset--cache-purging)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏛️ Architectural Topology

The platform orchestrates **10 microservices** partitioned across two internal Docker networks (`backend` and `monitoring`):

```text
                                  ┌────────────────────────┐
                                  │   Next.js 14 Web UI    │ (Port 3000)
                                  └───────────┬────────────┘
                                              │ HTTP / WebSocket
                                              ▼
                                  ┌────────────────────────┐
                                  │   FastAPI REST API     │ (Port 8000)
                                  └─────┬──────┬─────┬─────┘
                                        │      │     │
                 ┌──────────────────────┘      │     └─────────────────────┐
                 ▼                             ▼                           ▼
        ┌──────────────────┐         ┌───────────────────┐       ┌──────────────────┐
        │  PostgreSQL 16   │         │    RabbitMQ 3.13  │       │     Redis 7      │
        │   (Port 5433)    │         │ (Port 5672/15672) │       │   (Port 6379)    │
        └──────────────────┘         └─────────┬─────────┘       └──────────────────┘
                                               │ Task Queue
                                               ▼
                                     ┌───────────────────┐
                                     │  AI Audit Worker  │
                                     │  (YOLO Inference) │
                                     └─────────┬─────────┘
                                               │ Media Storage
                                               ▼
                                     ┌───────────────────┐
                                     │     MinIO S3      │ (Port 9000 / 9001)
                                     └───────────────────┘

  [Monitoring Layer]: Prometheus (:9090) ──► Grafana (:3010) ◄── Loki (:3100) ◄── Promtail
```

---

## 🌐 Quick Service Access & Port Reference

Once the stack is running, access all services in your web browser:

| Service | Container Name | Host Port | Web Access URL | Default Credentials / Info |
|---|---|---|---|---|
| **🖥️ Frontend Console** | `fmcg-frontend` | `3000` | [http://localhost:3000](http://localhost:3000) | Main Operations Console |
| **⚡ FastAPI Backend** | `fmcg-api` | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger OpenAPI Docs |
| **🪣 MinIO S3 Console** | `fmcg-minio` | `9001` | [http://localhost:9001](http://localhost:9001) | User: `minioadmin` \| Pass: `minioadmin` |
| **🪣 MinIO S3 API** | `fmcg-minio` | `9000` | [http://localhost:9000](http://localhost:9000) | S3 Object Storage API Endpoint |
| **🐰 RabbitMQ Management** | `fmcg-rabbitmq` | `15672` | [http://localhost:15672](http://localhost:15672) | User: `guest` \| Pass: `guest` |
| **🐰 RabbitMQ AMQP** | `fmcg-rabbitmq` | `5672` | `amqp://guest:guest@localhost:5672` | Backend & Worker message broker |
| **📊 Grafana Dashboards** | `fmcg-grafana` | `3010` | [http://localhost:3010](http://localhost:3010) | User: `admin` \| Pass: `admin` |
| **📈 Prometheus Metrics** | `fmcg-prometheus` | `9090` | [http://localhost:9090](http://localhost:9090) | System & API Metrics Explorer |
| **🪵 Loki Log Server** | `fmcg-loki` | `3100` | [http://localhost:3100/ready](http://localhost:3100/ready) | Log ingestion & aggregation engine |
| **🐘 PostgreSQL Database** | `fmcg-postgres` | `5433` | `localhost:5433` | DB: `fmcg_db` \| User: `admin` \| Pass: `admin123` |
| **⚡ Redis Cache** | `fmcg-redis` | `6379` | `localhost:6379` | Cache, sessions & rate-limiting |

---

## 🚀 Essential Docker Commands (Everyday Use)

> **Execution Note:** You can run all commands directly from inside `FMCG-DevOps-Codebase/` (recommended) or from the project root using `-f FMCG-DevOps-Codebase/docker-compose.yml`.

### 1. Launch the Entire Platform

```bash
# Navigate to the DevOps directory
cd FMCG-DevOps-Codebase

# Start all 10 containers in detached (background) mode with automatic rebuild
docker compose up --build -d
```

*From the project root:*
```bash
docker compose -f FMCG-DevOps-Codebase/docker-compose.yml up --build -d
```

### 2. Check Service Health & Status

```bash
# List all running containers, their ports, and health status
docker compose ps

# Detailed live status with process IDs
docker compose top
```

### 3. Stop the Platform

```bash
# Gracefully stop containers (preserves database volumes and model cache)
docker compose down

# Temporarily pause without removing container instances
docker compose stop

# Resume previously paused containers
docker compose start
```

### 4. Restarting Services

```bash
# Restart everything
docker compose restart

# Restart a specific service (e.g. after code changes)
docker compose restart api
docker compose restart worker
docker compose restart frontend
```

---

## 🪵 Managing Logs & Observability

### Stream Live Logs

```bash
# Follow logs for ALL containers in real time
docker compose logs -f

# Follow logs with timestamps
docker compose logs -f -t

# Follow logs for only the FastAPI Backend
docker compose logs -f api

# Follow logs for only the Background AI Worker
docker compose logs -f worker

# Follow logs for only the Next.js Frontend
docker compose logs -f frontend

# View the last 100 log lines of a specific container without streaming
docker compose logs --tail 100 api
docker compose logs --tail 100 worker
docker compose logs --tail 100 postgres
```

---

## 🔍 Interactive Container Debugging & Shell Access

### 1. Access FastAPI API Container Shell
```bash
docker compose exec api bash
# Inside the container, inspect files or test imports:
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

### 2. Access Worker Container Shell
```bash
docker compose exec worker bash
# Verify worker GPU detection:
python -c "import torch; print('CUDA Available:', torch.cuda.is_available())"
```

### 3. Interactive PostgreSQL Shell (`psql`)
```bash
# Connect directly to the database inside the postgres container
docker compose exec postgres psql -U admin -d fmcg_db

# Useful psql queries inside the shell:
# \dt                   -> List all tables
# SELECT count(*) FROM audit_results;
# SELECT * FROM product_codes;
# SELECT model_name, model_path, is_active FROM models;
# \q                    -> Exit
```

### 4. Interactive Redis Shell (`redis-cli`)
```bash
# Open Redis CLI
docker compose exec redis redis-cli

# Inside redis-cli:
# ping                  -> Should return PONG
# keys *                -> View all cached keys
# monitor               -> Stream live cache queries & rate-limit hits
# exit                  -> Exit
```

### 5. RabbitMQ Cluster Diagnostics
```bash
# Check queue lengths and consumer health
docker compose exec rabbitmq rabbitmq-diagnostics -q ping
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

---

## 🎯 Targeted Service Operations

If you only want to start specific dependencies (e.g., during standalone frontend or backend development):

### Start Only Databases & Queues (No AI/Frontend)
```bash
docker compose up -d postgres redis rabbitmq minio
```

### Start Only Monitoring Stack
```bash
docker compose up -d prometheus grafana loki promtail
```

### Start API and Worker Only
```bash
docker compose up -d api worker
```

---

## ⚡ Hardware & GPU Acceleration (NVIDIA)

Both `fmcg-api` and `fmcg-worker` are configured for NVIDIA CUDA acceleration via:
```yaml
gpus: all
```

### Verify GPU Acceleration Inside Container
```bash
docker compose exec api nvidia-smi
docker compose exec worker nvidia-smi
```

### Running on Machines Without an NVIDIA GPU (CPU-Only Mode)
If you are developing on a laptop or VM without an NVIDIA GPU or without the NVIDIA Container Toolkit:
1. Open `FMCG-DevOps-Codebase/docker-compose.yml`.
2. Comment out `gpus: all` under both `api:` (line 36) and `worker:` (line 132).
3. Re-run `docker compose up --build -d`. The YOLO inference pipeline will automatically fall back to CPU mode (`device="cpu"`).

---

## 💾 Data Volumes & Storage Persistence

The stack uses persistent Docker named volumes to ensure data survives container updates and restarts:

| Volume Name | Description & Data Stored |
|---|---|
| `postgres_data` | PostgreSQL tables, audit history, SKU catalogs, and model metadata. |
| `rabbitmq_data` | Persistent messages, exchanges, and dead-letter queues. |
| `redis_data` | Cache entries, TTL tracking, and rate-limiting quotas. |
| `minio_data` | Uploaded raw shelf photos and annotated bounding box outputs. |
| `model_store` | Synchronized neural network weights (`.pt` files) accessible by worker. |
| `prometheus_data` | Historical metrics time-series database. |
| `grafana_data` | Custom dashboards, alerts, and user settings. |

### Inspecting Volumes
```bash
# List all FMCG volumes
docker volume ls | grep fmcg

# Inspect specific volume details
docker volume inspect fmcg-devops-codebase_postgres_data
```

---

## 🧹 Clean Reset & Cache Purging

### 1. Rebuild Changed Code Without Deleting Data
```bash
# Rebuilds API, Worker, and Frontend images while preserving all database rows
docker compose up --build -d
```

### 2. Complete Fresh Reset (Wipes Database, Caches & Starts Clean)
```bash
# Stops containers, deletes networks, and purges all database/minio volumes
docker compose down -v --remove-orphans

# Fresh rebuild from scratch
docker compose up --build -d
```

### 3. Force Clean Docker Build (Ignoring Image Cache)
```bash
docker compose build --no-cache
docker compose up -d
```

### 4. Reclaim Disk Space
```bash
# Remove dangling images, build caches, and stopped test containers
docker system prune -f
```

---

## ❓ Troubleshooting & FAQs

### Q1: Container crashes with `port is already allocated`
- **Cause**: Another service on your host machine (e.g. a local PostgreSQL or Redis instance) is already using port 5433, 6379, 8000, or 3000.
- **Fix**: Check what process is using the port:
  ```powershell
  # Windows PowerShell:
  Get-NetTCPConnection -LocalPort 8000, 3000, 5433, 6379 -ErrorAction SilentlyContinue
  ```
  Change the left-hand host port in `docker-compose.yml` (e.g. `"8001:8000"`) and restart.

### Q2: API container shows `⏳ Waiting for PostgreSQL...`
- **Cause**: Normal startup handshake. `init_models.sh` waits until PostgreSQL has completed self-initialization before launching FastAPI. It will proceed automatically within 5–15 seconds.

### Q3: Model file missing warning on boot
- **Message**: `⚠️ Model file missing: ...`
- **Cause**: A model record exists in the database but the corresponding `.pt` weights file was not placed in `FMCG-ML-Models/`.
- **Fix**: Place your weights file (e.g. `yolo26m.pt`) in `FMCG-ML-Models/yolov26/` and restart the API container:
  ```bash
  docker compose restart api worker
  ```
