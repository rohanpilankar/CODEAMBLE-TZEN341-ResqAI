from typing import Dict, Any, List

class PromptBuilder:
    """Assembles structured system instructions, database context, and user prompt for LLM consumption."""

    SYSTEM_PROMPT = (
        "You are ResQ Bot, an intelligent, empathetic, and ultra-fast disaster response AI assistant.\n"
        "Your mission is to provide clear, actionable, and life-saving guidance for any disaster or safety query.\n"
        "Guidelines:\n"
        "1. Be direct, clear, and natural. Do NOT repeat boilerplate intro sentences or rigid fixed templates.\n"
        "2. Answer the specific question asked by the citizen directly.\n"
        "3. Use clean markdown formatting (bullet points, bold text) for easy scanning in emergencies.\n"
        "4. Leverage the DATABASE CONTEXT below for accurate local shelters, hospitals, or contacts when relevant.\n"
        "5. Keep responses concise, practical, and distinct.\n"
        "6. Do NOT use any emojis, stickers, or emoticons in your response text."
    )

    def build_prompt(self, user_message: str, context: Dict[str, Any], history: List[Dict[str, str]] = None) -> List[Dict[str, str]]:
        """Constructs OpenAI/Grok compatible system and user message list."""
        context_str = self.format_context(context)
        
        system_content = f"{self.SYSTEM_PROMPT}\n\nDATABASE CONTEXT:\n{context_str}"
        
        messages = [{"role": "system", "content": system_content}]
        
        if history:
            # Include recent chat history (up to last 8 turns)
            for h in history[-8:]:
                role = "user" if h.get("sender") == "user" or h.get("role") == "user" else "assistant"
                text = h.get("text") or h.get("content") or ""
                if text:
                    messages.append({"role": role, "content": text})
                    
        messages.append({"role": "user", "content": user_message})
        return messages

    def format_context(self, context: Dict[str, Any]) -> str:
        """Formats context JSON into concise text block for LLM prompt."""
        lines = []
        
        shelters = context.get("shelters", [])
        if shelters:
            lines.append("AVAILABLE ACTIVE SHELTERS:")
            for s in shelters[:4]:
                lines.append(f"- {s.get('name')} | Address: {s.get('address')} | Phone: {s.get('contact_phone')} | Available Beds: {s.get('available_beds')}/{s.get('total_capacity')} | Distance: {s.get('distance_km')} km")
        else:
            lines.append("AVAILABLE ACTIVE SHELTERS: None currently registered in local sector.")

        alerts = context.get("alerts", [])
        if alerts:
            lines.append("\nACTIVE LOCAL DISASTER ALERTS:")
            for a in alerts[:3]:
                lines.append(f"- [{a.get('severity')}] {a.get('title')} ({a.get('disaster_type')}) - Status: {a.get('status')}")

        contacts = context.get("contacts", [])
        if contacts:
            lines.append("\nEMERGENCY HELPLINES & CONTACTS:")
            for c in contacts[:5]:
                lines.append(f"- {c.get('agency_name')} ({c.get('category')}): {c.get('phone_number')}")
        else:
            lines.append("\nEMERGENCY HELPLINES: Police: 100 | Fire: 101 | Ambulance: 108 | Disaster Control: 1916")

        hospitals = context.get("hospitals", [])
        if hospitals:
            lines.append("\nNEARBY HOSPITALS:")
            for h in hospitals[:3]:
                lines.append(f"- {h.get('name')} | Phone: {h.get('phone')} | Available Beds: {h.get('available_beds')}")

        return "\n".join(lines)
