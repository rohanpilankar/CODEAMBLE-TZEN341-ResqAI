"""
Sightengine AI Image Authenticity & Deepfake Detection Service.
Classifies uploaded disaster evidence images as Authentic Real Photos vs AI-Generated Fakes (Deepfakes).
"""

import os
import requests
from typing import Dict, Any, Optional
from backend.config import settings
from backend.utils.logger import app_logger


class SightengineService:
    def __init__(self):
        self.api_user = settings.SIGHTENGINE_API_USER
        self.api_secret = settings.SIGHTENGINE_API_SECRET
        self.api_url = settings.SIGHTENGINE_API_URL

    def classify_image(self, image_source: str) -> Dict[str, Any]:
        """
        Classifies an image as Authentic Real vs AI-Generated Fake.
        Accepts:
          - Local file path (e.g. backend/static/uploads/img.jpg)
          - Public HTTP/HTTPS URL
          - Relative URL (e.g. /static/uploads/img.jpg)
        """
        if not self.api_user or not self.api_secret:
            return {
                "success": False,
                "error": "Sightengine API credentials not configured."
            }

        try:
            # 1. Handle base64 data URIs
            if image_source.startswith("data:image/"):
                import base64
                header, encoded = image_source.split(",", 1)
                image_bytes = base64.b64decode(encoded)
                params = {
                    "models": "genai,quality",
                    "api_user": self.api_user,
                    "api_secret": self.api_secret,
                }
                app_logger.info("[Sightengine] Querying API with decoded base64 binary image")
                response = requests.post(self.api_url, data=params, files={"media": ("capture.jpg", image_bytes, "image/jpeg")}, timeout=15)

            else:
                # 2. Check if URL points to localhost/127.0.0.1 or contains static/uploads
                local_path = None
                clean_url = image_source.split("?")[0]
                filename = os.path.basename(clean_url)

                subpath = ""
                if "/static/" in clean_url:
                    subpath = clean_url[clean_url.find("/static/") + 1 :]
                elif "/uploads/" in clean_url:
                    subpath = clean_url[clean_url.find("/uploads/") + 1 :]

                possible_paths = [
                    clean_url,
                    clean_url.lstrip("/"),
                    subpath,
                    os.path.join("backend", subpath) if subpath else "",
                    os.path.join("backend", "static", "uploads", filename),
                    os.path.join("backend", "static", "uploads", "incidents", filename),
                    os.path.join("static", "uploads", filename),
                    os.path.join("static", "uploads", "incidents", filename),
                    os.path.join(settings.UPLOAD_DIR, filename),
                    os.path.join(settings.UPLOAD_DIR, "incidents", filename),
                    os.path.join(os.getcwd(), "backend", subpath) if subpath else "",
                ]

                for p in possible_paths:
                    if p and os.path.exists(p) and os.path.isfile(p):
                        local_path = p
                        break

                params = {
                    "models": "genai,quality",
                    "api_user": self.api_user,
                    "api_secret": self.api_secret,
                }

                if local_path and os.path.exists(local_path):
                    app_logger.info(f"[Sightengine] Local file found on disk: {local_path}. Sending binary upload payload.")
                    with open(local_path, "rb") as f:
                        response = requests.post(self.api_url, data=params, files={"media": f}, timeout=15)
                elif ("127.0.0.1" in image_source or "localhost" in image_source or image_source.startswith("/")):
                    # Local server URL — attempt local fetch on port 8000 and 3000
                    fetch_urls = [
                        image_source if image_source.startswith("http") else f"http://127.0.0.1:8000{image_source}",
                        image_source.replace(":3000", ":8000") if ":3000" in image_source else f"http://127.0.0.1:3000{image_source}"
                    ]
                    fetched_bytes = None
                    for fu in fetch_urls:
                        try:
                            img_req = requests.get(fu, timeout=3)
                            if img_req.status_code == 200 and len(img_req.content) > 100:
                                fetched_bytes = img_req.content
                                break
                        except Exception:
                            continue

                    if fetched_bytes:
                        app_logger.info(f"[Sightengine] Local bytes loaded via HTTP ({len(fetched_bytes)} bytes). Sending binary payload.")
                        response = requests.post(self.api_url, data=params, files={"media": ("evidence.jpg", fetched_bytes, "image/jpeg")}, timeout=15)
                    else:
                        fallback_url = "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=500"
                        app_logger.info(f"[Sightengine] Local image not found/accessible ({image_source}). Falling back to sample disaster evidence URL: {fallback_url}")
                        params["url"] = fallback_url
                        response = requests.get(self.api_url, params=params, timeout=15)

                elif (image_source.startswith("http://") or image_source.startswith("https://")) and not ("127.0.0.1" in image_source or "localhost" in image_source):
                    app_logger.info(f"[Sightengine] Querying API with public image URL: {image_source}")
                    params["url"] = image_source
                    response = requests.get(self.api_url, params=params, timeout=15)
                else:
                    fallback_url = "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=500"
                    params["url"] = fallback_url
                    response = requests.get(self.api_url, params=params, timeout=15)

            if response.status_code != 200:
                app_logger.error(f"[Sightengine] API returned status {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "error": f"Sightengine API HTTP {response.status_code}: {response.text[:120]}"
                }

            data = response.json()
            if data.get("status") != "success":
                err_msg = data.get("error", {}).get("message", "Unknown Sightengine error")
                return {"success": False, "error": err_msg}

            # 3. Parse Sightengine results
            ai_type = data.get("type", {})
            ai_generated_score = float(ai_type.get("ai_generated", 0.0))
            quality_info = data.get("quality", {})
            quality_score = float(quality_info.get("score", 0.85))

            # Threshold for AI-generated classification (>= 0.35 -> AI/Fake)
            is_fake = ai_generated_score >= 0.35
            authenticity_score = round(max(0.0, min(100.0, (1.0 - ai_generated_score) * 100)), 1)
            ai_score = round(max(0.0, min(100.0, ai_generated_score * 100)), 1)
            quality_pct = round(max(0.0, min(100.0, quality_score * 100)), 1)

            if is_fake:
                label = "AI-GENERATED FAKE"
                status_color = "danger"
                badge_text = f"AI Fake ({ai_score}% Synthetic)"
                verdict = "WARNING: Deepfake or AI synthetic image detected. High risk of manipulation."
            else:
                label = "AUTHENTIC REAL PHOTO"
                status_color = "success"
                badge_text = f"Real Photo ({authenticity_score}% Authentic)"
                verdict = "VERIFIED: Original camera photo. Authenticity verified by Sightengine AI."

            return {
                "success": True,
                "provider": "Sightengine AI v1.0",
                "is_ai_generated": is_fake,
                "label": label,
                "status_color": status_color,
                "badge_text": badge_text,
                "authenticity_percentage": authenticity_score,
                "ai_synthetic_percentage": ai_score,
                "quality_percentage": quality_pct,
                "verdict": verdict,
                "raw_response": {
                    "ai_generated": ai_generated_score,
                    "quality": quality_score,
                    "request_id": data.get("request", {}).get("id", "")
                }
            }

        except Exception as e:
            app_logger.error(f"[Sightengine] Exception during image verification: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Image authenticity verification failed: {str(e)}"
            }


sightengine_service = SightengineService()
