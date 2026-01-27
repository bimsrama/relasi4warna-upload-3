"""
Pytest configuration for apps/api tests.
"""

import pytest
import os
import sys
from pathlib import Path

# Add paths
root_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(root_dir / "packages"))
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment variables
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-minimum-32-characters")
os.environ.setdefault("OPENAI_API_KEY", "dummy-openai-key-for-ci")
os.environ.setdefault("OPENAI_MODEL_PREMIUM", "gpt-4o")
os.environ.setdefault("OPENAI_MODEL_FALLBACK", "gpt-4o-mini")
os.environ.setdefault("MIDTRANS_SERVER_KEY", "test-server-key")
os.environ.setdefault("MIDTRANS_CLIENT_KEY", "test-client-key")


@pytest.fixture
def test_user():
    """Test user data fixture."""
    return {
        "user_id": "test_user_123",
        "email": "test@test.com",
        "name": "Test User",
        "tier": "free"
    }
