#!/usr/bin/env python3
"""
Prepare users for migration - creates placeholder users for ArangoDB data.
This ensures foreign key constraints are satisfied during migration.
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
import asyncpg

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


async def create_migration_users():
    """Create placeholder users for migration data."""
    
    # Path to exported data
    export_dir = Path(__file__).parent / "migration_data" / "exports"
    
    # Collect unique user IDs from exported data
    user_ids = set()
    
    # Check resumes
    resumes_file = export_dir / "resumes.json"
    if resumes_file.exists():
        with open(resumes_file, 'r') as f:
            resumes = json.load(f)
            for resume in resumes:
                if 'user_id' in resume:
                    user_ids.add(resume['user_id'])
    
    # Check jobs
    jobs_file = export_dir / "jobs.json"
    if jobs_file.exists():
        with open(jobs_file, 'r') as f:
            jobs = json.load(f)
            for job in jobs:
                if 'user_id' in job:
                    user_ids.add(job['user_id'])
    
    print(f"\n{'='*60}")
    print("Migration User Preparation")
    print(f"{'='*60}")
    print(f"Found {len(user_ids)} unique user IDs in exported data")
    
    if not user_ids:
        print("No user IDs found - nothing to do")
        return True
    
    # Connect to PostgreSQL
    try:
        conn = await asyncpg.connect(settings.database_url)
        
        # Check which users already exist
        existing_query = """
            SELECT id FROM "user" WHERE id = ANY($1::text[])
        """
        existing_users = await conn.fetch(existing_query, list(user_ids))
        existing_ids = {row['id'] for row in existing_users}
        
        # Find missing users
        missing_ids = user_ids - existing_ids
        
        print(f"\nUser Status:")
        print(f"  Existing users: {len(existing_ids)}")
        print(f"  Missing users:  {len(missing_ids)}")
        
        if missing_ids:
            print(f"\nMissing user IDs:")
            for uid in sorted(missing_ids)[:10]:
                print(f"  - {uid}")
            if len(missing_ids) > 10:
                print(f"  ... and {len(missing_ids) - 10} more")
            
            # Create placeholder users
            print(f"\n{'='*60}")
            print("Creating placeholder users for migration...")
            
            created_count = 0
            for user_id in missing_ids:
                try:
                    # Create a placeholder email
                    email = f"{user_id.lower().replace('_', '.')}@migration.placeholder"
                    
                    # Insert user with minimal required fields (using correct column names)
                    insert_query = """
                        INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
                        VALUES ($1, $2, $3, true, NOW(), NOW())
                        ON CONFLICT (id) DO NOTHING
                        RETURNING id
                    """
                    
                    # Generate a name from the user_id
                    name = f"Migration User {user_id.replace('user_', '').replace('_', ' ').title()}"
                    
                    result = await conn.fetchval(insert_query, user_id, name, email)
                    if result:
                        created_count += 1
                        print(f"  ✓ Created user: {user_id} ({email})")
                    
                except Exception as e:
                    print(f"  ✗ Failed to create user {user_id}: {e}")
            
            print(f"\nCreated {created_count} placeholder users")
            
            # Verify all users now exist
            verify_query = """
                SELECT COUNT(*) FROM "user" WHERE id = ANY($1::text[])
            """
            final_count = await conn.fetchval(verify_query, list(user_ids))
            
            if final_count == len(user_ids):
                print(f"✓ All {len(user_ids)} required users now exist")
                success = True
            else:
                print(f"⚠️ Only {final_count}/{len(user_ids)} users exist")
                success = False
        else:
            print("\n✓ All required users already exist")
            success = True
        
        await conn.close()
        
        print(f"{'='*60}\n")
        return success
        
    except Exception as e:
        print(f"\n✗ Error: {e}\n")
        return False


async def cleanup_migration_users():
    """Remove placeholder migration users (use with caution!)."""
    
    try:
        conn = await asyncpg.connect(settings.database_url)
        
        # Find migration placeholder users
        query = """
            SELECT id, email 
            FROM "user" 
            WHERE email LIKE '%@migration.placeholder'
        """
        
        placeholder_users = await conn.fetch(query)
        
        if not placeholder_users:
            print("No placeholder users found")
            return True
        
        print(f"\nFound {len(placeholder_users)} placeholder users:")
        for user in placeholder_users[:5]:
            print(f"  - {user['id']} ({user['email']})")
        if len(placeholder_users) > 5:
            print(f"  ... and {len(placeholder_users) - 5} more")
        
        response = input("\nDelete these placeholder users? (yes/no): ")
        
        if response.lower() == 'yes':
            # Delete placeholder users
            delete_query = """
                DELETE FROM "user" 
                WHERE email LIKE '%@migration.placeholder'
                RETURNING id
            """
            
            deleted = await conn.fetch(delete_query)
            print(f"Deleted {len(deleted)} placeholder users")
        else:
            print("Cleanup cancelled")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage migration users")
    parser.add_argument(
        "action",
        choices=["prepare", "cleanup"],
        help="Action to perform"
    )
    
    args = parser.parse_args()
    
    if args.action == "prepare":
        success = asyncio.run(create_migration_users())
    elif args.action == "cleanup":
        success = asyncio.run(cleanup_migration_users())
    
    sys.exit(0 if success else 1)