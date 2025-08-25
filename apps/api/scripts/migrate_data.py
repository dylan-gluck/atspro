#!/usr/bin/env python3
"""
Data Migration Utility: ArangoDB to PostgreSQL
Migrates all document collections from ArangoDB to PostgreSQL JSONB tables.

Usage:
    python scripts/migrate_data.py export      # Export ArangoDB data to JSON files
    python scripts/migrate_data.py import      # Import JSON files to PostgreSQL
    python scripts/migrate_data.py migrate     # Full migration (export + import)
    python scripts/migrate_data.py validate    # Validate migrated data
    python scripts/migrate_data.py rollback    # Rollback migration
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import asyncpg
from arango import ArangoClient
from pydantic import BaseModel, Field

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Migration configuration
MIGRATION_DIR = Path(__file__).parent / "migration_data"
BACKUP_DIR = MIGRATION_DIR / "backups"
EXPORT_DIR = MIGRATION_DIR / "exports"
IMPORT_LOG_DIR = MIGRATION_DIR / "logs"

# ArangoDB configuration
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DATABASE = os.getenv("ARANGO_DATABASE", "atspro")
ARANGO_USERNAME = os.getenv("ARANGO_USERNAME", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "dev_arango_password_change_in_prod")

# Collection mappings: ArangoDB collection -> PostgreSQL table
COLLECTION_MAPPINGS = {
    "resumes": "resume_documents",
    "jobs": "job_documents", 
    "task_results": "optimization_results",  # Map task_results if it contains optimization data
}


class MigrationStats(BaseModel):
    """Migration statistics and report data."""
    
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    collections_exported: Dict[str, int] = Field(default_factory=dict)
    collections_imported: Dict[str, int] = Field(default_factory=dict)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    validation_results: Dict[str, Any] = Field(default_factory=dict)
    
    def add_error(self, collection: str, doc_id: str, error: str):
        """Add an error to the migration report."""
        self.errors.append({
            "collection": collection,
            "document_id": doc_id,
            "error": str(error),
            "timestamp": datetime.now().isoformat()
        })
    
    def add_warning(self, message: str):
        """Add a warning to the migration report."""
        self.warnings.append(f"{datetime.now().isoformat()}: {message}")
    
    def save_report(self, filename: str = None):
        """Save migration report to file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"migration_report_{timestamp}.json"
        
        report_path = IMPORT_LOG_DIR / filename
        report_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        
        report = {
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": duration,
            "collections_exported": self.collections_exported,
            "collections_imported": self.collections_imported,
            "total_documents_exported": sum(self.collections_exported.values()),
            "total_documents_imported": sum(self.collections_imported.values()),
            "errors": self.errors,
            "error_count": len(self.errors),
            "warnings": self.warnings,
            "warning_count": len(self.warnings),
            "validation_results": self.validation_results,
            "success": len(self.errors) == 0
        }
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Migration report saved to: {report_path}")
        return report_path


