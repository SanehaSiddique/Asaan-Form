@echo off
call asaan-env-310\Scripts\activate

:: PaddlePaddle Stability Flags
set FLAGS_use_mkldnn=false
set FLAGS_enable_pir_api=0
set PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

echo Starting OCR microservice on port 8001...
start "OCR Microservice" cmd /k "python ocr_microservice.py"

echo Starting main FastAPI app on port 8000...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
