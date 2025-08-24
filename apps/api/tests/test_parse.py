import io
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import parse
from app.dependencies import get_current_user


@patch("app.routers.parse.ResumeProcessorService")
def test_parse_resume_pdf_success(mock_processor_class):
    # Mock the resume processor service and its sync method
    mock_processor = MagicMock()
    mock_result = {
        "resume_id": "resume-123",
        "user_id": "user-123",
        "resume_data": {
            "contact_info": {
                "full_name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "123-456-7890",
            },
            "summary": "Experienced software engineer",
            "education": [],
            "work_experience": [
                {
                    "company": "Tech Corp",
                    "position": "Software Engineer",
                    "start_date": "2020-01-01",
                    "is_current": True,
                    "skills": ["Python", "FastAPI", "PostgreSQL"],
                }
            ],
            "certifications": [],
            "skills": ["Python", "Java", "FastAPI", "Spring Boot"],
        },
        "file_metadata": {
            "filename": "resume.pdf",
            "content_type": "application/pdf",
            "size": 25,
        },
        "status": "completed"
    }
    
    mock_processor.process_resume_sync = AsyncMock(return_value=mock_result)
    mock_processor_class.return_value = mock_processor

    # Create test app with mocked dependencies
    app = FastAPI()
    app.include_router(parse.router, prefix="/api")
    
    # Mock current user
    mock_user = {"id": "user-123", "email": "test@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)

    # Create a mock PDF file
    test_file = io.BytesIO(b"%PDF-1.5 mock pdf content")

    # Make the request
    response = client.post(
        "/api/parse", files={"file": ("resume.pdf", test_file, "application/pdf")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["success"] is True
    assert response_data["data"]["resume_data"]["contact_info"]["full_name"] == "John Doe"
    assert "Experienced software engineer" in response_data["data"]["resume_data"]["summary"]
    assert "Python" in response_data["data"]["resume_data"]["skills"]
    assert "Java" in response_data["data"]["resume_data"]["skills"]
    assert response_data["data"]["status"] == "completed"

    # Verify processor was called correctly
    mock_processor.process_resume_sync.assert_called_once()


@patch("app.routers.parse.ResumeProcessorService")
def test_parse_resume_text_success(mock_processor_class):
    # Mock the resume processor service and its sync method
    mock_processor = MagicMock()
    mock_result = {
        "resume_id": "resume-456",
        "user_id": "user-456",
        "resume_data": {
            "contact_info": {
                "full_name": "Jane Smith",
                "email": "jane.smith@example.com",
                "phone": "555-123-4567",
            },
            "summary": "Senior developer with 10 years experience",
            "education": [
                {
                    "institution": "State University",
                    "degree": "Bachelor of Science",
                    "field_of_study": "Computer Science",
                    "skills": ["Data Structures", "Algorithms"],
                }
            ],
            "work_experience": [
                {
                    "company": "Software Solutions Inc",
                    "position": "Senior Developer",
                    "start_date": "2014-03-01",
                    "is_current": True,
                    "skills": ["Java", "Spring", "Kubernetes"],
                }
            ],
            "certifications": [],
            "skills": ["Java", "Spring", "Kubernetes", "Docker"],
        },
        "file_metadata": {
            "filename": "resume.txt",
            "content_type": "text/plain",
            "size": 56,
        },
        "status": "completed"
    }
    
    mock_processor.process_resume_sync = AsyncMock(return_value=mock_result)
    mock_processor_class.return_value = mock_processor

    # Create test app with mocked dependencies
    app = FastAPI()
    app.include_router(parse.router, prefix="/api")
    
    # Mock current user
    mock_user = {"id": "user-456", "email": "test2@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)

    # Create a mock text file
    test_file = io.BytesIO(
        b"Jane Smith\nSenior Developer\nSkills: Java, Spring, Kubernetes"
    )

    # Make the request
    response = client.post(
        "/api/parse", files={"file": ("resume.txt", test_file, "text/plain")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["success"] is True
    assert response_data["data"]["resume_data"]["contact_info"]["full_name"] == "Jane Smith"
    assert "Senior developer" in response_data["data"]["resume_data"]["summary"]
    assert "Java" in response_data["data"]["resume_data"]["skills"]
    assert "Spring" in response_data["data"]["resume_data"]["skills"]
    assert response_data["data"]["status"] == "completed"


@patch("app.routers.parse.ResumeProcessorService")
def test_parse_resume_markdown_success(mock_processor_class):
    # Mock the resume processor service and its sync method
    mock_processor = MagicMock()
    mock_result = {
        "resume_id": "resume-789",
        "user_id": "user-789",
        "resume_data": {
            "contact_info": {
                "full_name": "Alex Johnson",
                "email": "alex.johnson@example.com",
                "phone": "777-888-9999",
            },
            "summary": "Full-stack developer specializing in web applications",
            "education": [
                {
                    "institution": "Web Development Bootcamp",
                    "degree": "Certificate",
                    "field_of_study": "Full Stack Development",
                    "skills": ["HTML", "CSS", "JavaScript"],
                }
            ],
            "work_experience": [
                {
                    "company": "Digital Agency",
                    "position": "Full Stack Developer",
                    "start_date": "2021-06-01",
                    "is_current": True,
                    "skills": ["React", "Node.js", "MongoDB"],
                }
            ],
            "certifications": [
                {"name": "React Developer Certification", "issuer": "React Training"}
            ],
            "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Express"],
        },
        "file_metadata": {
            "filename": "resume.md",
            "content_type": "text/markdown",
            "size": 62,
        },
        "status": "completed"
    }
    
    mock_processor.process_resume_sync = AsyncMock(return_value=mock_result)
    mock_processor_class.return_value = mock_processor

    # Create test app with mocked dependencies
    app = FastAPI()
    app.include_router(parse.router, prefix="/api")
    
    # Mock current user
    mock_user = {"id": "user-789", "email": "test3@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)

    # Create a mock markdown file
    test_file = io.BytesIO(
        b"# Alex Johnson\n\n## Skills\n- React\n- Node.js\n- MongoDB"
    )

    # Make the request
    response = client.post(
        "/api/parse", files={"file": ("resume.md", test_file, "text/markdown")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["success"] is True
    assert (
        response_data["data"]["resume_data"]["contact_info"]["full_name"] == "Alex Johnson"
    )
    assert "web applications" in response_data["data"]["resume_data"]["summary"]
    assert "React" in response_data["data"]["resume_data"]["skills"]
    assert "Node.js" in response_data["data"]["resume_data"]["skills"]
    assert response_data["data"]["status"] == "completed"


def test_parse_resume_unsupported_file_type():
    # Create test app with mocked dependencies  
    app = FastAPI()
    app.include_router(parse.router, prefix="/api")
    
    # Mock current user
    mock_user = {"id": "user-unsupported", "email": "test@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)

    # Create a mock HTML file
    test_file = io.BytesIO(b"<html><body>Resume content</body></html>")

    # Make the request
    response = client.post(
        "/api/parse", files={"file": ("resume.html", test_file, "text/html")}
    )

    # Verify response indicates validation error
    assert response.status_code == 422
    assert "Unsupported file type" in response.json()["detail"]
