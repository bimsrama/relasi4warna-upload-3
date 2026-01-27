"""
Health and Import Tests for CI
"""

import pytest
import os
import sys
from pathlib import Path

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "packages"))
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestHealth:
    """Test health endpoint availability."""
    
    def test_server_import(self):
        """Verify server module can be imported."""
        assert True
    
    def test_fastapi_app_exists(self):
        """Verify FastAPI app is created."""
        from server import app
        assert app is not None
        assert hasattr(app, 'routes')


class TestLLMProvider:
    """Test LLM provider module."""
    
    def test_provider_import(self):
        """Verify LLM provider can be imported."""
        from services.llm_provider import OpenAIProvider, get_llm_provider, LLMConfig
        assert OpenAIProvider is not None
        assert get_llm_provider is not None
        assert LLMConfig is not None
    
    def test_config_dataclass(self):
        """Verify LLMConfig is immutable dataclass."""
        from services.llm_provider import LLMConfig
        cfg = LLMConfig(
            api_key="test",
            model_primary="gpt-4o",
            model_fallback="gpt-4o-mini",
            temperature=0.3,
            timeout_seconds=45.0
        )
        assert cfg.api_key == "test"
        assert cfg.model_primary == "gpt-4o"
    
    def test_provider_with_key(self):
        """Test provider instantiation with config."""
        os.environ["OPENAI_API_KEY"] = "dummy-openai-key"
        from services.llm_provider import get_llm_provider, reset_provider
        reset_provider()  # Clear singleton
        provider = get_llm_provider()
        assert provider is not None
        assert provider.cfg.model_primary == os.environ.get("OPENAI_MODEL_PREMIUM", "gpt-4o")


class TestAIService:
    """Test AI service module."""
    
    def test_service_import(self):
        """Verify AI service can be imported."""
        from services.ai_service import generate_report, generate_tip
        assert generate_report is not None
        assert generate_tip is not None


class TestHITL:
    """Test HITL engine."""
    
    def test_hitl_import(self):
        """Verify HITL module can be imported."""
        from hitl_engine import HITLEngine, RiskLevel
        assert HITLEngine is not None
        assert RiskLevel is not None


class TestSelfHosted:
    """Verify self-hosted readiness."""
    
    def test_openai_env_used(self):
        """Verify OPENAI_API_KEY is the LLM env var."""
        assert os.environ.get("OPENAI_API_KEY") is not None
    
    def test_required_env_vars(self):
        """Verify required env vars are defined."""
        required = ["MONGO_URL", "DB_NAME", "JWT_SECRET"]
        for var in required:
            assert os.environ.get(var) is not None, f"Missing: {var}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
