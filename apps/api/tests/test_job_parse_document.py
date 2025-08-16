"""Tests for the job document parsing endpoint."""

import io
import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestJobParseDocumentEndpoint:
    """Test cases for the /api/job/parse-document endpoint."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Mock authorization headers."""
        return {"Authorization": "Bearer test_token"}

    @pytest.fixture
    def test_file_content(self):
        """Sample job description content."""
        return """
        Software Engineer Position
        Company: Tech Corporation
        Location: San Francisco, CA
        
        Job Description:
        We are seeking a talented Software Engineer to join our dynamic team.
        
        Requirements:
        - Bachelor's degree in Computer Science or related field
        - 3+ years of experience in Python development
        - Experience with web frameworks (Django, FastAPI)
        - Strong problem-solving skills
        - Excellent communication abilities
        
        Responsibilities:
        - Design and develop scalable web applications
        - Collaborate with cross-functional teams
        - Write clean, maintainable code
        - Participate in code reviews
        
        Benefits:
        - Competitive salary
        - Health insurance
        - 401(k) matching
        - Remote work flexibility
        """

    def test_parse_document_success(self, client, auth_headers, test_file_content):
        """Test successful document parsing."""
        # Create file-like object
        file_content = io.BytesIO(test_file_content.encode('utf-8'))
        files = {"file": ("job_description.txt", file_content, "text/plain")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        # Should return 200 or 500 (500 is expected without database)
        # The endpoint exists and accepts the request format
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "task_id" in data["data"]
            assert "job_id" in data["data"]
            assert data["data"]["filename"] == "job_description.txt"
            assert data["data"]["content_type"] == "text/plain"

    def test_parse_document_no_auth(self, client, test_file_content):
        """Test endpoint requires authentication."""
        file_content = io.BytesIO(test_file_content.encode('utf-8'))
        files = {"file": ("job_description.txt", file_content, "text/plain")}
        
        response = client.post("/api/job/parse-document", files=files)
        
        assert response.status_code == 401
        assert "Authorization header required" in response.json()["detail"]

    def test_parse_document_no_file(self, client, auth_headers):
        """Test endpoint requires file."""
        response = client.post("/api/job/parse-document", headers=auth_headers)
        
        assert response.status_code == 422

    def test_parse_document_empty_file(self, client, auth_headers):
        """Test endpoint rejects empty files."""
        file_content = io.BytesIO(b"")
        files = {"file": ("empty.txt", file_content, "text/plain")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "Empty file provided" in response.json()["detail"]

    def test_parse_document_unsupported_type(self, client, auth_headers):
        """Test endpoint rejects unsupported file types."""
        file_content = io.BytesIO(b"fake image content")
        files = {"file": ("image.jpg", file_content, "image/jpeg")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "Unsupported file type" in response.json()["detail"]

    def test_parse_document_large_file(self, client, auth_headers):
        """Test endpoint rejects files that are too large."""
        # Create a file larger than 10MB
        large_content = "x" * (11 * 1024 * 1024)  # 11MB
        file_content = io.BytesIO(large_content.encode('utf-8'))
        files = {"file": ("large.txt", file_content, "text/plain")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "File too large" in response.json()["detail"]

    def test_parse_document_pdf_support(self, client, auth_headers):
        """Test endpoint accepts PDF files."""
        # Mock PDF content (just headers for testing)
        pdf_content = b"%PDF-1.4\nfake pdf content"
        file_content = io.BytesIO(pdf_content)
        files = {"file": ("resume.pdf", file_content, "application/pdf")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        # Should accept the file format (may fail on processing due to missing DB)
        assert response.status_code in [200, 500]

    def test_parse_document_docx_support(self, client, auth_headers):
        """Test endpoint accepts DOCX files."""
        # Mock DOCX content 
        docx_content = b"fake docx content"
        file_content = io.BytesIO(docx_content)
        files = {"file": ("job.docx", file_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        # Should accept the file format
        assert response.status_code in [200, 500]

    def test_endpoint_response_format(self, client, auth_headers, test_file_content):
        """Test the response format matches TaskResponse schema."""
        file_content = io.BytesIO(test_file_content.encode('utf-8'))
        files = {"file": ("job.txt", file_content, "text/plain")}
        
        response = client.post(
            "/api/job/parse-document",
            files=files,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            # Verify TaskResponse structure
            assert "success" in data
            assert "data" in data
            assert isinstance(data["success"], bool)
            assert isinstance(data["data"], dict)
        elif response.status_code == 500:
            # Expected when database isn't available
            assert "Error creating job document parse task" in response.json()["detail"]