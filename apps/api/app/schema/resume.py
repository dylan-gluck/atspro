from typing import List, Optional

from pydantic import BaseModel


class Link(BaseModel):
    name: str
    url: str


class ContactInfo(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    links: List[Link] = []


class WorkExperience(BaseModel):
    company: str
    position: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = False
    description: Optional[str] = None
    responsibilities: List[str] = []
    skills: List[str] = []


class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[float] = None
    honors: List[str] = []
    relevant_courses: List[str] = []
    skills: List[str] = []


class Certification(BaseModel):
    name: str
    issuer: str
    date_obtained: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None


class Resume(BaseModel):
    contact_info: ContactInfo
    summary: Optional[str] = None
    work_experience: List[WorkExperience] = []
    education: List[Education] = []
    certifications: List[Certification] = []
    skills: List[str] = []
