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
            # 1. Resolve local path or URL
            local_path = None
            if image_source.startswith("/") or image_source.startswith("backend/") or "static/" in image_source:
                # Local relative path
                clean_path = image_source.lstrip("/")
                if clean_path.startswith("static/"):
                    clean_path = os.path.join("backend", clean_path)
                if os.path.exists(clean_path):
                    local_path = clean_path
                elif os.path.exists(image_source):
                    local_path = image_source

            # 2. Query Sightengine API
            params = {
                "models": "genai,quality",
                "api_user": self.api_user,
                "api_secret": self.api_secret,
            }

            if local_path and os.path.exists(local_path):
                app_logger.info(f"[Sightengine] Querying API with binary upload: {local_path}")
                with open(local_path, "rb") as f:
                    response = requests.post(self.api_url, data=params, files={"media": f}, timeout=15)
            elif image_source.startswith("http://") or image_source.startswith("https://"):
                app_logger.info(f"[Sightengine] Querying API with image URL: {image_source}")
                params["url"] = image_source
                response = requests.get(self.api_url, params=params, timeout=15)
            else:
                # Fallback check if file exists under REPO_ROOT / backend
                fallback_path = os.path.join(os.getcwd(), image_source.lstrip("/"))
                if os.path.exists(fallback_path):
                    with open(fallback_path, "rb") as f:
                        response = requests.post(self.api_url, data=params, files={"media": f}, timeout=15)
                else:
                    return {
                        "success": False,
                        "error": f"Image file or URL not found: {image_source}"
                    }

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
                badge_text = f"⚠️ AI Fake ({ai_score}% Synthetic)"
                verdict = "WARNING: Deepfake or AI synthetic image detected. High risk of manipulation."
            else:
                label = "AUTHENTIC REAL PHOTO"
                status_color = "success"
                badge_text = f"🛡️ Real Photo ({authenticity_score}% Authentic)"
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
