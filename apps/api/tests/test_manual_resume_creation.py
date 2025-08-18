"""Tests for manual resume creation endpoint."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from fastapi import HTTPException

from app.routers.resume import create_manual_resume
from app.schema.resume import (
    Resume,
    ContactInfo,
    WorkExperience,
    Education,
    Certification,
)
from app.services.resume_service import ResumeService


class TestManualResumeCreation:
    """Test cases for manual resume creation endpoint."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "test_user_123", "email": "test@example.com"}

    @pytest.fixture
    def valid_resume_data(self):
        """Valid resume data for testing."""
        return Resume(
            contact_info=ContactInfo(
                full_name="John Doe",
                email="john.doe@example.com",
                phone="+1 (555) 123-4567",
                address="San Francisco, CA",
                links=[
                    {"name": "LinkedIn", "url": "https://linkedin.com/in/johndoe"},
                    {"name": "GitHub", "url": "https://github.com/johndoe"},
                ],
            ),
            summary="Experienced software engineer with 5+ years in full-stack development.",
            work_experience=[
                WorkExperience(
                    company="Tech Corp",
                    position="Senior Software Engineer",
                    start_date="2020-01",
                    end_date="2024-01",
                    is_current=False,
                    description="Led development of scalable web applications",
                    responsibilities=[
                        "Developed microservices architecture",
                        "Mentored junior developers",
                        "Improved system performance by 40%",
                    ],
                    skills=["Python", "FastAPI", "React", "PostgreSQL"],
                ),
                WorkExperience(
                    company="Startup Inc",
                    position="Full Stack Developer",
                    start_date="2018-06",
                    end_date="2020-01",
                    is_current=False,
                    description="Built customer-facing applications from scratch",
                    responsibilities=[
                        "Designed REST APIs",
                        "Implemented frontend features",
                        "Deployed to AWS",
                    ],
                    skills=["JavaScript", "Node.js", "Vue.js", "MongoDB"],
                ),
            ],
            education=[
                Education(
                    institution="University of California",
                    degree="Bachelor of Science",
                    field_of_study="Computer Science",
                    graduation_date="2018-05",
                    gpa=3.8,
                    honors=["Magna Cum Laude", "Dean's List"],
                    relevant_courses=[
                        "Data Structures",
                        "Algorithms",
                        "Database Systems",
                    ],
                    skills=["Java", "C++", "SQL"],
                )
            ],
            certifications=[
                Certification(
                    name="AWS Certified Solutions Architect",
                    issuer="Amazon Web Services",
                    date_obtained="2022-03",
                    expiration_date="2025-03",
                    credential_id="AWS-CSA-12345",
                )
            ],
            skills=[
                "Python",
                "JavaScript",
                "React",
                "FastAPI",
                "PostgreSQL",
                "AWS",
                "Docker",
                "Git",
                "Agile",
                "Leadership",
            ],
        )

    @pytest.fixture
    def minimal_resume_data(self):
        """Minimal valid resume data."""
        return Resume(
            contact_info=ContactInfo(
                full_name="Jane Smith", email="jane@example.com", links=[]
            ),
            work_experience=[],
            education=[],
            certifications=[],
            skills=[],
        )

    @pytest.fixture
    def mock_arango_client(self):
        """Mock ArangoDB client."""
        mock_client = MagicMock()
        mock_collection = MagicMock()
        mock_client.collection.return_value = mock_collection
        mock_client.std_datetime.return_value = datetime(2024, 1, 15, 12, 0, 0)
        mock_collection.insert.return_value = {"_key": "resume_test_123"}
        return mock_client

    @pytest.mark.asyncio
    async def test_create_manual_resume_success(
        self, mock_user, valid_resume_data, mock_arango_client
    ):
        """Test successful manual resume creation."""
        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                result = await create_manual_resume(
                    resume_data=valid_resume_data, current_user=mock_user
                )

                # Verify response structure
                assert result.success is True
                assert "data" in result.model_dump()
                data = result.data

                assert "resume_id" in data
                assert data["status"] == "created"
                assert result.message == "Resume created successfully from manual entry"

                # Verify service validation was called
                mock_service.validate_resume_data.assert_called_once()

                # Verify ArangoDB operations
                mock_arango_client.collection.assert_called_once_with("resumes")
                mock_collection = mock_arango_client.collection.return_value
                mock_collection.insert.assert_called_once()

                # Verify the document structure that was inserted
                insert_call_args = mock_collection.insert.call_args[0][0]
                assert insert_call_args["user_id"] == "test_user_123"
                assert insert_call_args["status"] == "manual"
                assert insert_call_args["source"] == "manual"
                assert "resume_data" in insert_call_args
                assert (
                    insert_call_args["resume_data"]["contact_info"]["full_name"]
                    == "John Doe"
                )

    @pytest.mark.asyncio
    async def test_create_manual_resume_minimal_data(
        self, mock_user, minimal_resume_data, mock_arango_client
    ):
        """Test manual resume creation with minimal required data."""
        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                result = await create_manual_resume(
                    resume_data=minimal_resume_data, current_user=mock_user
                )

                assert result.success is True
                assert result.data["status"] == "created"

                # Verify minimal data was saved correctly
                mock_collection = mock_arango_client.collection.return_value
                insert_call_args = mock_collection.insert.call_args[0][0]
                assert (
                    insert_call_args["resume_data"]["contact_info"]["full_name"]
                    == "Jane Smith"
                )
                assert insert_call_args["resume_data"]["work_experience"] == []
                assert insert_call_args["resume_data"]["education"] == []

    @pytest.mark.asyncio
    async def test_create_manual_resume_validation_error(
        self, mock_user, valid_resume_data
    ):
        """Test manual resume creation with validation error."""
        with patch("app.routers.resume.ResumeService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.validate_resume_data.return_value = (
                False,
                "Contact information is invalid",
            )
            mock_service_class.return_value = mock_service

            with pytest.raises(HTTPException) as exc_info:
                await create_manual_resume(
                    resume_data=valid_resume_data, current_user=mock_user
                )

            assert exc_info.value.status_code == 422
            assert "Contact information is invalid" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_manual_resume_database_error(
        self, mock_user, valid_resume_data, mock_arango_client
    ):
        """Test manual resume creation with database error."""
        # Configure mock to raise exception on insert
        mock_arango_client.collection.return_value.insert.side_effect = Exception(
            "Database connection failed"
        )

        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                with pytest.raises(HTTPException) as exc_info:
                    await create_manual_resume(
                        resume_data=valid_resume_data, current_user=mock_user
                    )

                assert exc_info.value.status_code == 500
                assert "Error creating resume from manual entry" in str(
                    exc_info.value.detail
                )

    @pytest.mark.asyncio
    async def test_create_manual_resume_arango_insert_failure(
        self, mock_user, valid_resume_data, mock_arango_client
    ):
        """Test manual resume creation when ArangoDB insert returns None."""
        # Configure mock to return None (insert failure)
        mock_arango_client.collection.return_value.insert.return_value = None

        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                with pytest.raises(HTTPException) as exc_info:
                    await create_manual_resume(
                        resume_data=valid_resume_data, current_user=mock_user
                    )

                assert exc_info.value.status_code == 500
                assert "Failed to create resume document" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_manual_resume_complex_data(
        self, mock_user, mock_arango_client
    ):
        """Test manual resume creation with complex nested data."""
        complex_resume = Resume(
            contact_info=ContactInfo(
                full_name="Alex Rodriguez",
                email="alex@example.com",
                phone="+1 (555) 987-6543",
                address="New York, NY",
                links=[
                    {
                        "name": "LinkedIn",
                        "url": "https://linkedin.com/in/alexrodriguez",
                    },
                    {"name": "Portfolio", "url": "https://alexrodriguez.dev"},
                    {"name": "GitHub", "url": "https://github.com/alexrodriguez"},
                ],
            ),
            summary="Full-stack developer and technical lead with expertise in cloud architecture.",
            work_experience=[
                WorkExperience(
                    company="Enterprise Solutions Inc",
                    position="Technical Lead",
                    start_date="2021-03",
                    is_current=True,
                    description="Leading a team of 8 developers on enterprise applications",
                    responsibilities=[
                        "Architect scalable cloud solutions",
                        "Manage development team",
                        "Implement DevOps practices",
                        "Conduct code reviews and mentoring",
                    ],
                    skills=[
                        "Python",
                        "AWS",
                        "Kubernetes",
                        "Docker",
                        "Jenkins",
                        "Terraform",
                    ],
                )
            ],
            education=[
                Education(
                    institution="Stanford University",
                    degree="Master of Science",
                    field_of_study="Computer Science",
                    graduation_date="2019-06",
                    gpa=3.9,
                    honors=["Summa Cum Laude", "Phi Beta Kappa"],
                    relevant_courses=[
                        "Distributed Systems",
                        "Machine Learning",
                        "Cloud Computing",
                    ],
                    skills=["Research", "Academic Writing", "Statistical Analysis"],
                )
            ],
            certifications=[
                Certification(
                    name="Certified Kubernetes Administrator",
                    issuer="Cloud Native Computing Foundation",
                    date_obtained="2023-01",
                    expiration_date="2026-01",
                    credential_id="CKA-2023-001",
                ),
                Certification(
                    name="AWS Solutions Architect Professional",
                    issuer="Amazon Web Services",
                    date_obtained="2022-11",
                    expiration_date="2025-11",
                ),
            ],
            skills=[
                "Python",
                "JavaScript",
                "TypeScript",
                "Go",
                "Java",
                "React",
                "Vue.js",
                "Node.js",
                "FastAPI",
                "Django",
                "PostgreSQL",
                "MongoDB",
                "Redis",
                "Elasticsearch",
                "AWS",
                "Azure",
                "GCP",
                "Kubernetes",
                "Docker",
                "Terraform",
                "Jenkins",
                "GitLab CI",
                "GitHub Actions",
                "Microservices",
                "Event-Driven Architecture",
                "Domain-Driven Design",
                "Agile",
                "Scrum",
                "Leadership",
                "Mentoring",
                "Technical Writing",
            ],
        )

        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                result = await create_manual_resume(
                    resume_data=complex_resume, current_user=mock_user
                )

                assert result.success is True

                # Verify complex data was saved correctly
                mock_collection = mock_arango_client.collection.return_value
                insert_call_args = mock_collection.insert.call_args[0][0]
                resume_data = insert_call_args["resume_data"]

                # Check contact info
                assert resume_data["contact_info"]["full_name"] == "Alex Rodriguez"
                assert len(resume_data["contact_info"]["links"]) == 3

                # Check work experience
                assert len(resume_data["work_experience"]) == 1
                work_exp = resume_data["work_experience"][0]
                assert work_exp["is_current"] is True
                assert len(work_exp["responsibilities"]) == 4
                assert "AWS" in work_exp["skills"]

                # Check education
                assert resume_data["education"][0]["gpa"] == 3.9
                assert "Summa Cum Laude" in resume_data["education"][0]["honors"]

                # Check certifications
                assert len(resume_data["certifications"]) == 2

                # Check skills
                assert len(resume_data["skills"]) > 20
                assert "Kubernetes" in resume_data["skills"]

    @pytest.mark.asyncio
    async def test_create_manual_resume_file_metadata(
        self, mock_user, valid_resume_data, mock_arango_client
    ):
        """Test that file metadata is correctly set for manual entries."""
        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                result = await create_manual_resume(
                    resume_data=valid_resume_data, current_user=mock_user
                )

                assert result.success is True

                # Verify file metadata for manual entry
                mock_collection = mock_arango_client.collection.return_value
                insert_call_args = mock_collection.insert.call_args[0][0]
                file_metadata = insert_call_args["file_metadata"]

                assert file_metadata["source"] == "manual_entry"
                assert file_metadata["created_by"] == "test_user_123"

    @pytest.mark.asyncio
    async def test_create_manual_resume_user_id_assignment(
        self, valid_resume_data, mock_arango_client
    ):
        """Test that user ID is correctly assigned from authenticated user."""
        # Test with different user
        different_user = {"id": "user_456", "email": "different@example.com"}

        with patch(
            "app.routers.resume.get_arango_client", return_value=mock_arango_client
        ):
            with patch("app.routers.resume.ResumeService") as mock_service_class:
                mock_service = AsyncMock()
                mock_service.validate_resume_data.return_value = (True, None)
                mock_service_class.return_value = mock_service

                result = await create_manual_resume(
                    resume_data=valid_resume_data, current_user=different_user
                )

                assert result.success is True

                # Verify correct user ID was used
                mock_collection = mock_arango_client.collection.return_value
                insert_call_args = mock_collection.insert.call_args[0][0]
                assert insert_call_args["user_id"] == "user_456"
                assert insert_call_args["file_metadata"]["created_by"] == "user_456"


