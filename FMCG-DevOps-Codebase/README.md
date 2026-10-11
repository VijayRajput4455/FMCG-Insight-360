# FMCG DevOps Codebase

This folder contains the complete infrastructure orchestration, monitoring, and container initialization logic for the FMCG Insight 360 platform.

---

## 📁 Contents

- **`docker-compose.yml`**: Full multi-service orchestration spec (API, Worker, Frontend, PostgreSQL, RabbitMQ, Redis, MinIO, Prometheus, Grafana, Loki, Promtail).
- **`docker/`**:
  - `init_models.sh`: Container entrypoint script that verifies database readiness and synchronizes host neural network weights into the container model volume.
- **`monitoring/`**:
  - `prometheus.yml`: Prometheus metrics scraping target configuration.
  - `loki-config.yml`: Grafana Loki log aggregation configuration.
  - `promtail-config.yml`: Promtail log collector watcher configuration.
  - `grafana/`: Provisioning datasources and preconfigured dashboards.

---

## 🚀 Running the Stack

You can launch the complete stack from the project root:

```bash
docker compose up --build -d
```

Or from inside `FMCG-DevOps-Codebase`:

```bash
docker compose -f docker-compose.yml up --build -d
```
