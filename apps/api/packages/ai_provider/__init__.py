"""
AI Provider Package - Abstraction layer for LLM interactions.
Supports OpenAI API with fallback models.
"""

from .provider import AIProvider, OpenAIProvider, get_ai_provider

__all__ = ["AIProvider", "OpenAIProvider", "get_ai_provider"]
