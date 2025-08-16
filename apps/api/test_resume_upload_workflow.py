#!/usr/bin/env python3
"""
Test script to verify the complete resume upload workflow.

This script tests the end-to-end process:
1. POST /api/parse with a resume file
2. Workers process the task in the background
3. Resume data is stored in ArangoDB
4. User profile is updated with resume_id
5. Task status shows completed
"""

import asyncio
import base64
import logging
import time
from typing import Dict, Any

import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_BASE_URL = "http://localhost:8000"
TEST_USER_TOKEN = "test-token-123"  # This would need to be a real token in production

# Sample resume content for testing
SAMPLE_RESUME_CONTENT = """
John Doe
Software Engineer

Email: john.doe@example.com
Phone: (555) 123-4567
Location: San Francisco, CA

Summary:
Experienced software engineer with 5+ years of experience in full-stack development.
Proficient in Python, JavaScript, and cloud technologies.

Experience:
Software Engineer - Tech Corp (2020-Present)
- Developed web applications using Python and FastAPI
- Implemented CI/CD pipelines using Docker and Kubernetes
- Led a team of 3 developers on multiple projects

Junior Developer - StartupCo (2018-2020)
- Built REST APIs using Node.js and Express
- Worked with PostgreSQL and MongoDB databases
- Collaborated with design team on user interfaces

Education:
Bachelor of Science in Computer Science
University of California, Berkeley (2014-2018)
GPA: 3.8/4.0

Skills:
Python, JavaScript, FastAPI, Node.js, React, PostgreSQL, MongoDB, Docker, Kubernetes, AWS
"""


async def test_worker_status():
    """Test that workers are running."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                workers = data.get("workers", {})
                logger.info(f"Worker status: {workers}")
                return workers.get("status") == "running" and workers.get("total", 0) > 0
            else:
                logger.error(f"Health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error checking worker status: {e}")
            return False


async def upload_resume() -> Dict[str, Any]:
    """Upload a resume and return the task/resume IDs."""
    async with httpx.AsyncClient() as client:
        # Create a file-like object for the test resume
        files = {
            "file": ("test_resume.txt", SAMPLE_RESUME_CONTENT, "text/plain")
        }
        
        headers = {
            "Authorization": f"Bearer {TEST_USER_TOKEN}"
        }
        
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/parse",
                files=files,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Upload successful: {data}")
                return data["data"]
            else:
                logger.error(f"Upload failed: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            logger.error(f"Error uploading resume: {e}")
            return {}


async def check_task_status(task_id: str) -> Dict[str, Any]:
    """Check the status of a task."""
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {TEST_USER_TOKEN}"
        }
        
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/parse/{task_id}",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["data"]
            else:
                logger.error(f"Task status check failed: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            logger.error(f"Error checking task status: {e}")
            return {}


async def wait_for_task_completion(task_id: str, timeout: int = 120) -> Dict[str, Any]:
    """Wait for a task to complete, polling every few seconds."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        task_status = await check_task_status(task_id)
        
        if not task_status:
            logger.error("Failed to get task status")
            return {}
        
        status = task_status.get("status")
        progress = task_status.get("progress", 0)
        
        logger.info(f"Task {task_id} status: {status}, progress: {progress}%")
        
        if status == "completed":
            logger.info("Task completed successfully!")
            return task_status
        elif status == "failed":
            logger.error(f"Task failed: {task_status.get('error')}")
            return task_status
        
        # Wait before next check
        await asyncio.sleep(5)
    
    logger.error(f"Task {task_id} did not complete within {timeout} seconds")
    return {}


async def check_user_profile() -> Dict[str, Any]:
    """Check if user profile was updated with resume_id."""
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {TEST_USER_TOKEN}"
        }
        
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/user/profile",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"User profile: {data}")
                return data.get("data", {})
            else:
                logger.error(f"Profile check failed: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            logger.error(f"Error checking user profile: {e}")
            return {}


async def main():
    """Run the complete workflow test."""
    logger.info("=== Resume Upload Workflow Test ===")
    
    # Step 1: Check that workers are running
    logger.info("1. Checking worker status...")
    workers_running = await test_worker_status()
    
    if not workers_running:
        logger.error("❌ Workers are not running! Please ensure the API server is started with workers.")
        return
    
    logger.info("✅ Workers are running")
    
    # Step 2: Upload a resume
    logger.info("2. Uploading test resume...")
    upload_result = await upload_resume()
    
    if not upload_result:
        logger.error("❌ Resume upload failed")
        return
    
    task_id = upload_result.get("task_id")
    resume_id = upload_result.get("resume_id")
    
    if not task_id or not resume_id:
        logger.error("❌ Missing task_id or resume_id in upload response")
        return
    
    logger.info(f"✅ Resume uploaded - Task ID: {task_id}, Resume ID: {resume_id}")
    
    # Step 3: Wait for task completion
    logger.info("3. Waiting for task to complete...")
    final_status = await wait_for_task_completion(task_id)
    
    if not final_status or final_status.get("status") != "completed":
        logger.error("❌ Task did not complete successfully")
        return
    
    logger.info("✅ Task completed successfully")
    
    # Step 4: Check user profile was updated
    logger.info("4. Checking user profile update...")
    profile = await check_user_profile()
    
    profile_resume_id = profile.get("resume_id") if profile else None
    
    if profile_resume_id == resume_id:
        logger.info("✅ User profile updated with correct resume_id")
    else:
        logger.error(f"❌ User profile not updated correctly. Expected: {resume_id}, Got: {profile_resume_id}")
        return
    
    # Step 5: Verify task result contains parsed data
    logger.info("5. Verifying parsed resume data...")
    task_result = final_status.get("result", {})
    
    if not task_result:
        logger.error("❌ No result data in completed task")
        return
    
    resume_data = task_result.get("resume_data", {})
    if not resume_data:
        logger.error("❌ No resume_data in task result")
        return
    
    # Check for expected fields
    contact_info = resume_data.get("contact_info", {})
    if contact_info.get("full_name") and contact_info.get("email"):
        logger.info("✅ Resume data parsed correctly")
    else:
        logger.error("❌ Resume data missing expected fields")
        return
    
    logger.info("🎉 All tests passed! Resume upload workflow is working correctly.")


if __name__ == "__main__":
    asyncio.run(main())