class ArangoDBExporter:
    """Export data from ArangoDB collections to JSON files."""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.stats = MigrationStats()
    
    def connect(self) -> bool:
        """Connect to ArangoDB."""
        try:
            self.client = ArangoClient(hosts=ARANGO_URL)
            self.db = self.client.db(
                ARANGO_DATABASE,
                username=ARANGO_USERNAME,
                password=ARANGO_PASSWORD
            )
            logger.info(f"Connected to ArangoDB at {ARANGO_URL}/{ARANGO_DATABASE}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ArangoDB: {e}")
            self.stats.add_error("connection", "arangodb", str(e))
            return False
    
    def export_collection(self, collection_name: str) -> Optional[Path]:
        """Export a single collection to JSON file."""
        try:
            # Get all collection names (not the collection objects)
            collection_names = [c['name'] for c in self.db.collections()]
            
            if collection_name not in collection_names:
                logger.warning(f"Collection '{collection_name}' not found in ArangoDB")
                logger.warning(f"Available collections: {collection_names}")
                self.stats.add_warning(f"Collection '{collection_name}' not found")
                return None
            
            collection = self.db.collection(collection_name)
            documents = []
            
            # Export all documents
            cursor = collection.all()
            for doc in cursor:
                # Transform ArangoDB document
                transformed = self._transform_document(doc, collection_name)
                documents.append(transformed)
            
            # Save to JSON file
            export_path = EXPORT_DIR / f"{collection_name}.json"
            export_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(export_path, 'w') as f:
                json.dump(documents, f, indent=2, default=str)
            
            self.stats.collections_exported[collection_name] = len(documents)
            logger.info(f"Exported {len(documents)} documents from '{collection_name}' to {export_path}")
            
            # Create backup
            self._create_backup(export_path, collection_name)
            
            return export_path
            
        except Exception as e:
            logger.error(f"Failed to export collection '{collection_name}': {e}")
            self.stats.add_error(collection_name, "export", str(e))
            return None
    
    def _transform_document(self, doc: Dict[str, Any], collection_name: str) -> Dict[str, Any]:
        """Transform ArangoDB document to PostgreSQL format."""
        # Remove ArangoDB specific fields
        transformed = {k: v for k, v in doc.items() if not k.startswith('_')}
        
        # Preserve original ID for reference
        transformed['arango_id'] = doc.get('_key', '')
        transformed['arango_rev'] = doc.get('_rev', '')
        
        # Generate PostgreSQL UUID if needed
        if 'id' not in transformed:
            transformed['id'] = str(uuid4())
        
        # Ensure user_id is TEXT compatible
        if 'user_id' in transformed:
            transformed['user_id'] = str(transformed['user_id'])
        elif 'userId' in transformed:
            transformed['user_id'] = str(transformed['userId'])
            del transformed['userId']
        
        # Collection-specific transformations
        if collection_name in ['resumes', 'resume_documents']:
            transformed = self._transform_resume(transformed)
        elif collection_name in ['jobs', 'job_documents']:
            transformed = self._transform_job(transformed)
        elif collection_name in ['optimizations', 'optimization_results']:
            transformed = self._transform_optimization(transformed)
        
        # Add timestamps if missing
        if 'created_at' not in transformed:
            transformed['created_at'] = transformed.get('createdAt', datetime.now().isoformat())
        if 'updated_at' not in transformed:
            transformed['updated_at'] = transformed.get('updatedAt', datetime.now().isoformat())
        
        return transformed
    
    def _transform_resume(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Transform resume document for PostgreSQL."""
        # Ensure required fields
        doc['filename'] = doc.get('filename', doc.get('file_name', 'unknown.pdf'))
        doc['content_type'] = doc.get('content_type', doc.get('mime_type', 'application/pdf'))
        doc['file_size'] = doc.get('file_size', doc.get('size', 0))
        doc['status'] = doc.get('status', 'completed')
        doc['source'] = doc.get('source', 'upload')
        
        # Consolidate parsed data
        parsed_data = doc.get('parsed_data', {})
        if not parsed_data and 'content' in doc:
            parsed_data = doc['content']
        elif not parsed_data:
            # Try to extract from other fields
            parsed_data = {
                'contact_info': doc.get('contact_info', {}),
                'summary': doc.get('summary', ''),
                'experience': doc.get('experience', []),
                'education': doc.get('education', []),
                'skills': doc.get('skills', []),
                'certifications': doc.get('certifications', []),
                'projects': doc.get('projects', [])
            }
        
        doc['parsed_data'] = parsed_data
        
        # Clean up redundant fields
        fields_to_remove = ['content', 'contact_info', 'summary', 'experience', 
                           'education', 'skills', 'certifications', 'projects',
                           'file_name', 'mime_type', 'size']
        for field in fields_to_remove:
            doc.pop(field, None)
        
        return doc
    
    def _transform_job(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Transform job document for PostgreSQL."""
        # Map fields to new schema
        doc['company_name'] = doc.get('company_name', doc.get('company', ''))
        doc['job_title'] = doc.get('job_title', doc.get('title', ''))
        doc['location'] = doc.get('location', '')
        doc['remote_type'] = doc.get('remote_type', doc.get('work_type'))
        doc['job_url'] = doc.get('job_url', doc.get('url', ''))
        doc['is_active'] = doc.get('is_active', True)
        doc['status'] = doc.get('status', 'completed')
        
        # Consolidate parsed data
        parsed_data = doc.get('parsed_data', {})
        if not parsed_data:
            parsed_data = {
                'description': doc.get('description', ''),
                'requirements': doc.get('requirements', []),
                'qualifications': doc.get('qualifications', []),
                'benefits': doc.get('benefits', []),
                'skills': doc.get('skills', []),
                'keywords': doc.get('keywords', [])
            }
        
        doc['parsed_data'] = parsed_data
        
        # Clean up redundant fields
        fields_to_remove = ['company', 'title', 'url', 'description', 
                           'requirements', 'qualifications', 'benefits', 
                           'skills', 'keywords', 'work_type']
        for field in fields_to_remove:
            doc.pop(field, None)
        
        return doc
    
    def _transform_optimization(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Transform optimization document for PostgreSQL."""
        # Ensure required fields
        doc['optimization_type'] = doc.get('optimization_type', doc.get('type', 'general'))
        doc['status'] = doc.get('status', 'completed')
        
        # Map resume and job IDs
        doc['resume_id'] = doc.get('resume_id', doc.get('resumeId'))
        doc['job_id'] = doc.get('job_id', doc.get('jobId'))
        
        # Consolidate optimized content
        optimized_content = doc.get('optimized_content', {})
        if not optimized_content and 'content' in doc:
            optimized_content = doc['content']
        elif not optimized_content and 'optimization_data' in doc:
            optimized_content = doc['optimization_data']
        
        doc['optimized_content'] = optimized_content
        
        # Extract scores if available
        doc['ats_score'] = doc.get('ats_score', doc.get('atsScore'))
        doc['keyword_match_score'] = doc.get('keyword_match_score', doc.get('keywordScore'))
        
        # Clean up redundant fields
        fields_to_remove = ['resumeId', 'jobId', 'content', 'optimization_data',
                           'atsScore', 'keywordScore', 'type']
        for field in fields_to_remove:
            doc.pop(field, None)
        
        return doc
    
    def _create_backup(self, export_path: Path, collection_name: str):
        """Create a backup of the exported data."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_DIR / f"{collection_name}_{timestamp}.json"
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        import shutil
        shutil.copy2(export_path, backup_path)
        logger.info(f"Backup created: {backup_path}")
    
    def export_all(self) -> bool:
        """Export all collections."""
        if not self.connect():
            return False
        
        success = True
        for arango_collection in COLLECTION_MAPPINGS.keys():
            result = self.export_collection(arango_collection)
            if not result:
                success = False
        
        self.stats.save_report()
        return success


class PostgreSQLImporter:
    """Import JSON data to PostgreSQL JSONB tables."""
    
    def __init__(self):
        self.conn = None
        self.stats = MigrationStats()
        self.id_mappings = {}  # Track ID mappings for relationships
    
    async def connect(self) -> bool:
        """Connect to PostgreSQL."""
        try:
            self.conn = await asyncpg.connect(settings.database_url)
            logger.info("Connected to PostgreSQL")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            self.stats.add_error("connection", "postgresql", str(e))
            return False
    
    async def import_collection(self, json_path: Path, table_name: str) -> bool:
        """Import JSON data to PostgreSQL table."""
        try:
            # Load JSON data
            with open(json_path, 'r') as f:
                documents = json.load(f)
            
            logger.info(f"Importing {len(documents)} documents to '{table_name}'")
            
            imported_count = 0
            for doc in documents:
                try:
                    # Store document with proper mapping
                    doc_id = await self._store_document(table_name, doc)
                    if doc_id:
                        # Track ID mapping for relationships
                        if 'arango_id' in doc:
                            self.id_mappings[doc['arango_id']] = doc_id
                        imported_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to import document: {e}")
                    self.stats.add_error(table_name, doc.get('id', 'unknown'), str(e))
            
            self.stats.collections_imported[table_name] = imported_count
            logger.info(f"Imported {imported_count}/{len(documents)} documents to '{table_name}'")
            
            return imported_count == len(documents)
            
        except Exception as e:
            logger.error(f"Failed to import to '{table_name}': {e}")
            self.stats.add_error(table_name, "import", str(e))
            return False
    
    async def _store_document(self, table: str, doc: Dict[str, Any]) -> Optional[str]:
        """Store a single document in PostgreSQL."""
        try:
            # Prepare document for storage
            doc = self._prepare_document(table, doc)
            
            if table == "resume_documents":
                query = """
                    INSERT INTO resume_documents (
                        id, user_id, filename, content_type, file_size,
                        status, source, parsed_data, file_metadata,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        parsed_data = EXCLUDED.parsed_data,
                        file_metadata = EXCLUDED.file_metadata,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                """
                metadata = doc.get('file_metadata', doc.get('metadata', {}))
                metadata['arango_id'] = doc.get('arango_id')
                metadata['migrated_at'] = datetime.now().isoformat()
                
                result = await self.conn.fetchval(
                    query,
                    doc.get('id'),
                    doc.get('user_id'),
                    doc.get('filename'),
                    doc.get('content_type'),
                    doc.get('file_size', 0),
                    doc.get('status'),
                    doc.get('source'),
                    json.dumps(doc.get('parsed_data', {})),
                    json.dumps(metadata),
                    doc.get('created_at'),
                    doc.get('updated_at')
                )
                
            elif table == "job_documents":
                query = """
                    INSERT INTO job_documents (
                        id, user_id, company_name, job_title, location,
                        remote_type, job_url, is_active, status,
                        parsed_data, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO UPDATE SET
                        parsed_data = EXCLUDED.parsed_data,
                        metadata = EXCLUDED.metadata,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                """
                metadata = doc.get('metadata', {})
                metadata['arango_id'] = doc.get('arango_id')
                metadata['migrated_at'] = datetime.now().isoformat()
                
                result = await self.conn.fetchval(
                    query,
                    doc.get('id'),
                    doc.get('user_id'),
                    doc.get('company_name'),
                    doc.get('job_title'),
                    doc.get('location'),
                    doc.get('remote_type'),
                    doc.get('job_url'),
                    doc.get('is_active', True),
                    doc.get('status'),
                    json.dumps(doc.get('parsed_data', {})),
                    json.dumps(metadata),
                    doc.get('created_at'),
                    doc.get('updated_at')
                )
                
            elif table == "optimization_results":
                # Map resume and job IDs if needed
                resume_id = doc.get('resume_id')
                job_id = doc.get('job_id')
                
                # Try to map from ArangoDB IDs if they're old format
                if resume_id and resume_id in self.id_mappings:
                    resume_id = self.id_mappings[resume_id]
                if job_id and job_id in self.id_mappings:
                    job_id = self.id_mappings[job_id]
                
                query = """
                    INSERT INTO optimization_results (
                        id, user_id, resume_id, job_id, optimization_type,
                        optimized_content, metadata, status,
                        ats_score, keyword_match_score,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        optimized_content = EXCLUDED.optimized_content,
                        metadata = EXCLUDED.metadata,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                """
                metadata = doc.get('metadata', {})
                metadata['arango_id'] = doc.get('arango_id')
                metadata['migrated_at'] = datetime.now().isoformat()
                
                result = await self.conn.fetchval(
                    query,
                    doc.get('id'),
                    doc.get('user_id'),
                    resume_id,
                    job_id,
                    doc.get('optimization_type'),
                    json.dumps(doc.get('optimized_content', {})),
                    json.dumps(metadata),
                    doc.get('status'),
                    doc.get('ats_score'),
                    doc.get('keyword_match_score'),
                    doc.get('created_at'),
                    doc.get('updated_at', datetime.now())
                )
            else:
                logger.warning(f"Unknown table: {table}")
                return None
            
            return str(result) if result else None
            
        except Exception as e:
            logger.error(f"Failed to store document in {table}: {e}")
            raise
    
    def _prepare_document(self, table: str, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare document for PostgreSQL storage."""
        # Ensure UUID format for ID
        if 'id' in doc:
            try:
                # Validate UUID format
                from uuid import UUID
                UUID(doc['id'])
            except (ValueError, AttributeError):
                # Generate new UUID if invalid
                doc['id'] = str(uuid4())
        else:
            doc['id'] = str(uuid4())
        
        # Convert timestamps to datetime objects
        for field in ['created_at', 'updated_at']:
            if field in doc:
                if isinstance(doc[field], str):
                    try:
                        doc[field] = datetime.fromisoformat(doc[field].replace('Z', '+00:00'))
                    except:
                        doc[field] = datetime.now()
                elif not isinstance(doc[field], datetime):
                    doc[field] = datetime.now()
        
        # Ensure required timestamps
        if 'created_at' not in doc:
            doc['created_at'] = datetime.now()
        if 'updated_at' not in doc:
            doc['updated_at'] = datetime.now()
        
        return doc
    
    async def import_all(self) -> bool:
        """Import all exported collections."""
        if not await self.connect():
            return False
        
        success = True
        try:
            # Import in order to handle dependencies
            for arango_collection, pg_table in COLLECTION_MAPPINGS.items():
                json_path = EXPORT_DIR / f"{arango_collection}.json"
                if json_path.exists():
                    result = await self.import_collection(json_path, pg_table)
                    if not result:
                        success = False
                else:
                    logger.warning(f"Export file not found: {json_path}")
                    self.stats.add_warning(f"Export file not found: {arango_collection}.json")
            
            self.stats.save_report()
            
        finally:
            if self.conn:
                await self.conn.close()
        
        return success


class DataValidator:
    """Validate migrated data integrity."""
    
    def __init__(self):
        self.postgres_conn = None
        self.arango_db = None
        self.validation_results = {}
    
    async def connect(self) -> bool:
        """Connect to both databases."""
        try:
            # Connect to PostgreSQL
            self.postgres_conn = await asyncpg.connect(settings.database_url)
            
            # Connect to ArangoDB
            client = ArangoClient(hosts=ARANGO_URL)
            self.arango_db = client.db(
                ARANGO_DATABASE,
                username=ARANGO_USERNAME,
                password=ARANGO_PASSWORD
            )
            
            logger.info("Connected to both databases for validation")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect for validation: {e}")
            return False
    
    async def validate_counts(self) -> Dict[str, Any]:
        """Validate document counts match between databases."""
        results = {}
        
        for arango_collection, pg_table in COLLECTION_MAPPINGS.items():
            try:
                # Get ArangoDB count
                collection_names = [c['name'] for c in self.arango_db.collections()]
                if arango_collection in collection_names:
                    arango_count = self.arango_db.collection(arango_collection).count()
                else:
                    arango_count = 0
                
                # Get PostgreSQL count
                pg_count = await self.postgres_conn.fetchval(
                    f"SELECT COUNT(*) FROM {pg_table}"
                )
                
                results[arango_collection] = {
                    "arango_count": arango_count,
                    "postgres_count": pg_count,
                    "match": arango_count == pg_count,
                    "difference": abs(arango_count - pg_count)
                }
                
                if arango_count != pg_count:
                    logger.warning(
                        f"Count mismatch for {arango_collection}: "
                        f"ArangoDB={arango_count}, PostgreSQL={pg_count}"
                    )
                
            except Exception as e:
                logger.error(f"Failed to validate counts for {arango_collection}: {e}")
                results[arango_collection] = {"error": str(e)}
        
        self.validation_results["counts"] = results
        return results
    
    async def validate_sample_data(self, sample_size: int = 10) -> Dict[str, Any]:
        """Validate sample documents match between databases."""
        results = {}
        
        for arango_collection, pg_table in COLLECTION_MAPPINGS.items():
            try:
                # Get sample from PostgreSQL (migrated data)
                query = f"""
                    SELECT id, user_id, metadata->>'arango_id' as arango_id
                    FROM {pg_table}
                    WHERE metadata->>'arango_id' IS NOT NULL
                    LIMIT $1
                """
                pg_samples = await self.postgres_conn.fetch(query, sample_size)
                
                matches = 0
                mismatches = []
                
                collection_names = [c['name'] for c in self.arango_db.collections()]
                for pg_doc in pg_samples:
                    arango_id = pg_doc['arango_id']
                    if arango_id and arango_collection in collection_names:
                        # Try to find in ArangoDB
                        try:
                            arango_doc = self.arango_db.collection(arango_collection).get(arango_id)
                            if arango_doc:
                                matches += 1
                            else:
                                mismatches.append(arango_id)
                        except:
                            mismatches.append(arango_id)
                
                results[arango_collection] = {
                    "samples_checked": len(pg_samples),
                    "matches": matches,
                    "mismatches": len(mismatches),
                    "match_rate": (matches / len(pg_samples) * 100) if pg_samples else 0
                }
                
            except Exception as e:
                logger.error(f"Failed to validate samples for {arango_collection}: {e}")
                results[arango_collection] = {"error": str(e)}
        
        self.validation_results["samples"] = results
        return results
    
    async def validate_relationships(self) -> Dict[str, Any]:
        """Validate foreign key relationships are intact."""
        results = {}
        
        try:
            # Check optimization -> resume relationships
            orphaned_optimizations = await self.postgres_conn.fetchval("""
                SELECT COUNT(*)
                FROM optimization_results o
                LEFT JOIN resume_documents r ON o.resume_id = r.id
                WHERE o.resume_id IS NOT NULL AND r.id IS NULL
            """)
            
            # Check optimization -> job relationships
            orphaned_jobs = await self.postgres_conn.fetchval("""
                SELECT COUNT(*)
                FROM optimization_results o
                LEFT JOIN job_documents j ON o.job_id = j.id
                WHERE o.job_id IS NOT NULL AND j.id IS NULL
            """)
            
            results = {
                "orphaned_optimization_resume_refs": orphaned_optimizations,
                "orphaned_optimization_job_refs": orphaned_jobs,
                "relationships_valid": orphaned_optimizations == 0 and orphaned_jobs == 0
            }
            
        except Exception as e:
            logger.error(f"Failed to validate relationships: {e}")
            results = {"error": str(e)}
        
        self.validation_results["relationships"] = results
        return results
    
    async def validate_all(self) -> Dict[str, Any]:
        """Run all validation checks."""
        if not await self.connect():
            return {"error": "Failed to connect to databases"}
        
        try:
            logger.info("Starting data validation...")
            
            # Run validation checks
            await self.validate_counts()
            await self.validate_sample_data()
            await self.validate_relationships()
            
            # Summary
            all_valid = all(
                v.get("match", False) 
                for k, v in self.validation_results.get("counts", {}).items()
                if isinstance(v, dict) and "match" in v
            )
            
            self.validation_results["summary"] = {
                "all_counts_match": all_valid,
                "relationships_valid": self.validation_results.get("relationships", {}).get("relationships_valid", False),
                "validation_timestamp": datetime.now().isoformat()
            }
            
            # Save validation report
            report_path = IMPORT_LOG_DIR / f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            report_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(report_path, 'w') as f:
                json.dump(self.validation_results, f, indent=2, default=str)
            
            logger.info(f"Validation report saved to: {report_path}")
            
        finally:
            if self.postgres_conn:
                await self.postgres_conn.close()
        
        return self.validation_results


class MigrationRollback:
    """Rollback migration if needed."""
    
    def __init__(self):
        self.conn = None
    
    async def connect(self) -> bool:
        """Connect to PostgreSQL."""
        try:
            self.conn = await asyncpg.connect(settings.database_url)
            logger.info("Connected to PostgreSQL for rollback")
            return True
        except Exception as e:
            logger.error(f"Failed to connect for rollback: {e}")
            return False
    
    async def rollback_table(self, table_name: str, backup_date: str = None) -> bool:
        """Rollback a specific table to backup state."""
        try:
            # Find backup file
            if backup_date:
                pattern = f"{table_name}_{backup_date}*.json"
            else:
                # Get latest backup
                pattern = f"{table_name}_*.json"
            
            backup_files = list(BACKUP_DIR.glob(pattern))
            if not backup_files:
                logger.error(f"No backup found for {table_name}")
                return False
            
            # Use latest backup
            backup_file = sorted(backup_files)[-1]
            logger.info(f"Using backup: {backup_file}")
            
            # Start transaction
            async with self.conn.transaction():
                # Clear current data
                await self.conn.execute(f"TRUNCATE TABLE {table_name} CASCADE")
                
                # Re-import from backup
                importer = PostgreSQLImporter()
                importer.conn = self.conn
                success = await importer.import_collection(backup_file, table_name)
                
                if not success:
                    raise Exception("Failed to restore from backup")
            
            logger.info(f"Successfully rolled back {table_name}")
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed for {table_name}: {e}")
            return False
    
    async def rollback_all(self, backup_date: str = None) -> bool:
        """Rollback all tables."""
        if not await self.connect():
            return False
        
        success = True
        try:
            for pg_table in COLLECTION_MAPPINGS.values():
                if not await self.rollback_table(pg_table, backup_date):
                    success = False
        finally:
            if self.conn:
                await self.conn.close()
        
        return success


async def main():
    """Main migration orchestrator."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate data from ArangoDB to PostgreSQL")
    parser.add_argument(
        "action",
        choices=["export", "import", "migrate", "validate", "rollback"],
        help="Action to perform"
    )
    parser.add_argument(
        "--backup-date",
        help="Backup date for rollback (YYYYMMDD format)"
    )
    
    args = parser.parse_args()
    
    if args.action == "export":
        logger.info("Starting export from ArangoDB...")
        exporter = ArangoDBExporter()
        success = exporter.export_all()
        
    elif args.action == "import":
        logger.info("Starting import to PostgreSQL...")
        importer = PostgreSQLImporter()
        success = await importer.import_all()
        
    elif args.action == "migrate":
        logger.info("Starting full migration...")
        
        # Export from ArangoDB
        exporter = ArangoDBExporter()
        export_success = exporter.export_all()
        
        if not export_success:
            logger.error("Export failed, aborting migration")
            return False
        
        # Import to PostgreSQL
        importer = PostgreSQLImporter()
        import_success = await importer.import_all()
        
        if not import_success:
            logger.error("Import failed")
            return False
        
        # Validate migration
        validator = DataValidator()
        validation_results = await validator.validate_all()
        
        success = validation_results.get("summary", {}).get("all_counts_match", False)
        
    elif args.action == "validate":
        logger.info("Starting validation...")
        validator = DataValidator()
        results = await validator.validate_all()
        
        # Print summary
        print("\n" + "="*50)
        print("VALIDATION SUMMARY")
        print("="*50)
        for collection, data in results.get("counts", {}).items():
            if isinstance(data, dict):
                print(f"\n{collection}:")
                print(f"  ArangoDB: {data.get('arango_count', 'N/A')}")
                print(f"  PostgreSQL: {data.get('postgres_count', 'N/A')}")
                print(f"  Match: {'✓' if data.get('match') else '✗'}")
        
        success = results.get("summary", {}).get("all_counts_match", False)
        
    elif args.action == "rollback":
        logger.info("Starting rollback...")
        rollback = MigrationRollback()
        success = await rollback.rollback_all(args.backup_date)
    
    else:
        logger.error(f"Unknown action: {args.action}")
        success = False
    
    # Print final status
    print("\n" + "="*50)
    if success:
        print("✓ Operation completed successfully")
    else:
        print("✗ Operation failed - check logs for details")
    print("="*50)
    
    return success


if __name__ == "__main__":
    # Run the migration
    success = asyncio.run(main())
    sys.exit(0 if success else 1)