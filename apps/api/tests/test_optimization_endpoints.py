"""Tests for optimization, scoring, and research endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.routers.optimize import router, get_current_user, get_optimization_service


@pytest.fixture
def mock_optimization_service():
    """Mock optimization service."""
    mock = AsyncMock()

    # Mock successful task creation responses
    mock.create_optimization_task.return_value = {
        "task_id": "task_123",
        "document_id": "doc_123",
        "resume_id": "resume_123",
        "job_id": "job_123",
    }

    mock.create_scoring_task.return_value = {
        "task_id": "task_456",
        "resume_id": "resume_123",
        "job_id": "job_123",
    }

    mock.create_research_task.return_value = {
        "task_id": "task_789",
        "document_id": "doc_789",
        "resume_id": "resume_123",
        "job_id": "job_123",
    }

    return mock


@pytest.fixture
def mock_current_user():
    """Mock current user."""
    return {"id": "user_123", "email": "user@example.com"}


@pytest.fixture
def test_app(mock_optimization_service, mock_current_user):
    """Create test FastAPI app with mocked dependencies."""
    app = FastAPI()
    app.include_router(router, prefix="/api")

    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[get_optimization_service] = (
        lambda: mock_optimization_service
    )

    return app


@pytest.fixture
def client(test_app):
    """Create test client."""
    return TestClient(test_app)


@pytest.fixture
def unauth_app(mock_optimization_service):
    """Create test FastAPI app without authentication override."""
    app = FastAPI()
    app.include_router(router, prefix="/api")

    # Only override the optimization service, keep auth dependency as-is
    app.dependency_overrides[get_optimization_service] = (
        lambda: mock_optimization_service
    )

    return app


@pytest.fixture
def unauth_client(unauth_app):
    """Create test client without authentication override."""
    return TestClient(unauth_app)


class TestOptimizeEndpoint:
    """Test suite for /api/optimize endpoint."""

    def test_optimize_success(self, client, mock_optimization_service):
        """Test successful optimization request."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["data"]["task_id"] == "task_123"
        assert data["data"]["document_id"] == "doc_123"
        assert data["data"]["resume_id"] == "resume_123"
        assert data["data"]["job_id"] == "job_123"

        # Verify service was called correctly
        mock_optimization_service.create_optimization_task.assert_called_once_with(
            resume_id="resume_123", job_id="job_123", user_id="user_123"
        )

    def test_optimize_missing_authorization(self, unauth_client):
        """Test optimization request without authorization header."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = unauth_client.post("/api/optimize", json=payload)

        assert response.status_code == 401
        assert "Authorization header required" in response.json()["detail"]

    def test_optimize_validation_error(self, client, mock_optimization_service):
        """Test optimization request with validation error."""
        mock_optimization_service.create_optimization_task.side_effect = ValueError(
            "Resume resume_123 not found or unauthorized"
        )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 400
        assert (
            "Resume resume_123 not found or unauthorized" in response.json()["detail"]
        )

    def test_optimize_internal_error(self, client, mock_optimization_service):
        """Test optimization request with internal error."""
        mock_optimization_service.create_optimization_task.side_effect = Exception(
            "Internal service error"
        )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 500
        assert "Error creating optimization task" in response.json()["detail"]

    def test_optimize_invalid_payload(self, client):
        """Test optimization request with invalid payload."""
        payload = {
            "resume_id": "resume_123"
            # Missing job_id
        }

        response = client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 422  # Validation error

    def test_optimize_empty_strings(self, client, mock_optimization_service):
        """Test optimization request with empty string IDs."""
        payload = {"resume_id": "", "job_id": ""}

        response = client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        # Should still call service (let service handle validation)
        assert response.status_code == 200
        mock_optimization_service.create_optimization_task.assert_called_once_with(
            resume_id="", job_id="", user_id="user_123"
        )


class TestScoreEndpoint:
    """Test suite for /api/score endpoint."""

    def test_score_success(self, client, mock_optimization_service):
        """Test successful scoring request."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/score", json=payload, headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["data"]["task_id"] == "task_456"
        assert data["data"]["resume_id"] == "resume_123"
        assert data["data"]["job_id"] == "job_123"
        assert "document_id" not in data["data"]  # Score doesn't return document_id

        # Verify service was called correctly
        mock_optimization_service.create_scoring_task.assert_called_once_with(
            resume_id="resume_123", job_id="job_123", user_id="user_123"
        )

    def test_score_missing_authorization(self, unauth_client):
        """Test scoring request without authorization header."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = unauth_client.post("/api/score", json=payload)

        assert response.status_code == 401
        assert "Authorization header required" in response.json()["detail"]

    def test_score_validation_error(self, client, mock_optimization_service):
        """Test scoring request with validation error."""
        mock_optimization_service.create_scoring_task.side_effect = ValueError(
            "Job job_123 not found or unauthorized"
        )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/score", json=payload, headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 400
        assert "Job job_123 not found or unauthorized" in response.json()["detail"]

    def test_score_internal_error(self, client, mock_optimization_service):
        """Test scoring request with internal error."""
        mock_optimization_service.create_scoring_task.side_effect = Exception(
            "Database connection failed"
        )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/score", json=payload, headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 500
        assert "Error creating scoring task" in response.json()["detail"]


class TestResearchEndpoint:
    """Test suite for /api/research endpoint."""

    def test_research_success(self, client, mock_optimization_service):
        """Test successful research request."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/research",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["data"]["task_id"] == "task_789"
        assert data["data"]["document_id"] == "doc_789"
        assert data["data"]["resume_id"] == "resume_123"
        assert data["data"]["job_id"] == "job_123"

        # Verify service was called correctly
        mock_optimization_service.create_research_task.assert_called_once_with(
            resume_id="resume_123", job_id="job_123", user_id="user_123"
        )

    def test_research_missing_authorization(self, unauth_client):
        """Test research request without authorization header."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = unauth_client.post("/api/research", json=payload)

        assert response.status_code == 401
        assert "Authorization header required" in response.json()["detail"]

    def test_research_validation_error(self, client, mock_optimization_service):
        """Test research request with validation error."""
        mock_optimization_service.create_research_task.side_effect = ValueError(
            "Both resume and job not found"
        )

        payload = {"resume_id": "invalid_resume", "job_id": "invalid_job"}

        response = client.post(
            "/api/research",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 400
        assert "Both resume and job not found" in response.json()["detail"]

    def test_research_internal_error(self, client, mock_optimization_service):
        """Test research request with internal error."""
        mock_optimization_service.create_research_task.side_effect = Exception(
            "ArangoDB connection failed"
        )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        response = client.post(
            "/api/research",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 500
        assert "Error creating research task" in response.json()["detail"]


class TestEndpointIntegration:
    """Integration tests for optimization endpoints."""

    def test_all_endpoints_require_authorization(self, unauth_client):
        """Test that all endpoints require authorization."""
        payload = {"resume_id": "test", "job_id": "test"}

        endpoints = ["/api/optimize", "/api/score", "/api/research"]

        for endpoint in endpoints:
            response = unauth_client.post(endpoint, json=payload)
            assert response.status_code == 401
            assert "Authorization header required" in response.json()["detail"]

    def test_all_endpoints_validate_payload(self, client):
        """Test that all endpoints validate request payload."""
        endpoints = ["/api/optimize", "/api/score", "/api/research"]

        for endpoint in endpoints:
            # Test completely missing payload
            response = client.post(
                endpoint, json={}, headers={"Authorization": "Bearer test_token"}
            )
            assert response.status_code == 422  # Validation error

            # Test partial payload
            response = client.post(
                endpoint,
                json={"resume_id": "test"},  # Missing job_id
                headers={"Authorization": "Bearer test_token"},
            )
            assert response.status_code == 422  # Validation error

    def test_response_format_consistency(self, client, mock_optimization_service):
        """Test that all endpoints return consistent response format."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        endpoints = ["/api/optimize", "/api/score", "/api/research"]

        for endpoint in endpoints:
            response = client.post(
                endpoint, json=payload, headers={"Authorization": "Bearer test_token"}
            )

            assert response.status_code == 200
            data = response.json()

            # All should have success field
            assert "success" in data
            assert data["success"] is True

            # All should have data field
            assert "data" in data
            assert isinstance(data["data"], dict)

            # All should have task_id
            assert "task_id" in data["data"]
            assert data["data"]["resume_id"] == "resume_123"
            assert data["data"]["job_id"] == "job_123"

    def test_error_response_consistency(self, client, mock_optimization_service):
        """Test that all endpoints return consistent error responses."""
        # Mock validation errors for all services
        mock_optimization_service.create_optimization_task.side_effect = ValueError(
            "Validation failed"
        )
        mock_optimization_service.create_scoring_task.side_effect = ValueError(
            "Validation failed"
        )
        mock_optimization_service.create_research_task.side_effect = ValueError(
            "Validation failed"
        )

        payload = {"resume_id": "invalid", "job_id": "invalid"}
        endpoints = ["/api/optimize", "/api/score", "/api/research"]

        for endpoint in endpoints:
            response = client.post(
                endpoint, json=payload, headers={"Authorization": "Bearer test_token"}
            )

            assert response.status_code == 400
            error_data = response.json()
            assert "detail" in error_data
            assert "Validation failed" in error_data["detail"]

    def test_concurrent_requests(self, client, mock_optimization_service):
        """Test handling of concurrent requests to different endpoints."""
        import concurrent.futures
        import threading

        def make_request(endpoint, payload):
            return client.post(
                endpoint,
                json=payload,
                headers={"Authorization": "Bearer test_token"},
            )

        payload = {"resume_id": "resume_123", "job_id": "job_123"}
        endpoints = ["/api/optimize", "/api/score", "/api/research"]

        # Use ThreadPoolExecutor to simulate concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(make_request, endpoint, payload)
                for endpoint in endpoints
            ]

            responses = [
                future.result() for future in concurrent.futures.as_completed(futures)
            ]

        # All should succeed
        assert len(responses) == 3
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True


