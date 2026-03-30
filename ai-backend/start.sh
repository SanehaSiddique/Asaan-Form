#!/bin/bash

# Asaan-Form AI Backend Start Script for Linux/Mac
# Runs the OCR Microservice in the background and the main FastAPI app in the foreground.

echo "🚀 Starting OCR microservice on port 8001..."
python3 ocr_microservice.py &

# Wait a few seconds for the microservice to initialize
sleep 2

echo "🌟 Starting main FastAPI app on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
