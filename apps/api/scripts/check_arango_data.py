#!/usr/bin/env python3
"""
Quick script to check if there's any data in ArangoDB that needs migration.
This helps determine if migration is necessary.
"""

import os
import sys
from pathlib import Path
from arango import ArangoClient
from datetime import datetime

# ArangoDB configuration
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DATABASE = os.getenv("ARANGO_DATABASE", "atspro")
ARANGO_USERNAME = os.getenv("ARANGO_USERNAME", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "dev_arango_password_change_in_prod")

def check_arango_data():
    """Check ArangoDB for existing data."""
    try:
        # Connect to ArangoDB
        client = ArangoClient(hosts=ARANGO_URL)
        db = client.db(
            ARANGO_DATABASE,
            username=ARANGO_USERNAME,
            password=ARANGO_PASSWORD
        )
        
        print(f"\n{'='*60}")
        print(f"ArangoDB Data Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        print(f"Server: {ARANGO_URL}")
        print(f"Database: {ARANGO_DATABASE}")
        print(f"{'='*60}\n")
        
        # Get all collections
        collections = db.collections()
        user_collections = [c for c in collections if not c['name'].startswith('_')]
        
        if not user_collections:
            print("✓ No user collections found in ArangoDB")
            print("  Migration is NOT necessary - database is empty\n")
            return False
        
        print(f"Found {len(user_collections)} user collection(s):\n")
        
        total_documents = 0
        has_data = False
        
        for collection_info in user_collections:
            collection_name = collection_info['name']
            collection = db.collection(collection_name)
            count = collection.count()
            total_documents += count
            
            if count > 0:
                has_data = True
                print(f"  • {collection_name}: {count:,} documents")
                
                # Show sample document structure
                try:
                    sample = next(collection.all(limit=1))
                    fields = list(sample.keys())
                    print(f"    Fields: {', '.join(fields[:5])}")
                    if len(fields) > 5:
                        print(f"            ... and {len(fields)-5} more fields")
                except:
                    pass
            else:
                print(f"  • {collection_name}: empty")
        
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  Total Collections: {len(user_collections)}")
        print(f"  Total Documents: {total_documents:,}")
        
        if has_data:
            print(f"\n⚠️  Migration REQUIRED - ArangoDB contains data")
            print(f"  Run: python scripts/migrate_data.py migrate")
        else:
            print(f"\n✓ Migration NOT necessary - all collections are empty")
        
        print(f"{'='*60}\n")
        
        return has_data
        
    except Exception as e:
        print(f"\n✗ Error connecting to ArangoDB: {e}")
        print(f"  - Check if ArangoDB is running")
        print(f"  - Verify connection settings")
        print(f"  - Run: docker-compose up -d arangodb\n")
        return None


if __name__ == "__main__":
    result = check_arango_data()
    if result is None:
        sys.exit(2)  # Connection error
    elif result:
        sys.exit(1)  # Data exists, migration needed
    else:
        sys.exit(0)  # No data, migration not needed