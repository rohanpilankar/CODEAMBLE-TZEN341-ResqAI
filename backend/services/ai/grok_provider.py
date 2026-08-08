import json
import urllib.request
import urllib.error
from typing import Dict, Any, List
from backend.config import settings
from backend.services.ai.provider import AIProvider
from backend.services.ai.prompt_builder import PromptBuilder
from backend.utils.logger import app_logger

class GrokAPIException(Exception):
    """Custom exception raised when Grok API encounters errors."""
    pass

class GrokProvider(AIProvider):
    """Grok AI Provider interfacing with xAI API (https://api.x.ai/v1/chat/completions).
    Handles authentication, timeouts, retries, and error handling.
    Does NOT query database directly.
    """

    def __init__(self):
        self.api_key = settings.GROK_API_KEY.strip()
        self.timeout = settings.GROK_TIMEOUT
        self.prompt_builder = PromptBuilder()

        # Auto-detect Groq (gsk_) vs xAI (xai-) endpoint
        if self.api_key.startswith("gsk_"):
            self.api_url = "https://api.groq.com/openai/v1/chat/completions"
            self.model = "llama-3.3-70b-versatile"
        else:
            self.api_url = settings.GROK_API_URL
            self.model = settings.GROK_MODEL

    def generate(self, prompt: str, context: Dict[str, Any], history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Send chat completion request to xAI Grok API using urllib.request."""
        if not self.api_key:
            raise GrokAPIException("GROK_API_KEY is not configured in settings.")

        messages = self.prompt_builder.build_prompt(prompt, context, history)

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1000
        }
        json_bytes = json.dumps(payload).encode("utf-8")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ResQAI-DisasterAssistant/1.0"
        }

        req = urllib.request.Request(self.api_url, data=json_bytes, headers=headers, method="POST")

        max_retries = 2
        last_err = None

        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    if resp.status == 200:
                        body = resp.read().decode("utf-8")
                        data = json.loads(body)
                        choices = data.get("choices", [])
                        if choices:
                            answer_text = choices[0].get("message", {}).get("content", "").strip()
                            return {
                                "answer": answer_text,
                                "provider": "grok",
                                "model": self.model,
                                "raw_response": data
                            }
                        else:
                            raise GrokAPIException("Empty response choices received from Grok API.")
                    else:
                        last_err = f"HTTP {resp.status}"

            except urllib.error.HTTPError as e:
                err_msg = e.read().decode("utf-8", errors="ignore")
                app_logger.warning(f"Grok API HTTP error {e.code}: {err_msg}")
                last_err = f"HTTP {e.code}: {err_msg}"
            except Exception as e:
                app_logger.warning(f"Grok API exception (Attempt {attempt+1}/{max_retries}): {e}")
                last_err = str(e)

        raise GrokAPIException(f"Grok API failed after retries. Reason: {last_err}")

    def supports_streaming(self) -> bool:
        return False

    def health(self) -> Dict[str, Any]:
        return {
            "provider": "grok",
            "configured": bool(self.api_key),
            "model": self.model,
            "status": "active" if bool(self.api_key) else "no_api_key"
        }
