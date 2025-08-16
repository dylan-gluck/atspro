"""Comprehensive tests for advanced workers (optimizer, scorer, researcher)."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.schema.job import Job
from app.schema.resume import Resume, ContactInfo
from app.workers.base import TaskError, TaskErrorType
from app.workers.optimizer import OptimizeWorker
from app.workers.scorer import ScoreWorker
from app.workers.researcher import ResearchWorker


@pytest.fixture
def mock_redis_queue():
    """Mock Redis queue."""
    mock = AsyncMock()
    mock.queue_prefix = "atspro"
    mock.update_progress = AsyncMock()
    return mock


@pytest.fixture
def mock_arango_db():
    """Mock ArangoDB database."""
    mock = MagicMock()

    # Mock collections
    mock_resumes_collection = MagicMock()
    mock_jobs_collection = MagicMock()
    mock_documents_collection = MagicMock()

    mock.collection.side_effect = lambda name: {
        "resumes": mock_resumes_collection,
        "jobs": mock_jobs_collection,
        "documents": mock_documents_collection,
    }.get(name, MagicMock())

    return mock


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "contact_info": {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "address": "123 Main St, City, State 12345",
            "links": [
                {"name": "LinkedIn", "url": "https://linkedin.com/in/johndoe"},
                {"name": "GitHub", "url": "https://github.com/johndoe"},
            ],
        },
        "summary": "Experienced software engineer with 5+ years in web development",
        "work_experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Software Engineer",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "is_current": False,
                "description": "Led development of web applications",
                "responsibilities": [
                    "Developed React applications",
                    "Managed CI/CD pipelines",
                    "Mentored junior developers",
                ],
                "skills": ["React", "Python", "AWS", "Docker"],
            }
        ],
        "education": [
            {
                "institution": "University of Technology",
                "degree": "Bachelor of Science",
                "field_of_study": "Computer Science",
                "graduation_date": "2019-05",
                "gpa": 3.8,
                "honors": ["Cum Laude"],
                "relevant_courses": [
                    "Data Structures",
                    "Algorithms",
                    "Web Development",
                ],
                "skills": ["Java", "Python", "JavaScript"],
            }
        ],
        "certifications": [
            {
                "name": "AWS Solutions Architect",
                "issuer": "Amazon Web Services",
                "date_obtained": "2022-03",
                "expiration_date": "2025-03",
                "credential_id": "AWS-SA-123456",
            }
        ],
        "skills": ["Python", "React", "AWS", "Docker", "JavaScript", "Node.js"],
    }


@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        "company": "Innovative Tech Inc",
        "title": "Full Stack Developer",
        "description": "Join our dynamic team to build cutting-edge web applications",
        "salary": "$80,000 - $120,000",
        "responsibilities": [
            "Develop and maintain web applications",
            "Collaborate with cross-functional teams",
            "Write clean, maintainable code",
        ],
        "qualifications": [
            "3+ years of web development experience",
            "Proficiency in React and Python",
            "Experience with cloud platforms",
        ],
        "logistics": ["Full-time", "On-site"],
        "location": ["San Francisco", "CA"],
        "additional_info": ["Great benefits", "Stock options"],
        "link": "https://jobs.example.com/123",
    }


@pytest.fixture
def sample_task_data(sample_resume_data, sample_job_data):
    """Sample task data for testing."""
    return {
        "id": str(uuid4()),
        "task_type": "optimize",
        "user_id": "user_123",
        "payload": {"resume_id": "resume_123", "job_id": "job_123"},
        "created_at": "2024-01-01T00:00:00Z",
    }


class TestOptimizeWorker:
    """Test suite for OptimizeWorker."""

    @pytest.fixture
    def optimize_worker(self, mock_redis_queue, mock_arango_db):
        """Create OptimizeWorker instance."""
        return OptimizeWorker(mock_redis_queue, mock_arango_db)

    def test_get_queue_names(self, optimize_worker):
        """Test queue names returned by worker."""
        queue_names = optimize_worker.get_queue_names()
        expected = ["atspro:queue:high", "atspro:queue:normal", "atspro:queue:low"]
        assert queue_names == expected

    def test_get_task_types(self, optimize_worker):
        """Test task types handled by worker."""
        task_types = optimize_worker.get_task_types()
        assert task_types == ["optimize"]

    @pytest.mark.asyncio
    async def test_execute_task_success(
        self,
        optimize_worker,
        sample_task_data,
        sample_resume_data,
        sample_job_data,
        mock_arango_db,
    ):
        """Test successful task execution."""
        # Mock database responses
        mock_resume_doc = {"user_id": "user_123", "data": sample_resume_data}
        mock_job_doc = {"user_id": "user_123", "data": sample_job_data}

        mock_arango_db.collection("resumes").get.return_value = mock_resume_doc
        mock_arango_db.collection("jobs").get.return_value = mock_job_doc

        # Mock document insertion
        mock_arango_db.collection("documents").insert.return_value = {"_key": "doc_123"}

        # Mock optimize agent
        mock_optimized_resume = Resume(**sample_resume_data)
        with patch("app.workers.optimizer.optimize_agent") as mock_agent:
            mock_agent.run.return_value = mock_optimized_resume

            result = await optimize_worker.execute_task(sample_task_data)

        # Verify result
        assert result["type"] == "optimization"
        assert result["resume_id"] == "resume_123"
        assert result["job_id"] == "job_123"
        assert result["status"] == "completed"
        assert "document_id" in result

    @pytest.mark.asyncio
    async def test_execute_task_missing_payload(self, optimize_worker, mock_arango_db):
        """Test task execution with missing payload."""
        task_data = {
            "id": str(uuid4()),
            "task_type": "optimize",
            "user_id": "user_123",
            "payload": {},  # Missing resume_id and job_id
        }

        with pytest.raises(TaskError) as exc_info:
            await optimize_worker.execute_task(task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Missing resume_id or job_id" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_resume_not_found(
        self, optimize_worker, sample_task_data, mock_arango_db
    ):
        """Test task execution with resume not found."""
        # Mock resume not found
        mock_arango_db.collection("resumes").get.return_value = None

        with pytest.raises(TaskError) as exc_info:
            await optimize_worker.execute_task(sample_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Resume resume_123 not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_unauthorized_access(
        self, optimize_worker, sample_task_data, sample_resume_data, mock_arango_db
    ):
        """Test task execution with unauthorized access."""
        # Mock resume belonging to different user
        mock_resume_doc = {"user_id": "other_user", "data": sample_resume_data}
        mock_arango_db.collection("resumes").get.return_value = mock_resume_doc

        with pytest.raises(TaskError) as exc_info:
            await optimize_worker.execute_task(sample_task_data)

        assert exc_info.value.error_type == TaskErrorType.PERMANENT
        assert "Unauthorized access" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_task_ai_rate_limit(
        self,
        optimize_worker,
        sample_task_data,
        sample_resume_data,
        sample_job_data,
        mock_arango_db,
    ):
        """Test task execution with AI rate limit error."""
        # Mock database responses
        mock_resume_doc = {"user_id": "user_123", "data": sample_resume_data}
        mock_job_doc = {"user_id": "user_123", "data": sample_job_data}

        mock_arango_db.collection("resumes").get.return_value = mock_resume_doc
        mock_arango_db.collection("jobs").get.return_value = mock_job_doc

        # Mock AI rate limit error
        with patch("app.workers.optimizer.optimize_agent") as mock_agent:
            mock_agent.run.side_effect = Exception("Rate limit exceeded")

            with pytest.raises(TaskError) as exc_info:
                await optimize_worker.execute_task(sample_task_data)

        assert exc_info.value.error_type == TaskErrorType.RATE_LIMITED

    def test_format_resume_as_markdown(self, optimize_worker, sample_resume_data):
        """Test markdown formatting of resume."""
        resume = Resume(**sample_resume_data)
        markdown = optimize_worker._format_resume_as_markdown(resume)

        # Check basic structure
        assert "# John Doe" in markdown
        assert "## Contact Information" in markdown
        assert "## Professional Summary" in markdown
        assert "## Work Experience" in markdown
        assert "## Education" in markdown
        assert "## Certifications" in markdown
        assert "## Skills" in markdown

        # Check specific content
        assert "john.doe@example.com" in markdown
        assert "Senior Software Engineer - Tech Corp" in markdown
        assert "AWS Solutions Architect" in markdown


class TestScoreWorker:
    """Test suite for ScoreWorker."""

    @pytest.fixture
    def score_worker(self, mock_redis_queue, mock_arango_db):
        """Create ScoreWorker instance."""
        return ScoreWorker(mock_redis_queue, mock_arango_db)

    def test_get_queue_names(self, score_worker):
        """Test queue names returned by worker."""
        queue_names = score_worker.get_queue_names()
        expected = ["atspro:queue:high", "atspro:queue:normal", "atspro:queue:low"]
        assert queue_names == expected

    def test_get_task_types(self, score_worker):
        """Test task types handled by worker."""
        task_types = score_worker.get_task_types()
        assert task_types == ["score"]

    @pytest.mark.asyncio
    async def test_execute_task_success(
        self, score_worker, sample_resume_data, sample_job_data, mock_arango_db
    ):
        """Test successful scoring task execution."""
        task_data = {
            "id": str(uuid4()),
            "task_type": "score",
            "user_id": "user_123",
            "payload": {"resume_id": "resume_123", "job_id": "job_123"},
        }

        # Mock database responses
        mock_resume_doc = {"user_id": "user_123", "data": sample_resume_data}
        mock_job_doc = {"user_id": "user_123", "data": sample_job_data, "scores": {}}

        mock_arango_db.collection("resumes").get.return_value = mock_resume_doc
        mock_arango_db.collection("jobs").get.return_value = mock_job_doc

        # Mock scoring agent
        mock_score_result = {
            "overall_score": 85,
            "skills_score": 90,
            "experience_score": 80,
            "education_score": 85,
            "keywords_score": 75,
            "career_score": 80,
            "strengths": ["Strong technical skills", "Relevant experience"],
            "gaps": ["Limited leadership experience"],
            "recommendations": ["Highlight project management skills"],
            "rationale": "Good match with strong technical alignment",
        }

        with patch("app.workers.scorer.score_agent") as mock_agent:
            mock_agent.run.return_value = mock_score_result

            result = await score_worker.execute_task(task_data)

        # Verify result
        assert result["type"] == "score"
        assert result["resume_id"] == "resume_123"
        assert result["job_id"] == "job_123"
        assert result["status"] == "completed"
        assert result["score_data"]["overall_score"] == 85

    def test_validate_score_result(self, score_worker):
        """Test score result validation."""
        # Valid result
        valid_result = {
            "overall_score": 85.5,
            "skills_score": 90,
            "experience_score": 80,
            "education_score": 85,
            "keywords_score": 75,
            "career_score": 80,
            "strengths": ["Strong skills"],
            "gaps": ["Some gaps"],
            "recommendations": ["Improve X"],
            "rationale": "Good match",
        }

        cleaned = score_worker._validate_score_result(valid_result)

        assert cleaned["overall_score"] == 85  # Converted to int
        assert cleaned["skills_score"] == 90
        assert isinstance(cleaned["strengths"], list)
        assert isinstance(cleaned["rationale"], str)

    def test_validate_score_result_invalid(self, score_worker):
        """Test score result validation with invalid data."""
        invalid_result = {
            "overall_score": 150,  # Over 100
            "skills_score": -10,  # Below 0
            "strengths": "not a list",
            "rationale": 123,  # Not a string
        }

        cleaned = score_worker._validate_score_result(invalid_result)

        assert cleaned["overall_score"] == 100  # Clamped to max
        assert cleaned["skills_score"] == 0  # Clamped to min
        assert cleaned["strengths"] == []  # Converted to empty list
        assert cleaned["rationale"] == "123"  # Converted to string

    def test_prepare_scoring_input(
        self, score_worker, sample_resume_data, sample_job_data
    ):
        """Test scoring input preparation."""
        resume = Resume(**sample_resume_data)
        job = Job(**sample_job_data)

        input_text = score_worker._prepare_scoring_input(resume, job)

        # Check that input contains key information
        assert "John Doe" in input_text
        assert "Senior Software Engineer" in input_text
        assert "Full Stack Developer" in input_text
        assert "Innovative Tech Inc" in input_text
        assert "Python" in input_text


class TestResearchWorker:
    """Test suite for ResearchWorker."""

    @pytest.fixture
    def research_worker(self, mock_redis_queue, mock_arango_db):
        """Create ResearchWorker instance."""
        return ResearchWorker(mock_redis_queue, mock_arango_db)

    def test_get_queue_names(self, research_worker):
        """Test queue names returned by worker."""
        queue_names = research_worker.get_queue_names()
        expected = ["atspro:queue:high", "atspro:queue:normal", "atspro:queue:low"]
        assert queue_names == expected

    def test_get_task_types(self, research_worker):
        """Test task types handled by worker."""
        task_types = research_worker.get_task_types()
        assert task_types == ["research"]

    @pytest.mark.asyncio
    async def test_execute_task_success(
        self, research_worker, sample_resume_data, sample_job_data, mock_arango_db
    ):
        """Test successful research task execution."""
        task_data = {
            "id": str(uuid4()),
            "task_type": "research",
            "user_id": "user_123",
            "payload": {"resume_id": "resume_123", "job_id": "job_123"},
        }

        # Mock database responses
        mock_resume_doc = {"user_id": "user_123", "data": sample_resume_data}
        mock_job_doc = {"user_id": "user_123", "data": sample_job_data}

        mock_arango_db.collection("resumes").get.return_value = mock_resume_doc
        mock_arango_db.collection("jobs").get.return_value = mock_job_doc
        mock_arango_db.collection("documents").insert.return_value = {
            "_key": "research_123"
        }

        # Mock research agent
        mock_research_report = """
        # Company Research Report
        
        ## Company Overview
        Innovative Tech Inc is a leading technology company...
        
        ## Thoughtful Questions
        1. What are the main challenges facing the development team?
        2. How does the company measure success for this role?
        """

        with patch("app.workers.researcher.research_agent") as mock_agent:
            mock_agent.run.return_value = mock_research_report

            result = await research_worker.execute_task(task_data)

        # Verify result
        assert result["type"] == "research"
        assert result["resume_id"] == "resume_123"
        assert result["job_id"] == "job_123"
        assert result["company"] == "Innovative Tech Inc"
        assert result["status"] == "completed"
        assert "document_id" in result

    def test_prepare_research_input(
        self, research_worker, sample_resume_data, sample_job_data
    ):
        """Test research input preparation."""
        resume = Resume(**sample_resume_data)
        job = Job(**sample_job_data)

        input_text = research_worker._prepare_research_input(resume, job)

        # Check that input contains key information
        assert "JOB POSTING DETAILS:" in input_text
        assert "Innovative Tech Inc" in input_text
        assert "Full Stack Developer" in input_text
        assert "CANDIDATE BACKGROUND:" in input_text
        assert "John Doe" in input_text
        assert "Senior Software Engineer" in input_text

    def test_enhance_research_report(self, research_worker, sample_job_data):
        """Test research report enhancement."""
        job = Job(**sample_job_data)

        basic_report = "This is a basic research report."
        enhanced = research_worker._enhance_research_report(basic_report, job)

        # Check that header is added
        assert "# Company Research Report: Innovative Tech Inc" in enhanced
        assert "**Position:** Full Stack Developer" in enhanced
        assert "**Generated:**" in enhanced
        assert basic_report in enhanced

    @pytest.mark.asyncio
    async def test_create_research_relationship(self, research_worker, mock_arango_db):
        """Test creation of research relationship edge."""
        # Mock edge collection creation
        mock_arango_db.has_collection.return_value = False
        mock_arango_db.create_collection = MagicMock()
        mock_edge_collection = MagicMock()

        # Ensure that collection() always returns the same mock object
        mock_arango_db.collection = MagicMock(return_value=mock_edge_collection)

        # Mock the timestamp method to prevent potential errors
        with patch.object(
            research_worker,
            "_get_current_timestamp",
            return_value="2024-01-01T00:00:00Z",
        ):
            await research_worker._create_research_relationship("job_123", "doc_456")

        # Verify edge collection creation
        mock_arango_db.create_collection.assert_called_once_with(
            "job_research", edge=True
        )

        # Verify edge insertion
        mock_edge_collection.insert.assert_called_once()
        insert_args = mock_edge_collection.insert.call_args[0][0]
        assert insert_args["_from"] == "jobs/job_123"
        assert insert_args["_to"] == "documents/doc_456"
        assert insert_args["relationship"] == "has_research"
        assert insert_args["created_at"] == "2024-01-01T00:00:00Z"


# Integration tests for worker interactions
class TestWorkerIntegration:
    """Integration tests for worker functionality."""

    @pytest.mark.asyncio
    async def test_all_workers_handle_same_task_data_format(
        self, mock_redis_queue, mock_arango_db, sample_task_data
    ):
        """Test that all workers can handle the same task data format."""
        # Initialize workers
        optimize_worker = OptimizeWorker(mock_redis_queue, mock_arango_db)
        score_worker = ScoreWorker(mock_redis_queue, mock_arango_db)
        research_worker = ResearchWorker(mock_redis_queue, mock_arango_db)

        # Test that all workers recognize their task types
        optimize_task = {**sample_task_data, "task_type": "optimize"}
        score_task = {**sample_task_data, "task_type": "score"}
        research_task = {**sample_task_data, "task_type": "research"}

        assert "optimize" in optimize_worker.get_task_types()
        assert "score" in score_worker.get_task_types()
        assert "research" in research_worker.get_task_types()

        # Test that workers reject wrong task types
        assert "score" not in optimize_worker.get_task_types()
        assert "research" not in score_worker.get_task_types()
        assert "optimize" not in research_worker.get_task_types()

    def test_all_workers_use_same_queue_names(self, mock_redis_queue, mock_arango_db):
        """Test that all workers use the same queue names."""
        workers = [
            OptimizeWorker(mock_redis_queue, mock_arango_db),
            ScoreWorker(mock_redis_queue, mock_arango_db),
            ResearchWorker(mock_redis_queue, mock_arango_db),
        ]

        expected_queues = [
            "atspro:queue:high",
            "atspro:queue:normal",
            "atspro:queue:low",
        ]

        for worker in workers:
            assert worker.get_queue_names() == expected_queues

    @pytest.mark.asyncio
    async def test_error_handling_consistency(self, mock_redis_queue, mock_arango_db):
        """Test that all workers handle errors consistently."""
        workers = [
            OptimizeWorker(mock_redis_queue, mock_arango_db),
            ScoreWorker(mock_redis_queue, mock_arango_db),
            ResearchWorker(mock_redis_queue, mock_arango_db),
        ]

        # Test missing payload handling
        invalid_task = {
            "id": str(uuid4()),
            "task_type": "test",
            "user_id": "user_123",
            "payload": {},  # Missing required fields
        }

        for worker in workers:
            with pytest.raises(TaskError) as exc_info:
                await worker.execute_task(invalid_task)

            assert exc_info.value.error_type == TaskErrorType.PERMANENT
            assert "Missing resume_id or job_id" in str(exc_info.value)
