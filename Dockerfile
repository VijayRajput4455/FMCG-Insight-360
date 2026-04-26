FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

# OpenCV runtime deps for opencv-python wheels
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		libgl1 \
		libglib2.0-0 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --upgrade pip \
	&& pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision \
	&& pip install -r requirements.txt \
	&& pip install ultralytics

COPY . .

RUN mkdir -p logs uploads/audit outputs/audit

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
