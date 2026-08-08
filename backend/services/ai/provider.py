from abc import ABC, abstractmethod
from typing import Dict, Any, List

class AIProvider(ABC):
    """Abstract interface for AI disaster guidance providers."""

    @abstractmethod
    def generate(self, prompt: str, context: Dict[str, Any], history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Generate response given assembled prompt, database context, and chat history.
        Must return structured dictionary with:
        {
          "answer": str,
          "provider": str, # "grok" or "local"
          "disaster": str
        }
        """
        pass

    @abstractmethod
    def supports_streaming(self) -> bool:
        """Returns True if provider supports token streaming."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Check provider status and availability."""
        pass
