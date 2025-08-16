#!/usr/bin/env python3
"""Test script for the new /api/job/parse-document endpoint."""

import asyncio
import sys
from io import BytesIO

import httpx

async def test_job_parse_document_endpoint():
    """Test the new job document parsing endpoint."""
    
    # Create a test text file content
    test_content = """
    Software Engineer Position
    Company: Tech Corp
    Location: San Francisco, CA
    
    We are looking for a skilled software engineer to join our team.
    
    Requirements:
    - 3+ years of Python experience
    - Experience with web frameworks
    - Strong communication skills
    
    Benefits:
    - Health insurance
    - 401k matching
    - Remote work options
    """
    
    # Convert to bytes
    file_content = test_content.encode('utf-8')
    
    # Create file upload data
    files = {
        'file': ('test_job.txt', BytesIO(file_content), 'text/plain')
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Test the endpoint
            response = await client.post(
                "http://localhost:8000/api/job/parse-document",
                files=files,
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Endpoint working correctly!")
                print(f"Task ID: {data.get('data', {}).get('task_id')}")
                print(f"Job ID: {data.get('data', {}).get('job_id')}")
                return True
            else:
                print("❌ Endpoint returned error")
                return False
                
        except httpx.ConnectError:
            print("❌ Could not connect to API server. Make sure it's running on http://localhost:8000")
            return False
        except Exception as e:
            print(f"❌ Error testing endpoint: {str(e)}")
            return False

if __name__ == "__main__":
    print("Testing /api/job/parse-document endpoint...")
    result = asyncio.run(test_job_parse_document_endpoint())
    sys.exit(0 if result else 1)