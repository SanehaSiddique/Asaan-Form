# app/services/ocr_service.py
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any
from pdf2image import convert_from_path
import threading

_ocr_instance = None
_ocr_lock = threading.Lock()
_ocr_initializing = False

def get_ocr():
    """
    Get or create PaddleOCR instance (singleton pattern with thread safety)
    """
    global _ocr_instance, _ocr_initializing
    
    if _ocr_instance is not None:
        return _ocr_instance
        
    with _ocr_lock:
        if _ocr_instance is not None:
            return _ocr_instance
            
        _ocr_initializing = True
        try:
            from paddleocr import PaddleOCR
            print("Initializing PaddleOCR...")
            _ocr_instance = PaddleOCR(use_textline_orientation=True, lang='en', enable_mkldnn=False)
            print("PaddleOCR initialized successfully")
            return _ocr_instance
        except Exception as e:
            print(f"Error initializing PaddleOCR: {e}")
            raise
        finally:
            _ocr_initializing = False


def preload_ocr():
    """
    Preload OCR instance in background to avoid blocking first request
    """
    def _preload():
        try:
            get_ocr()
        except Exception as e:
            print(f"Warning: Failed to preload OCR: {e}")
    
    thread = threading.Thread(target=_preload, daemon=True)
    thread.start()
    return thread

def load_input(path: Path) -> np.ndarray:
    path_str = str(path)
    if path_str.lower().endswith(".pdf"):
        pages = convert_from_path(path_str, dpi=300)
        if not pages:
            raise ValueError(f"PDF has no pages: {path_str}")
        img = np.array(pages[0])
    else:
        img = cv2.imread(path_str)
        if img is None:
            raise ValueError(f"Could not load image from {path_str}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img

def load_all_pages(path: Path) -> List[np.ndarray]:
    path_str = str(path)
    if path_str.lower().endswith(".pdf"):
        try:
            pages = convert_from_path(path_str, dpi=300)
            if not pages:
                raise ValueError(f"PDF has no pages: {path_str}")
            
            images = []
            for page in pages:
                img = np.array(page)
                images.append(img)
            return images
        except Exception as e:
            try:
                import fitz
                doc = fitz.open(path_str)
                images = []
                zoom = 300 / 72.0
                mat = fitz.Matrix(zoom, zoom)
                
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    pix = page.get_pixmap(matrix=mat)
                    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        (pix.height, pix.width, pix.n)
                    )
                    if pix.n == 4:
                        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
                    elif pix.n == 1:
                        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
                    images.append(img)
                
                doc.close()
                return images
            except Exception:
                raise ValueError(f"PDF conversion failed: {e}")
    else:
        img = cv2.imread(path_str)
        if img is None:
            raise ValueError(f"Could not load image from {path_str}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return [img]

def run_ocr(image: np.ndarray):
    import time
    start_time = time.time()
    try:
        ocr = get_ocr()
        if ocr is None:
            raise RuntimeError("OCR instance is not initialized")
        
        results = ocr.predict(image)
        elapsed = time.time() - start_time
        print(f"      ✓ OCR prediction completed in {elapsed:.1f}s")
        
        if not results:
            return [], []

        res = results[0]
        texts = res.json['res'].get('rec_texts', [])
        polys = res.json['res'].get('dt_polys', [])

        boxes = []
        for poly in polys:
            poly = np.array(poly, dtype=np.float32)
            xs = poly[:, 0]
            ys = poly[:, 1]
            boxes.append([int(np.min(xs)), int(np.min(ys)), int(np.max(xs)), int(np.max(ys))])

        return texts, boxes
    except Exception as e:
        print(f"      ❌ OCR failed: {str(e)[:150]}")
        raise

def group_lines(words, boxes, y_thresh=25, x_gap_thresh=80):
    lines = []
    for word, box in zip(words, boxes):
        y_center = (box[1] + box[3]) // 2
        placed = False
        for line in lines:
            if abs(line["y"] - y_center) < y_thresh:
                if max(b[2] for b in line["boxes"]) + x_gap_thresh < box[0]:
                    continue
                line["words"].append(word)
                line["boxes"].append(box)
                placed = True
                break
        if not placed:
            lines.append({"y": y_center, "words": [word], "boxes": [box]})

    lines.sort(key=lambda l: l["y"])
    for line in lines:
        paired = sorted(zip(line["words"], line["boxes"]), key=lambda p: p[1][0])
        line["words"], line["boxes"] = [p[0] for p in paired], [p[1] for p in paired]
        line["text"] = " ".join(line["words"])
        line["bbox"] = [
            min(b[0] for b in line["boxes"]),
            min(b[1] for b in line["boxes"]),
            max(b[2] for b in line["boxes"]),
            max(b[3] for b in line["boxes"]),
        ]
    return lines

def extract_english_text_with_boxes(file_path: Path):
    """
    High-level OCR extraction function.
    Returns (concatenated_text, first_page_boxes).
    """
    images = load_all_pages(file_path)
    if not images:
        return "", []
    
    all_text_lines = []
    first_page_boxes = []
    
    for page_num, img in enumerate(images, 1):
        try:
            words, boxes = run_ocr(img)
            if not words:
                continue
            
            lines = group_lines(words, boxes)
            page_text = "\n".join([l["text"] for l in lines])
            
            if page_num == 1:
                first_page_boxes = boxes
                
            if len(images) > 1:
                all_text_lines.append(f"[Page {page_num}]\n{page_text}")
            else:
                all_text_lines.append(page_text)
        except Exception:
            if len(images) == 1:
                raise
            continue
            
    return "\n\n".join(all_text_lines), first_page_boxes

def extract_english_text(file_path: Path) -> str:
    """Legacy alias that returns only the text."""
    text, _ = extract_english_text_with_boxes(file_path)
    return text