import os
from unittest.mock import patch

import pytest


# Ensure GEMINI_API_KEY environment variable is set for tests
@pytest.fixture(autouse=True)
def mock_env_variables():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "test_api_key"}):
        yield
