"""
ResqAI - YOLO Computer Vision Person & Disaster Object Detection Service
========================================================================
Performs real-time YOLOv8 object & victim detection on incident images,
draws labeled bounding box overlays, and returns structured spatial analytics.
"""

import os
import uuid
import json
import logging
import threading
import time
import base64
import urllib.request
try:
    import cv2
except Exception as _cv_err:
    cv2 = None
    logger.warning(f"cv2 (OpenCV) failed to load: {_cv_err}")
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_YOLO_DIR = BASE_DIR / "backend" / "static" / "yolo_output"
STATIC_YOLO_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = BASE_DIR / "notebooks" / "yolov8n.pt"

class YOLOService:
    """YOLOv8 Computer Vision Disaster & Person Detection Engine."""

    def __init__(self):
        self.model = None
        self.model_loaded = False
        self._initialized = False
        self._lock = threading.Lock()

    def _ensure_model_loaded(self):
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            self._initialized = True
            print("[YOLO] Loading YOLOv8 Vision model...")
            t0 = time.perf_counter()
            self._init_model(t0)

    def _init_model(self, t0=None):
        try:
            from ultralytics import YOLO
            if MODEL_PATH.exists():
                self.model = YOLO(str(MODEL_PATH))
                self.model_loaded = True
                elapsed = (time.perf_counter() - t0) if t0 else 0
                print(f"[YOLO] Successfully loaded YOLOv8 model in {elapsed:.2f}s from {MODEL_PATH.name}")
            else:
                self.model = YOLO("yolov8n.pt")
                self.model_loaded = True
                print("[YOLO] Loaded default YOLOv8n model weights")
        except Exception as e:
            print(f"[YOLO] Failed to load YOLOv8 model: {e}")
            logger.warning(f"Notice: Failed to initialize YOLO model: {e}")
            self.model = None
            self.model_loaded = False

    def _resolve_or_download_image(self, image_input: str) -> Optional[str]:
        """Resolves local file paths, web URLs, relative static assets, or base64 data URIs into a valid local file path."""
        if not image_input or not isinstance(image_input, str):
            return None

        # 1. Base64 Data URI
        if image_input.startswith("data:image/"):
            try:
                header, encoded = image_input.split(",", 1)
                img_data = base64.b64decode(encoded)
                filename = f"temp_base64_{uuid.uuid4().hex[:8]}.jpg"
                temp_path = STATIC_YOLO_DIR / filename
                with open(temp_path, "wb") as f:
                    f.write(img_data)
                return str(temp_path)
            except Exception as e:
                logger.warning(f"Failed to decode base64 image: {e}")
                return None

        clean = image_input.strip()

        # 2. Directly existing local filesystem path
        if os.path.exists(clean) and os.path.isfile(clean):
            return clean

        # 3. Relative paths mapped against project directories
        relative_clean = clean.lstrip("/").replace("\\", "/")
        if "?" in relative_clean:
            relative_clean = relative_clean.split("?")[0]

        candidates = [
            BASE_DIR / relative_clean,
            BASE_DIR / "backend" / relative_clean,
            BASE_DIR / "frontend" / relative_clean,
            BASE_DIR / "backend" / "static" / relative_clean.replace("static/", ""),
            BASE_DIR / "backend" / "static" / "uploads" / "incidents" / Path(relative_clean).name,
            BASE_DIR / "frontend" / "assets" / "images" / Path(relative_clean).name,
        ]

        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return str(candidate)

        # 4. HTTP / HTTPS URLs (e.g. http://127.0.0.1:3000/assets/... or http://127.0.0.1:8000/static/...)
        if clean.startswith("http://") or clean.startswith("https://"):
            parts = clean.split("/", 3)
            if len(parts) >= 4:
                sub_path = parts[3]
                sub_match = self._resolve_or_download_image(sub_path)
                if sub_match:
                    return sub_match

            try:
                req = urllib.request.Request(clean, headers={"User-Agent": "ResQAI-YOLO-Scanner/1.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    img_data = response.read()
                    filename = f"temp_dl_{uuid.uuid4().hex[:8]}.jpg"
                    temp_path = STATIC_YOLO_DIR / filename
                    with open(temp_path, "wb") as f:
                        f.write(img_data)
                    return str(temp_path)
            except Exception as e:
                logger.warning(f"Failed to fetch image from URL {clean}: {e}")
                return None

        return None

    def detect_image(self, image_input: str, conf_threshold: float = 0.20) -> Dict[str, Any]:
        """Perform real object detection on image path, URL, or data URI.

        Returns annotated image URL and structured detection metadata.
        """
        self._ensure_model_loaded()
        if not image_input:
            return self._empty_response("No image provided for visual analysis.")

        image_path = self._resolve_or_download_image(image_input)

        if not image_path or not os.path.exists(image_path):
            return self._empty_response(f"Unable to locate or download image file for analysis.")

        if not self.model_loaded or self.model is None:
            return self._empty_response("YOLOv8 vision model is not available.")

        try:
            results = self.model(image_path, conf=conf_threshold)[0]
            img = cv2.imread(image_path)
            if img is None:
                return self._empty_response(f"Failed to decode image format.")

            height, width, _ = img.shape
            detections = []
            person_count = 0
            vehicle_count = 0
            conf_scores = []

            for box in results.boxes:
                cls_id = int(box.cls[0])
                class_name = self.model.names.get(cls_id, f"object_{cls_id}").lower()
                conf = float(box.conf[0])
                conf_scores.append(conf)
                xyxy = [float(x) for x in box.xyxy[0].tolist()]
                x1, y1, x2, y2 = [int(v) for v in xyxy]

                if class_name == "person":
                    person_count += 1
                    color = (0, 0, 255) # Bright Red for Victims/People
                    label = f"VICTIM/PERSON ({conf*100:.0f}%)"
                elif class_name in ["car", "truck", "bus", "motorcycle", "bicycle"]:
                    vehicle_count += 1
                    color = (255, 165, 0) # Orange for Vehicles
                    label = f"{class_name.upper()} ({conf*100:.0f}%)"
                elif class_name in ["boat", "airplane", "helicopter"]:
                    vehicle_count += 1
                    color = (255, 255, 0) # Cyan for Rescue Vehicles
                    label = f"RESCUE {class_name.upper()} ({conf*100:.0f}%)"
                elif class_name in ["dog", "cat", "horse", "cow"]:
                    color = (255, 0, 255) # Magenta for Animals/Search Dogs
                    label = f"ANIMAL: {class_name.upper()} ({conf*100:.0f}%)"
                else:
                    color = (0, 255, 0) # Green for general items
                    label = f"{class_name.upper()} ({conf*100:.0f}%)"

                # Draw bounding box on cv2 image
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)

                # Draw label background box
                (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                cv2.rectangle(img, (x1, max(0, y1 - 22)), (x1 + w + 8, y1), color, -1)
                cv2.putText(img, label, (x1 + 4, max(14, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

                detections.append({
                    "class": class_name,
                    "confidence": round(conf, 4),
                    "bbox_xyxy": [round(v, 1) for v in xyxy]
                })

            # Save annotated output image
            filename = f"yolo_{uuid.uuid4().hex[:8]}.jpg"
            save_path = STATIC_YOLO_DIR / filename
            cv2.imwrite(str(save_path), img)

            avg_conf = round(float(np.mean(conf_scores)) * 100, 1) if conf_scores else 0.0

            msg = f"YOLO Vision Analysis Complete: Detected {person_count} civilian(s)/victim(s) and {vehicle_count} vehicle(s)." if detections else "YOLO Vision Analysis: No victims or disaster objects detected in scene."

            return {
                "success": True,
                "model_version": "YOLOv8 Emergency Vision v1.0",
                "total_objects": len(detections),
                "people_detected": person_count,
                "vehicles_detected": vehicle_count,
                "overall_confidence_pct": avg_conf,
                "annotated_image_url": f"/static/yolo_output/{filename}",
                "detections": detections,
                "message": msg
            }

        except Exception as e:
            logger.warning(f"YOLO inference exception: {e}")
            return self._empty_response(f"YOLO vision processing error: {e}")

    def _empty_response(self, msg: str) -> Dict[str, Any]:
        return {
            "success": False,
            "total_objects": 0,
            "people_detected": 0,
            "vehicles_detected": 0,
            "overall_confidence_pct": 0.0,
            "annotated_image_url": None,
            "detections": [],
            "message": msg
        }

yolo_service = YOLOService()
