# FMCG Python Codebase

Core backend REST API, asynchronous RabbitMQ audit worker, and computer vision inference pipeline for FMCG Insight 360.

---

## 📁 Package Architecture

```text
app/
├── api/v1/endpoints/   # REST endpoints (audit, models, product_codes, products)
├── core/               # Config, database engine, Redis connection, context & logging
├── models/             # SQLAlchemy ORM models (ProductCode, Product, Model, AuditResult)
├── repositories/       # Database query abstraction layer
├── schemas/            # Pydantic v2 validation models
├── services/           # Inference pipeline, YOLO runner, MinIO S3, RabbitMQ AMQP, Cache
└── workers/            # Decoupled RabbitMQ background task processor
```

---

## 💻 Local Execution Guide

1. **Activate Virtual Environment**:
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows PowerShell
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Start Background Audit Worker**:
   ```bash
   python -m app.workers.worker
   ```
