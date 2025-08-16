from typing import List, Optional

from pydantic import BaseModel


class Job(BaseModel):
    company: str
    title: str
    description: str
    salary: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    logistics: Optional[List[str]] = None
    location: Optional[List[str]] = None
    additional_info: Optional[List[str]] = None
    link: Optional[str] = None
