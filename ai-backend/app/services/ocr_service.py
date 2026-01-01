# app/services/ocr_service.py
import cv2
import numpy as np
from pathlib import Path
from paddleocr import PaddleOCR
from pdf2image import convert_from_path
from PIL import Image

_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        _ocr_instance = PaddleOCR(
            use_textline_orientation=True,
            lang="en"
        )
    return _ocr_instance

def load_input(path: Path) -> np.ndarray:
    path = str(path)
    if path.lower().endswith(".pdf"):
        pages = convert_from_path(path, dpi=300)
        img = np.array(pages[0])
    else:
        img = cv2.imread(path)
        if img is None:
            raise ValueError(f"Could not load image from {path}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img

def run_ocr(image: np.ndarray):
    ocr = get_ocr()
    results = ocr.predict(image)
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

def extract_text_from_image(file_path: Path) -> str:
    """
    High-level OCR extraction function.
    Returns concatenated text from the document.
    """
    img = load_input(file_path)
    words, boxes = run_ocr(img)
    if not words:
        return ""
    lines = group_lines(words, boxes)
    return "\n".join([l["text"] for l in lines])
