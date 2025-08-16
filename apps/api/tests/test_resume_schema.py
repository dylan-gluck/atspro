"""Tests for the simplified Resume schema."""

from app.schema.resume import (
    Certification,
    ContactInfo,
    Education,
    Link,
    Resume,
    WorkExperience,
)


class TestLink:
    def test_link_creation(self):
        """Test Link model creation."""
        link = Link(name="LinkedIn", url="https://linkedin.com/in/johndoe")
        assert link.name == "LinkedIn"
        assert link.url == "https://linkedin.com/in/johndoe"
        assert "linkedin.com" in link.url

    def test_link_json_serialization(self):
        """Test Link can be serialized to JSON."""
        link = Link(name="GitHub", url="https://github.com/johndoe")
        link_dict = link.model_dump()
        assert isinstance(link_dict, dict)
        assert link_dict["name"] == "GitHub"
        assert link_dict["url"] == "https://github.com/johndoe"


class TestContactInfo:
    def test_contact_info_required_fields(self):
        """Test ContactInfo with only required fields."""
        contact = ContactInfo(full_name="John Doe")
        assert contact.full_name == "John Doe"
        assert contact.email is None
        assert contact.phone is None
        assert contact.links == []

    def test_contact_info_all_fields(self):
        """Test ContactInfo with all fields populated."""
        links = [
            Link(name="LinkedIn", url="https://linkedin.com/in/janesmith"),
            Link(name="GitHub", url="https://github.com/janesmith"),
            Link(name="Portfolio", url="https://janesmith.dev"),
        ]
        contact = ContactInfo(
            full_name="Jane Smith",
            email="jane@example.com",
            phone="+1-555-0123",
            address="123 Main St, City, State 12345",
            links=links,
        )
        assert contact.full_name == "Jane Smith"
        assert contact.email == "jane@example.com"
        assert contact.phone == "+1-555-0123"
        assert "Main St" in contact.address
        assert len(contact.links) == 3
        assert contact.links[0].name == "LinkedIn"
        assert "linkedin.com" in contact.links[0].url


class TestWorkExperience:
    def test_work_experience_minimal(self):
        """Test WorkExperience with minimal required fields."""
        work = WorkExperience(company="Tech Corp", position="Software Engineer")
        assert work.company == "Tech Corp"
        assert work.position == "Software Engineer"
        assert work.is_current is False
        assert work.responsibilities == []
        assert work.skills == []

    def test_work_experience_complete(self):
        """Test WorkExperience with all fields."""
        work = WorkExperience(
            company="Tech Innovations Inc",
            position="Senior Full Stack Developer",
            start_date="2022-01-15",
            end_date="2024-06-30",
            is_current=False,
            description="Developed scalable web applications using modern frameworks",
            responsibilities=[
                "Code reviews",
                "Mentoring junior developers",
                "System architecture",
            ],
            skills=["Python", "React", "PostgreSQL", "AWS", "Docker"],
        )
        assert work.company == "Tech Innovations Inc"
        assert work.position == "Senior Full Stack Developer"
        assert work.is_current is False
        assert len(work.responsibilities) == 3
        assert len(work.skills) == 5
        assert "Python" in work.skills


class TestEducation:
    def test_education_minimal(self):
        """Test Education with minimal required fields."""
        edu = Education(
            institution="University of Technology", degree="Bachelor of Science"
        )
        assert edu.institution == "University of Technology"
        assert edu.degree == "Bachelor of Science"
        assert edu.gpa is None
        assert edu.honors == []
        assert edu.skills == []

    def test_education_complete(self):
        """Test Education with all fields."""
        edu = Education(
            institution="Stanford University",
            degree="Master of Science",
            field_of_study="Computer Science",
            graduation_date="2021-06-15",
            gpa=3.8,
            honors=["Summa Cum Laude", "Phi Beta Kappa"],
            relevant_courses=[
                "Machine Learning",
                "Distributed Systems",
                "Database Design",
            ],
            skills=["Java", "Python", "Machine Learning", "Data Structures"],
        )
        assert edu.institution == "Stanford University"
        assert edu.gpa == 3.8
        assert len(edu.honors) == 2
        assert len(edu.relevant_courses) == 3
        assert len(edu.skills) == 4


class TestCertification:
    def test_certification_minimal(self):
        """Test Certification with minimal required fields."""
        cert = Certification(
            name="AWS Solutions Architect", issuer="Amazon Web Services"
        )
        assert cert.name == "AWS Solutions Architect"
        assert cert.issuer == "Amazon Web Services"
        assert cert.credential_id is None

    def test_certification_complete(self):
        """Test Certification with all fields."""
        cert = Certification(
            name="Certified Kubernetes Administrator",
            issuer="Linux Foundation",
            date_obtained="2023-08-15",
            expiration_date="2026-08-15",
            credential_id="CKA-2023-123456",
        )
        assert cert.name == "Certified Kubernetes Administrator"
        assert cert.issuer == "Linux Foundation"
        assert cert.credential_id == "CKA-2023-123456"


class TestResume:
    def test_resume_minimal(self):
        """Test Resume with minimal required fields."""
        contact = ContactInfo(full_name="John Doe")
        resume = Resume(contact_info=contact)

        assert resume.contact_info.full_name == "John Doe"
        assert resume.summary is None
        assert resume.work_experience == []
        assert resume.education == []
        assert resume.certifications == []
        assert resume.skills == []

    def test_resume_complete(self):
        """Test Resume with all sections populated."""
        contact = ContactInfo(
            full_name="Sarah Johnson", email="sarah@example.com", phone="+1-555-9876"
        )

        work = WorkExperience(
            company="Innovation Labs",
            position="Lead Developer",
            start_date="2020-03-01",
            is_current=True,
            skills=["Python", "Django", "React"],
        )

        edu = Education(
            institution="MIT",
            degree="Bachelor of Science",
            field_of_study="Computer Science",
            gpa=3.9,
            skills=["Algorithms", "Data Structures"],
        )

        cert = Certification(
            name="PMP Certification", issuer="Project Management Institute"
        )

        resume = Resume(
            contact_info=contact,
            summary="Experienced software engineer with 5+ years in full-stack development",
            work_experience=[work],
            education=[edu],
            certifications=[cert],
            skills=["Python", "JavaScript", "React", "PostgreSQL", "AWS", "Docker"],
        )

        assert resume.contact_info.full_name == "Sarah Johnson"
        assert "full-stack development" in resume.summary
        assert len(resume.work_experience) == 1
        assert len(resume.education) == 1
        assert len(resume.certifications) == 1
        assert len(resume.skills) == 6
        assert "Python" in resume.skills

    def test_resume_json_serialization(self):
        """Test that Resume can be serialized to JSON (dict)."""
        contact = ContactInfo(full_name="Test User", email="test@example.com")
        resume = Resume(
            contact_info=contact,
            summary="Test summary",
            skills=["Python", "JavaScript"],
        )

        resume_dict = resume.model_dump()
        assert isinstance(resume_dict, dict)
        assert resume_dict["contact_info"]["full_name"] == "Test User"
        assert resume_dict["summary"] == "Test summary"
        assert len(resume_dict["skills"]) == 2
