"""
AI Provider Implementation - OpenAI API wrapper with fallback support.
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from openai import OpenAI, AsyncOpenAI

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Generate text from prompts."""
        pass
    
    @abstractmethod
    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Generate text with conversation history."""
        pass


class OpenAIProvider(AIProvider):
    """OpenAI API provider with fallback support."""
    
    # Model mapping for compatibility
    MODEL_MAP = {
        "gpt-5.2": "gpt-4o",  # Map to available model
        "gpt-5.1": "gpt-4o",
        "gpt-4o": "gpt-4o",
        "gpt-4o-mini": "gpt-4o-mini",
        "gpt-4-turbo": "gpt-4-turbo",
        "gpt-4": "gpt-4",
        "gpt-3.5-turbo": "gpt-3.5-turbo",
    }
    
    FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize OpenAI provider.
        
        Args:
            api_key: OpenAI API key. If not provided, reads from OPENAI_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable.")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.sync_client = OpenAI(api_key=self.api_key)
    
    def _resolve_model(self, model: str) -> str:
        """Resolve model name to actual OpenAI model."""
        return self.MODEL_MAP.get(model, model)
    
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Generate text from prompts with automatic fallback.
        
        Args:
            system_prompt: System message to set context
            user_prompt: User message/query
            model: Model to use (will be mapped to available model)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            
        Returns:
            Generated text response
        """
        resolved_model = self._resolve_model(model)
        models_to_try = [resolved_model] + [m for m in self.FALLBACK_MODELS if m != resolved_model]
        
        last_error = None
        for try_model in models_to_try:
            try:
                logger.info(f"Attempting generation with model: {try_model}")
                response = await self.client.chat.completions.create(
                    model=try_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                content = response.choices[0].message.content
                logger.info(f"Generation successful with model: {try_model}")
                return content or ""
                
            except Exception as e:
                last_error = e
                logger.warning(f"Model {try_model} failed: {e}")
                continue
        
        raise RuntimeError(f"All models failed. Last error: {last_error}")
    
    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Generate text with conversation history.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            Generated text response
        """
        resolved_model = self._resolve_model(model)
        models_to_try = [resolved_model] + [m for m in self.FALLBACK_MODELS if m != resolved_model]
        
        last_error = None
        for try_model in models_to_try:
            try:
                response = await self.client.chat.completions.create(
                    model=try_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                return response.choices[0].message.content or ""
                
            except Exception as e:
                last_error = e
                logger.warning(f"Model {try_model} failed: {e}")
                continue
        
        raise RuntimeError(f"All models failed. Last error: {last_error}")
    
    def generate_sync(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Synchronous generation for non-async contexts."""
        resolved_model = self._resolve_model(model)
        
        response = self.sync_client.chat.completions.create(
            model=resolved_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content or ""


# Singleton instance
_provider_instance: Optional[AIProvider] = None


def get_ai_provider(api_key: Optional[str] = None) -> AIProvider:
    """Get or create AI provider instance.
    
    Args:
        api_key: Optional API key (uses env var if not provided)
        
    Returns:
        AIProvider instance
    """
    global _provider_instance
    
    if _provider_instance is None:
        _provider_instance = OpenAIProvider(api_key)
    
    return _provider_instance


def reset_provider():
    """Reset provider instance (useful for testing)."""
    global _provider_instance
    _provider_instance = None
