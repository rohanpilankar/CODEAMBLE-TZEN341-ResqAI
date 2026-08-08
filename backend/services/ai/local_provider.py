import os
import json
from typing import Dict, Any, List
from backend.services.ai.provider import AIProvider
from backend.utils.logger import app_logger

class LocalProvider(AIProvider):
    """Offline Disaster Knowledge Engine.
    Detects disaster topic via NLP keyword matching and returns comprehensive safety guides,
    evacuation steps, first-aid, emergency checklists, and nearby shelter recommendations.
    """

    def __init__(self, data_dir: str = "backend/data/disasters"):
        self.data_dir = os.path.abspath(data_dir)
        self.guides = self._load_guides()

    def _load_guides(self) -> Dict[str, Dict[str, Any]]:
        guides = {}
        if not os.path.exists(self.data_dir):
            app_logger.warning(f"LocalProvider data directory missing: {self.data_dir}")
            return guides

        for fname in os.listdir(self.data_dir):
            if fname.endswith(".json"):
                key = fname.replace(".json", "").lower()
                try:
                    fpath = os.path.join(self.data_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        guides[key] = json.load(f)
                except Exception as e:
                    app_logger.error(f"Error loading disaster guide {fname}: {e}")
        return guides

    def detect_disaster(self, query: str) -> str:
        """Detect disaster topic from query keywords."""
        q = query.lower()
        if any(w in q for w in ["flood", "water", "drowning", "submerge", "river", "inundat"]):
            return "flood"
        elif any(w in q for w in ["earthquake", "quake", "tremor", "shake", "shaking", "building collapse"]):
            return "earthquake"
        elif any(w in q for w in ["fire", "burn", "smoke", "flame", "explosion", "blaze"]):
            return "fire"
        elif any(w in q for w in ["cyclone", "storm", "hurricane", "typhoon", "gale", "wind"]):
            return "cyclone"
        elif any(w in q for w in ["landslide", "mudslide", "rockfall", "slope", "hill collapse"]):
            return "landslide"
        elif any(w in q for w in ["tsunami", "sea wave", "ocean wave", "drawback"]):
            return "tsunami"
        elif any(w in q for w in ["gas", "leak", "chemical", "toxic", "fume", "poisonous"]):
            return "gas_leak"
        elif any(w in q for w in ["medical", "injury", "injure", "bleed", "fracture", "cpr", "first aid", "doctor", "health", "hospital"]):
            return "medical"
        return "flood" # default fallback

    def generate(self, prompt: str, context: Dict[str, Any], history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Synthesize concise offline AI response based on disaster guide + database context."""
        disaster_key = self.detect_disaster(prompt)
        guide = self.guides.get(disaster_key) or self.guides.get("flood", {})
        p_lower = prompt.lower()

        title = guide.get("title", f"{disaster_key.capitalize()} Safety Guide")
        precautions = guide.get("precautions", [])
        evacuation = guide.get("evacuation", [])
        first_aid = guide.get("firstAid", [])
        checklist = guide.get("emergencyChecklist", [])

        shelters = context.get("shelters", [])
        contacts = context.get("contacts", [])

        is_shelter_query = any(w in p_lower for w in ["shelter", "safe", "camp", "stay", "where", "evacuat", "location"])
        is_first_aid_query = any(w in p_lower for w in ["first aid", "bleed", "injur", "cut", "wound", "medical", "burn", "cpr"])
        is_checklist_query = any(w in p_lower for w in ["pack", "kit", "bag", "bring", "supply", "checklist", "items"])
        is_contact_query = any(w in p_lower for w in ["contact", "call", "number", "phone", "help", "police", "fire", "ambulance", "helpline"])

        answer_lines = []

        if is_shelter_query and shelters:
            top_s = shelters[0]
            answer_lines.append(f"🏰 **Nearest Active Safety Shelter: {top_s['name']}**\n")
            answer_lines.append(f"• **Address**: {top_s['address']}")
            answer_lines.append(f"• **Distance**: {top_s.get('distance_km', 0)} km")
            answer_lines.append(f"• **Available Beds**: {top_s.get('available_beds', 0)} / {top_s.get('total_capacity', 100)}")
            answer_lines.append(f"• **Helpline**: {top_s.get('contact_phone', '108')}\n")
            answer_lines.append("Follow designated evacuation routes and reach the shelter safely.")
        elif is_first_aid_query and first_aid:
            answer_lines.append(f"🩺 **First Aid Instructions ({guide.get('disaster', 'Emergency')}):**\n")
            for idx, step in enumerate(first_aid[:4], 1):
                answer_lines.append(f"{idx}. {step}")
            answer_lines.append("\n⚠️ *Call 108 immediately for severe medical emergencies.*")
        elif is_checklist_query and checklist:
            answer_lines.append(f"🎒 **Essential Emergency Go-Bag Checklist:**\n")
            for step in checklist:
                answer_lines.append(f"• {step}")
        else:
            answer_lines.append(f"🚨 **{title}**\n")
            answer_lines.append(f"{guide.get('summary', 'Prioritize human safety immediately.')}\n")
            answer_lines.append("**Key Action Steps:**")
            for idx, step in enumerate(precautions[:4], 1):
                answer_lines.append(f"{idx}. {step}")

        answer_text = "\n".join(answer_lines)

        return {
            "answer": answer_text,
            "provider": "local",
            "disaster": guide.get("disaster", disaster_key.capitalize()),
            "shelters": shelters[:3] if is_shelter_query else [],
            "contacts": contacts[:4] if is_contact_query else [],
            "checklist": checklist if is_checklist_query else [],
            "firstAid": first_aid if is_first_aid_query else []
        }

    def supports_streaming(self) -> bool:
        return False

    def health(self) -> Dict[str, Any]:
        return {
            "provider": "local",
            "guides_loaded": len(self.guides),
            "status": "healthy"
        }
