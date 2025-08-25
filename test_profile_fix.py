#!/usr/bin/env python3
"""Test script to verify profile endpoint fixes."""

import requests
import json
import sys

# Test data
BASE_URL = "http://localhost:8000"
TEST_TOKEN = "test-token-123"  # You'll need to get a valid token

def test_profile_endpoints():
    """Test the profile endpoints to ensure they work correctly."""
    
    # Headers with auth
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("Testing Profile Endpoints...")
    print("-" * 50)
    
    # Test 1: GET profile (should handle no profile gracefully)
    print("\n1. Testing GET /api/user/profile...")
    try:
        response = requests.get(f"{BASE_URL}/api/user/profile", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Failed: {e}")
    
    # Test 2: PATCH profile with data
    print("\n2. Testing PATCH /api/user/profile with data...")
    profile_data = {
        "phone": "555-123-4567",
        "location": "San Francisco, CA",
        "title": "Software Engineer"
    }
    try:
        response = requests.patch(
            f"{BASE_URL}/api/user/profile", 
            headers=headers, 
            json=profile_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Failed: {e}")
    
    # Test 3: PATCH profile with only resume_id (simulating onboarding)
    print("\n3. Testing PATCH /api/user/profile with resume_id...")
    resume_data = {
        "resume_id": "test-resume-id-123"
    }
    try:
        response = requests.patch(
            f"{BASE_URL}/api/user/profile", 
            headers=headers, 
            json=resume_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Failed: {e}")
    
    # Test 4: PATCH profile with empty body (should fail with 422)
    print("\n4. Testing PATCH /api/user/profile with empty body...")
    try:
        response = requests.patch(
            f"{BASE_URL}/api/user/profile", 
            headers=headers, 
            json={}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ✓ Correctly rejected empty update with 422")
        else:
            print(f"   Error: Expected 422, got {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   Failed: {e}")
    
    print("\n" + "-" * 50)
    print("Profile endpoint tests completed!")

if __name__ == "__main__":
    print("\nNote: You need to provide a valid auth token for these tests to work.")
    print("You can get one by logging in through the web app and checking the network tab.\n")
    
    if len(sys.argv) > 1:
        TEST_TOKEN = sys.argv[1]
        print(f"Using provided token: {TEST_TOKEN[:20]}...")
    else:
        print("Usage: python test_profile_fix.py <auth_token>")
        print("Using default test token (will likely fail auth)")
    
    test_profile_endpoints()