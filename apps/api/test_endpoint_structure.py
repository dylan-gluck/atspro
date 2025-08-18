#!/usr/bin/env python3
"""Test script to verify the endpoint structure is correct."""

import inspect
from app.routers.job import router


def test_endpoint_structure():
    """Test that our endpoint is properly defined."""

    # Get all routes from the router
    routes = [route for route in router.routes if hasattr(route, "path")]

    # Find our new endpoint
    parse_document_route = None
    for route in routes:
        if route.path == "/job/parse-document" and "POST" in route.methods:
            parse_document_route = route
            break

    if parse_document_route:
        print("✅ /job/parse-document endpoint found in router")
        print(f"   Methods: {route.methods}")
        print(f"   Path: {route.path}")

        # Check the endpoint function
        endpoint_func = route.endpoint
        if endpoint_func:
            sig = inspect.signature(endpoint_func)
            print(f"   Function: {endpoint_func.__name__}")
            print(f"   Parameters: {list(sig.parameters.keys())}")

            # Check if it has the right parameters
            expected_params = ["file", "current_user", "job_service"]
            has_all_params = all(param in sig.parameters for param in expected_params)

            if has_all_params:
                print("✅ All required parameters present")
            else:
                print("❌ Missing required parameters")

        return True
    else:
        print("❌ /job/parse-document endpoint not found")
        print("Available routes:")
        for route in routes:
            if hasattr(route, "methods"):
                print(f"   {route.methods} {route.path}")
        return False


if __name__ == "__main__":
    print("Testing endpoint structure...")
    result = test_endpoint_structure()
    exit(0 if result else 1)
