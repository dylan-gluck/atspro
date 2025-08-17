#!/usr/bin/env python3
"""
Debug script to inspect and fix resume documents in ArangoDB.
"""

import sys
import os
from datetime import datetime

# Add the apps/api path to Python path
sys.path.insert(0, '/Users/dylan/Workspace/projects/atspro/apps/api')

from app.config import settings
from app.database.connections import init_arango

def main():
    # Initialize ArangoDB using the app's connection method
    print(f"Connecting to ArangoDB at {settings.arango_url}")
    print(f"Database: {settings.arango_database}")
    print(f"Username: {settings.arango_username}")
    
    db = init_arango()
    
    # Get resumes collection
    resumes = db.collection('resumes')
    
    print("=== Checking Specific Resume Document ===")
    # Check the specific resume that was failing
    specific_resume = resumes.get('caeaf89e-28db-44f1-a101-dc8a681bd589')
    if specific_resume:
        print(f"Resume ID: {specific_resume.get('_key')}")
        print(f"User ID: {specific_resume.get('user_id')}")
        print(f"Status: {specific_resume.get('status')}")
        print(f"Created At: {specific_resume.get('created_at', 'MISSING')}")
        print(f"Updated At: {specific_resume.get('updated_at', 'MISSING')}")
        print(f"All keys: {list(specific_resume.keys())}")
        
        # Re-apply fix if needed
        if specific_resume.get('created_at') is None or specific_resume.get('updated_at') is None:
            print("Re-applying timestamp fix...")
            timestamp = datetime.utcnow().isoformat()
            resumes.update({'_key': 'caeaf89e-28db-44f1-a101-dc8a681bd589'}, {
                'created_at': timestamp,
                'updated_at': timestamp
            })
            print("Fix applied - checking again...")
            
            # Check again
            fixed_resume = resumes.get('caeaf89e-28db-44f1-a101-dc8a681bd589')
            print(f"After fix - Created At: {fixed_resume.get('created_at')}")
            print(f"After fix - Updated At: {fixed_resume.get('updated_at')}")
    else:
        print("Resume not found!")
        
    print("\n=== All Resume Documents ===")
    for doc in resumes.all():
        print(f"Resume ID: {doc.get('_key')}")
        print(f"User ID: {doc.get('user_id')}")
        print(f"Created At: {doc.get('created_at', 'MISSING')}")
        print(f"Updated At: {doc.get('updated_at', 'MISSING')}")
        print("-" * 30)

if __name__ == "__main__":
    main()