class TestOptimizationServiceIntegration:
    """Test integration with optimization service."""

    def test_service_method_mapping(self, client, mock_optimization_service):
        """Test that endpoints call correct service methods."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        # Test optimize endpoint
        client.post(
            "/api/optimize",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )
        mock_optimization_service.create_optimization_task.assert_called_once()

        # Test score endpoint
        client.post(
            "/api/score", json=payload, headers={"Authorization": "Bearer test_token"}
        )
        mock_optimization_service.create_scoring_task.assert_called_once()

        # Test research endpoint
        client.post(
            "/api/research",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )
        mock_optimization_service.create_research_task.assert_called_once()

    def test_user_id_propagation(
        self, client, mock_optimization_service, mock_current_user
    ):
        """Test that user ID is correctly propagated to service calls."""
        payload = {"resume_id": "resume_123", "job_id": "job_123"}

        # Test all endpoints
        endpoints_and_methods = [
            ("/api/optimize", mock_optimization_service.create_optimization_task),
            ("/api/score", mock_optimization_service.create_scoring_task),
            ("/api/research", mock_optimization_service.create_research_task),
        ]

        for endpoint, method in endpoints_and_methods:
            method.reset_mock()

            client.post(
                endpoint, json=payload, headers={"Authorization": "Bearer test_token"}
            )

            method.assert_called_once_with(
                resume_id="resume_123",
                job_id="job_123",
                user_id=mock_current_user["id"],
            )

    def test_request_data_propagation(self, client, mock_optimization_service):
        """Test that request data is correctly propagated."""
        test_cases = [
            {"resume_id": "resume_456", "job_id": "job_789"},
            {"resume_id": "another_resume", "job_id": "another_job"},
        ]

        for payload in test_cases:
            # Reset mocks
            mock_optimization_service.reset_mock()

            # Test optimize endpoint
            client.post(
                "/api/optimize",
                json=payload,
                headers={"Authorization": "Bearer test_token"},
            )

            mock_optimization_service.create_optimization_task.assert_called_once_with(
                resume_id=payload["resume_id"],
                job_id=payload["job_id"],
                user_id="user_123",
            )
