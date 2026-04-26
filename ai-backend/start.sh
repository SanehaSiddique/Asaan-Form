#!/bin/bash

# Asaan-Form AI Backend Start Script for Linux/Mac
# Runs the OCR Microservice in the background and the main FastAPI app in the foreground.

# Check if venv exists
if [ -d "asaan-env-310" ]; then
    echo "✅ Found asaan-env-310 virtual environment."
    PYTHON_EXEC="./asaan-env-310/bin/python3"
    UVICORN_EXEC="./asaan-env-310/bin/uvicorn"
else
    echo "⚠️ asaan-env-310 not found. Falling back to global python3."
    PYTHON_EXEC="python3"
    UVICORN_EXEC="uvicorn"
fi

# Disable oneDNN/PIR for stability on Windows-like Linux environments
export FLAGS_use_mkldnn=false
export FLAGS_enable_pir_api=0
export PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=true

echo "🚀 Starting OCR microservice on port 8001..."
$PYTHON_EXEC ocr_microservice.py &

# Wait a few seconds for the microservice to initialize
sleep 3

echo "🌟 Starting main FastAPI app on port 8000..."
$UVICORN_EXEC app.main:app --host 0.0.0.0 --port 8000 --reload
