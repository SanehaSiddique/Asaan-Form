"""
Form PDF Overlay Service

Fills the original form PDF by overlaying text and checkmarks on form fields.

Coordinate systems:
- Docling runs on rendered images (PDF at 300 DPI). It uses BOTTOMLEFT origin (y up).
  We convert to top-left (y down) then scale to PDF points: pdf_coord = image_coord * (72 / dpi).
- Image uploads: no scaling needed (render_dpi=None).

Supported field types:
  text_input, textarea, date, dropdown  → value drawn to the right of field label
  signature, image_upload               → placeholder text drawn
  checkbox (single)                     → checkmark drawn if value is truthy
  checkbox (multi-option)               → checkmark drawn in the bbox of the selected option
"""

import io
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    fitz = None

from PIL import Image

# ──────────────────────────────────────────────────────────────────────────────
# LAYOUT CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────
VALUE_BOX_GAP = 5
VALUE_BOX_WIDTH = 200
VALUE_BOX_HEIGHT_EXTRA = 2
VALUE_BOX_TOP_NUDGE = 4
TEXTAREA_MAX_CHARS = 80
DEFAULT_FONT_SIZE = 9
FONT_NAME = "helv"

# Fallback options for known checkbox keys (used when field schema has no options)
KNOWN_CHECKBOX_OPTIONS: Dict[str, List[str]] = {
    "gender": ["Male", "Female"],
    "sex": ["Male", "Female"],
    "marital_status": ["Single", "Married", "Divorced"],
    "status": ["Single", "Married"],
    "residence_status": ["Resident", "Non-Resident"],
    "residential_status": ["Resident", "Non-Resident"],
    "payment_method": ["Cash", "Cheque", "Online"],
    "employment_status": ["Employed", "Unemployed", "Self-Employed"],
}


# ──────────────────────────────────────────────────────────────────────────────
# COORDINATE HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _is_multi_bbox(coords: Any) -> bool:
    """True when coordinates is an array-of-arrays (one bbox per checkbox option)."""
    return (
        isinstance(coords, list)
        and len(coords) > 0
        and isinstance(coords[0], (list, tuple))
        and len(coords[0]) >= 4
    )


def _normalize_label_rect(
    c0: float, c1: float, c2: float, c3: float
) -> Tuple[float, float, float, float]:
    """Ensure left < right and top < bottom."""
    return min(c0, c2), min(c1, c3), max(c0, c2), max(c1, c3)


def _docling_bbox_to_topleft(
    left: float, top_bl: float, right: float, bottom_bl: float, page_height_px: float
) -> Tuple[float, float, float, float]:
    """Convert Docling bottom-left origin bbox to top-left origin."""
    return left, page_height_px - top_bl, right, page_height_px - bottom_bl


def _label_bbox_to_value_bbox(
    left: float, top: float, right: float, bottom: float,
    gap: float = VALUE_BOX_GAP,
    width: float = VALUE_BOX_WIDTH,
    height_extra: float = VALUE_BOX_HEIGHT_EXTRA,
    page_width: Optional[float] = None,
    nudge_down: float = VALUE_BOX_TOP_NUDGE,
) -> Tuple[float, float, float, float]:
    """Return the fill-area rect positioned to the right of the field label."""
    value_left = right + gap
    value_right = value_left + width
    value_top = top + nudge_down
    value_bottom = bottom + height_extra + nudge_down
    if page_width is not None and value_right > page_width - 5:
        value_right = page_width - 5
    return value_left, value_top, value_right, value_bottom


def _make_finite_rect(
    x0: float, y0: float, x1: float, y1: float,
    min_w: float = 10, min_h: float = 8
) -> "fitz.Rect":
    """Ensure rect has positive, finite dimensions."""
    left, right = min(x0, x1), max(x0, x1)
    top, bottom = min(y0, y1), max(y0, y1)
    if right - left < min_w:
        right = left + min_w
    if bottom - top < min_h:
        bottom = top + min_h
    return fitz.Rect(left, top, right, bottom)


def _to_pdf_coords(
    raw_bbox: List[float],
    page_height_same_units: float,
    scale: float,
) -> Tuple[float, float, float, float]:
    """
    Convert a single [l, t_bl, r, b_bl] bbox from Docling space to PDF points.
    Handles Docling bottom-left y-axis and scales to PDF points.
    """
    c0, c1, c2, c3 = float(raw_bbox[0]), float(raw_bbox[1]), float(raw_bbox[2]), float(raw_bbox[3])
    left, top, right, bottom = _docling_bbox_to_topleft(c0, c1, c2, c3, page_height_same_units)
    left, top, right, bottom = _normalize_label_rect(left, top, right, bottom)
    return left * scale, top * scale, right * scale, bottom * scale


