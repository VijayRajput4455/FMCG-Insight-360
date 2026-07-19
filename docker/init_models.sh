#!/usr/bin/env bash
set -e

# Wait for PostgreSQL to be ready using python to import app settings and connect
until python -c "
import sys, sqlalchemy as sa
from app.core.config import settings
try:
    engine = sa.create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        sys.exit(0)
except Exception:
    sys.exit(1)
" >/dev/null 2>&1; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 2
done

# Fetch and copy models only if destination is writable
if [ -w "/app/container_models" ]; then
  # Sync all host models from /app/host_models if they exist
  if [ -d "/app/host_models" ]; then
    echo "📦 Syncing host models from /app/host_models to /app/container_models/ml_models..."
    mkdir -p /app/container_models/ml_models
    cp -rf /app/host_models/* /app/container_models/ml_models/ 2>/dev/null || true
  fi

  # Fetch distinct model_path values from the DB using a short Python snippet
  MODEL_PATHS=$(python - <<'PY'
import sqlalchemy as sa
from app.core.database import engine, Base
from app.models import *
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    rows = conn.execute(sa.select(Model.model_path)).fetchall()
    for (p,) in rows:
        if p:
            print(p.replace("\\", "/"))
PY
)

  for rel_path in $MODEL_PATHS; do
    # Resolve the absolute path using the same logic as ModelService
    RESOLVED=$(python -c "import os; from app.core.config import settings; base = getattr(settings, 'ML_MODEL_DIR', 'ml_models'); p = '$rel_path';
if os.path.isabs(p):
    print(os.path.normpath(p))
elif os.path.exists(p):
    print(os.path.abspath(p))
else:
    print(os.path.abspath(os.path.join(base, p)))")
    DEST="/app/container_models/$(basename \"$rel_path\")"
    if [ -f "$RESOLVED" ]; then
      echo "📦 Copying $RESOLVED → $DEST"
      cp -a "$RESOLVED" "$DEST"
    else
      echo "⚠️  Model file missing: $RESOLVED (DB entry: $rel_path)"
    fi
  done
  echo "✅ Model copy completed"
else
  echo "ℹ️  /app/container_models is read-only, skipping model initialization"
fi

exec "$@"
