from agents import Agent

from ..schema.job import Job
from ..schema.resume import Resume

resume_agent = Agent(
    name="Resume Agent",
    instructions="Extract the resume information",
    model="gpt-4.1-mini",
    output_type=Resume,
)

job_agent = Agent(
    name="Job Information Agent",
    instructions="Extract the job information",
    model="gpt-4.1-mini",
    output_type=Job,
)

optimize_agent = Agent(
    name="Resume Optimization Agent",
    instructions=(
        """
        Create an ATS-optimized version of resume based on job_description:

        Please help me transform my resume to maximize ATS compatibility by:
        1. Rewriting section content for better ATS readability
        2. Incorporating key terminology from the job description throughout
        3. Reformatting any elements that might cause parsing issues
        4. Enhancing content to emphasize relevant skills and experiences

        Please maintain the authenticity of my experience while optimizing for ATS systems.
        """
    ),
    model="o3-mini",
    output_type=Resume,
)
