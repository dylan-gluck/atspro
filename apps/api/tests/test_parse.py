import io
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@patch("app.routers.parse.partition")
@patch("app.routers.parse.Runner.run")
def test_parse_resume_pdf_success(mock_runner, mock_partition):
    # Mock the agent runner response with simplified Resume structure
    mock_result = MagicMock()
    mock_result.final_output = {
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
    }
    mock_runner.return_value = mock_result

    # Mock the partition function to return simple text elements
    mock_partition.return_value = ["John Doe", "Software Engineer", "Python Developer"]

    # Create a mock PDF file
    test_file = io.BytesIO(b"%PDF-1.5 mock pdf content")

    # Make the request
    response = client.put(
        "/parse", files={"file": ("resume.pdf", test_file, "application/pdf")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == 200
    assert response_data["data"]["resume"]["contact_info"]["full_name"] == "John Doe"
    assert "Experienced software engineer" in response_data["data"]["resume"]["summary"]
    assert "Python" in response_data["data"]["resume"]["skills"]
    assert "Java" in response_data["data"]["resume"]["skills"]

    # Verify Runner was called correctly
    mock_runner.assert_called_once()


@patch("app.routers.parse.partition")
@patch("app.routers.parse.Runner.run")
def test_parse_resume_text_success(mock_runner, mock_partition):
    # Mock the agent runner response with simplified Resume structure
    mock_result = MagicMock()
    mock_result.final_output = {
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
    }
    mock_runner.return_value = mock_result

    # Mock the partition function to return simple text elements
    mock_partition.return_value = ["Jane Smith", "Senior Developer", "Java Spring"]

    # Create a mock text file
    test_file = io.BytesIO(
        b"Jane Smith\nSenior Developer\nSkills: Java, Spring, Kubernetes"
    )

    # Make the request
    response = client.put(
        "/parse", files={"file": ("resume.txt", test_file, "text/plain")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == 200
    assert response_data["data"]["resume"]["contact_info"]["full_name"] == "Jane Smith"
    assert "Senior developer" in response_data["data"]["resume"]["summary"]
    assert "Java" in response_data["data"]["resume"]["skills"]
    assert "Spring" in response_data["data"]["resume"]["skills"]


@patch("app.routers.parse.partition")
@patch("app.routers.parse.Runner.run")
def test_parse_resume_markdown_success(mock_runner, mock_partition):
    # Mock the agent runner response with simplified Resume structure
    mock_result = MagicMock()
    mock_result.final_output = {
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
    }
    mock_runner.return_value = mock_result

    # Mock the partition function to return simple text elements
    mock_partition.return_value = [
        "Alex Johnson",
        "Full-stack Developer",
        "React Node.js",
    ]

    # Create a mock markdown file
    test_file = io.BytesIO(
        b"# Alex Johnson\n\n## Skills\n- React\n- Node.js\n- MongoDB"
    )

    # Make the request
    response = client.put(
        "/parse", files={"file": ("resume.md", test_file, "text/markdown")}
    )

    # Verify response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == 200
    assert (
        response_data["data"]["resume"]["contact_info"]["full_name"] == "Alex Johnson"
    )
    assert "web applications" in response_data["data"]["resume"]["summary"]
    assert "React" in response_data["data"]["resume"]["skills"]
    assert "Node.js" in response_data["data"]["resume"]["skills"]


def test_parse_resume_unsupported_file_type():
    # Create a mock HTML file
    test_file = io.BytesIO(b"<html><body>Resume content</body></html>")

    # Make the request
    response = client.put(
        "/parse", files={"file": ("resume.html", test_file, "text/html")}
    )

    # Verify response indicates validation error
    assert response.status_code == 422
    assert "Unsupported file type" in response.json()["detail"]