class TestManualResumeValidation:
    """Test validation logic for manual resume creation."""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"id": "validation_user", "email": "validation@example.com"}

    @pytest.mark.asyncio
    async def test_empty_contact_info_validation(self, mock_user):
        """Test validation with empty contact info."""
        invalid_resume = Resume(
            contact_info=ContactInfo(
                full_name="",  # Empty name should fail validation
                links=[],
            ),
            work_experience=[],
            education=[],
            certifications=[],
            skills=[],
        )

        with patch("app.routers.resume.ResumeService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.validate_resume_data.return_value = (
                False,
                "Full name is required",
            )
            mock_service_class.return_value = mock_service

            with pytest.raises(HTTPException) as exc_info:
                await create_manual_resume(
                    resume_data=invalid_resume, current_user=mock_user
                )

            assert exc_info.value.status_code == 422
            assert "Full name is required" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalid_email_validation(self, mock_user):
        """Test validation with invalid email format."""
        invalid_resume = Resume(
            contact_info=ContactInfo(
                full_name="John Doe",
                email="invalid-email",  # Invalid email format
                links=[],
            ),
            work_experience=[],
            education=[],
            certifications=[],
            skills=[],
        )

        with patch("app.routers.resume.ResumeService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.validate_resume_data.return_value = (
                False,
                "Invalid email format",
            )
            mock_service_class.return_value = mock_service

            with pytest.raises(HTTPException) as exc_info:
                await create_manual_resume(
                    resume_data=invalid_resume, current_user=mock_user
                )

            assert exc_info.value.status_code == 422
            assert "Invalid email format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_service_validation_exception(self, mock_user):
        """Test when validation service raises an exception."""
        valid_resume = Resume(
            contact_info=ContactInfo(
                full_name="John Doe", email="john@example.com", links=[]
            ),
            work_experience=[],
            education=[],
            certifications=[],
            skills=[],
        )

        with patch("app.routers.resume.ResumeService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.validate_resume_data.side_effect = Exception(
                "Validation service error"
            )
            mock_service_class.return_value = mock_service

            with pytest.raises(HTTPException) as exc_info:
                await create_manual_resume(
                    resume_data=valid_resume, current_user=mock_user
                )

            assert exc_info.value.status_code == 500
            assert "Error creating resume from manual entry" in str(
                exc_info.value.detail
            )