# ──────────────────────────────────────────────────────────────────────────────
# CHECKBOX HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _is_checkbox_checked(value: Any) -> bool:
    """Normalize single-checkbox value to bool."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    return s in ("true", "yes", "1", "checked", "x", "✓", "✔")


def _find_option_index(options: List[str], value: Any) -> Optional[int]:
    """
    Find the 0-based index of value in the options list.
    Tries exact match, then case-insensitive, then partial.
    """
    if not options or value is None:
        return None
    val_str = str(value).strip().lower()
    # Exact case-insensitive match
    for i, opt in enumerate(options):
        if val_str == opt.strip().lower():
            return i
    # Partial match (value contains option or vice versa)
    for i, opt in enumerate(options):
        opt_lower = opt.strip().lower()
        if val_str in opt_lower or opt_lower in val_str:
            return i
    return None


def _find_option_index_fallback(field_key: str, value: Any) -> Optional[int]:
    """Use KNOWN_CHECKBOX_OPTIONS as fallback when field has no options stored."""
    key_lower = (field_key or "").lower()
    options = KNOWN_CHECKBOX_OPTIONS.get(key_lower)
    if not options:
        return None
    return _find_option_index(options, value)


def _draw_checkmark(page: "fitz.Page", rect: "fitz.Rect") -> None:
    """Draw a ✓ (or X as fallback) centered inside rect."""
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    h = rect.y1 - rect.y0
    fontsize = max(6, min(h * 0.8, 12))
    try:
        page.insert_text(
            fitz.Point(cx - fontsize * 0.3, cy + fontsize * 0.35),
            "✓", fontsize=fontsize, fontname=FONT_NAME, color=(0, 0, 0),
        )
    except Exception:
        page.insert_text(
            fitz.Point(cx - fontsize * 0.25, cy + fontsize * 0.35),
            "X", fontsize=fontsize, fontname=FONT_NAME, color=(0, 0, 0),
        )


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


# ──────────────────────────────────────────────────────────────────────────────
# SERVICE
# ──────────────────────────────────────────────────────────────────────────────

class FormPdfOverlayService:
    """
    Overlays filled values onto the original form PDF using PyMuPDF.

    Checkbox handling (the key improvement):
    - Multi-option checkbox: coordinates is [[l,t,r,b], [l,t,r,b], ...]
      → find which option matches value → draw checkmark in that option's bbox
    - Single checkbox: coordinates is [l,t,r,b]
      → draw checkmark if value is truthy
    """

    def __init__(self):
        if not PYMUPDF_AVAILABLE:
            raise ImportError("PyMuPDF (fitz) is required: pip install pymupdf")

    def fill_pdf(
        self,
        original_path: Path,
        filled_fields: List[Dict[str, Any]],
        page_image_paths: Optional[List[str]] = None,
        output_path: Optional[Path] = None,
        render_dpi: Optional[int] = None,
    ) -> Path:
        """
        Overlay filled values onto the original form PDF or image.

        Args:
            original_path: Path to original form (PDF or image).
            filled_fields: Fields with field_key, field_type, value, coordinates,
                           options, page_number.
            output_path: Destination path. Defaults to <original>_filled.pdf.
            render_dpi: DPI used when rendering PDF for Docling (e.g. 300).
                        None if form was uploaded as an image.
        Returns:
            Path to the saved filled PDF.
        """
        original_path = Path(original_path)
        if not original_path.exists():
            raise FileNotFoundError(f"Form file not found: {original_path}")

        scale = (72.0 / render_dpi) if render_dpi else 1.0
        suffix = original_path.suffix.lower()

        if suffix == ".pdf":
            doc = fitz.open(str(original_path))
        else:
            doc = fitz.open()
            with Image.open(original_path) as img:
                w, h = img.size
                img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                img_bytes = buf.getvalue()
            page = doc.new_page(width=float(w), height=float(h))
            page.insert_image(page.rect, stream=img_bytes)

        # Sort fields by page then vertical position (top of page first)
        def _sort_key(f: Dict) -> tuple:
            c = f.get("coordinates") or [0, 0, 0, 0]
            # For multi-bbox, use the first bbox for sorting
            first = c[0] if (_is_multi_bbox(c)) else c
            if len(first) < 4:
                return (f.get("page_number", 1), 0.0, 0.0)
            return (f.get("page_number", 1), min(first[1], first[3]), min(first[0], first[2]))

        filled_fields = sorted(filled_fields, key=_sort_key)

        for field in filled_fields:
            value = field.get("value")
            field_type = (field.get("field_type") or "text_input").strip().lower()
            page_no = field.get("page_number", 1)
            coords = field.get("coordinates")
            target_box = field.get("target_box")
            options = field.get("options") or []
            field_key = (field.get("field_key") or "").strip().lower()

            if not coords:
                continue

            page_index = max(0, int(page_no) - 1)
            if page_index >= len(doc):
                continue

            page = doc[page_index]
            pdf_rect = page.rect
            page_height_px = (
                pdf_rect.height * (render_dpi / 72.0) if render_dpi else pdf_rect.height
            )

            print(
                f"  [overlay] {field_key} | type={field_type} | "
                f"multi_bbox={_is_multi_bbox(coords)} | value={value!r}"
            )

            # ── MULTI-OPTION CHECKBOX ─────────────────────────────────────────
            if field_type in ("checkbox", "radio") and _is_multi_bbox(coords):
                # Step 1: find which option index to check
                option_idx = _find_option_index(options, value)

                # Step 2: fallback to KNOWN_CHECKBOX_OPTIONS
                if option_idx is None:
                    option_idx = _find_option_index_fallback(field_key, value)

                # Step 3: if value is bool True, check first option
                if option_idx is None and _is_checkbox_checked(value):
                    option_idx = 0

                if option_idx is None:
                    print(f"    [overlay] SKIP: cannot resolve option for '{field_key}'='{value}'")
                    continue

                if option_idx >= len(coords):
                    print(
                        f"    [overlay] SKIP: option_idx={option_idx} out of range "
                        f"(only {len(coords)} bboxes) for '{field_key}'"
                    )
                    continue

                left, top, right, bottom = _to_pdf_coords(
                    coords[option_idx], page_height_px, scale
                )
                opt_rect = _make_finite_rect(left, top, right, bottom, min_w=6, min_h=6)
                opt_label = options[option_idx] if option_idx < len(options) else "?"
                print(f"    [overlay] ✓ checkmark in option[{option_idx}]='{opt_label}' rect={opt_rect}")
                _draw_checkmark(page, opt_rect)
                continue

            # ── SINGLE CHECKBOX ───────────────────────────────────────────────
            if field_type in ("checkbox", "radio") and not _is_multi_bbox(coords):
                if len(coords) < 4:
                    continue
                left, top, right, bottom = _to_pdf_coords(coords, page_height_px, scale)
                label_rect = _make_finite_rect(left, top, right, bottom, min_w=4, min_h=4)
                if _is_checkbox_checked(value):
                    print(f"    [overlay] ✓ single checkbox checked for '{field_key}'")
                    _draw_checkmark(page, label_rect)
                else:
                    print(f"    [overlay] single checkbox unchecked for '{field_key}' (skip)")
                continue

            # ── TEXT / TEXTAREA / DATE / SIGNATURE / DROPDOWN ────────────────
            if _is_multi_bbox(coords):
                # Defensive: text field should not have multi-bbox
                print(f"    [overlay] SKIP: text field '{field_key}' has unexpected multi-bbox coords")
                continue
            if len(coords) < 4:
                continue

            left, top, right, bottom = _to_pdf_coords(coords, page_height_px, scale)
            
            # If the user explicitly dragged and saved a target_box, use that directly
            if target_box and len(target_box) >= 4 and target_box != coords:
                tb_l, tb_t, tb_r, tb_b = _to_pdf_coords(target_box, page_height_px, scale)
                value_rect = _make_finite_rect(
                    tb_l, tb_t, tb_r, tb_b,
                    min_w=VALUE_BOX_WIDTH, min_h=14,
                )
            else:
                value_left, value_top, value_right, value_bottom = _label_bbox_to_value_bbox(
                    left, top, right, bottom, page_width=pdf_rect.width
                )
                value_rect = _make_finite_rect(
                    value_left, value_top, value_right, value_bottom,
                    min_w=VALUE_BOX_WIDTH, min_h=14,
                )

            text = _safe_text(value)
            if not text:
                continue

            if field_type == "textarea" and len(text) > TEXTAREA_MAX_CHARS:
                text = text[: TEXTAREA_MAX_CHARS - 3].rstrip() + "..."
            elif len(text) > 60:
                text = text[:57] + "..."

            if field_type in ("signature", "image_upload"):
                text = f"[{text}]" if len(text) < 30 else text[:27] + "..."

            rc = page.insert_textbox(
                value_rect, text,
                fontsize=DEFAULT_FONT_SIZE, fontname=FONT_NAME, align=0,
            )
            if rc < 0:
                short = text[:50] + ("..." if len(text) > 50 else "")
                page.insert_textbox(
                    value_rect, short,
                    fontsize=max(6, DEFAULT_FONT_SIZE - 2), fontname=FONT_NAME, align=0,
                )

        if output_path is None:
            output_path = original_path.parent / f"{original_path.stem}_filled.pdf"
        output_path = Path(output_path)
        doc.save(str(output_path), garbage=4, deflate=True)
        doc.close()
        return output_path


form_pdf_overlay_service = FormPdfOverlayService()