"""
LLM Provider Adapter
====================
THIS IS THE ONLY AUTHORIZED MODULE TO CALL LLM PROVIDERS DIRECTLY.

All other code MUST use the GuardedLLMGateway.
Direct LLM calls are FORBIDDEN elsewhere.

Uses OpenAI SDK directly for LLM access.
"""

import os
import logging
from typing import Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class LLMProviderAdapter:
    """
    Authorized LLM provider adapter using OpenAI SDK.
    
    This is the ONLY place where LLM SDK is used directly.
    All calls to this class MUST come through GuardedLLMGateway.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        
        # Model mapping for compatibility
        self.model_mapping = {
            "gpt-4o": "gpt-4o",
            "gpt-4o-mini": "gpt-4o-mini",
            "gpt-4": "gpt-4",
            "gpt-3.5-turbo": "gpt-4o-mini",  # Upgrade to gpt-4o-mini
        }
        
        logger.info("LLM Provider Adapter initialized with OpenAI SDK")
    
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o-mini",
        max_tokens: int = 1000,
        temperature: float = 0.3
    ) -> str:
        """
        Generate text using LLM via OpenAI SDK.
        
        THIS METHOD SHOULD ONLY BE CALLED BY GuardedLLMGateway.
        
        Args:
            system_prompt: System instructions
            user_prompt: User message/query
            model: Model to use
            max_tokens: Maximum output tokens
            temperature: Sampling temperature
            
        Returns:
            Generated text
        """
        try:
            # Map model to actual model name
            model_name = self.model_mapping.get(model, "gpt-4o-mini")
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"LLM provider error: {e}")
            raise


# Singleton instance
_llm_adapter: Optional[LLMProviderAdapter] = None


def get_llm_adapter(api_key: Optional[str] = None) -> LLMProviderAdapter:
    """Get or create singleton LLM adapter."""
    global _llm_adapter
    if _llm_adapter is None:
        _llm_adapter = LLMProviderAdapter(api_key)
    return _llm_adapter
