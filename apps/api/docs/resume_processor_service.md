# Resume Processor Service

The `ResumeProcessorService` provides synchronous resume processing capabilities, extracted from the original worker-based implementation. This service processes resume files directly without requiring Redis queues or background workers.

## Features

- **Synchronous Processing**: Process resumes immediately and return results directly
- **Text Extraction**: Uses unstructured library to extract text from various file formats
- **AI Processing**: Leverages OpenAI agents for intelligent resume parsing
- **Error Handling**: Comprehensive error handling with exponential backoff retry logic
- **Database Integration**: Stores results in both ArangoDB and PostgreSQL
- **Type Safety**: Full type hints and Pydantic validation

## Usage

### Basic Usage

```python
from app.services.resume_processor import process_resume_synchronously

# Process a resume file
with open("resume.pdf", "rb") as f:
    file_content = f.read()

result = await process_resume_synchronously(
    file_content=file_content,
    filename="resume.pdf",
    user_id="user-123",
    content_type="application/pdf"
)

print(f"Resume processed: {result['resume_id']}")
print(f"Contact name: {result['resume_data']['contact_info']['full_name']}")
```

### Advanced Usage with Service Class

```python
from app.services.resume_processor import ResumeProcessorService

# Create service instance with custom configuration
processor = ResumeProcessorService()
processor.timeout_seconds = 120  # Increase timeout for large files
processor.max_retries = 5        # More retries for unreliable connections

try:
    result = await processor.process_resume_sync(
        file_content=file_content,
        filename="resume.pdf", 
        user_id="user-123",
        content_type="application/pdf"
    )
    
    # Access parsed data
    resume_data = result['resume_data']
    work_experience = resume_data['work_experience']
    skills = resume_data['skills']
    
except FileProcessingError as e:
    print(f"File processing failed: {e}")
except AIProcessingError as e:
    print(f"AI processing failed: {e}")
except ValidationError as e:
    print(f"Data validation failed: {e}")
except StorageError as e:
    print(f"Database storage failed: {e}")
```

## Configuration

The service can be configured by modifying instance attributes:

- `timeout_seconds` (int): AI processing timeout in seconds (default: 60)
- `max_retries` (int): Maximum retry attempts for transient failures (default: 3)
- `base_delay` (float): Base delay for exponential backoff in seconds (default: 1.0)

## Error Handling

The service defines specific exception types for different failure modes:

- `FileProcessingError`: File cannot be processed or text extracted
- `AIProcessingError`: AI agent processing fails
- `ValidationError`: Parsed data validation fails
- `StorageError`: Database operations fail
- `ResumeProcessingError`: Base exception for all processing errors

## Return Value

The service returns a dictionary with:

```python
{
    "resume_id": str,           # Generated unique identifier
    "user_id": str,             # User identifier
    "resume_data": dict,        # Parsed resume data (Resume model)
    "file_metadata": {
        "filename": str,
        "content_type": str,
        "size": int,
        "processed_at": str     # ISO timestamp
    },
    "status": "completed"
}
```

## Performance Considerations

- **Memory Usage**: Large files are processed in memory - consider file size limits
- **AI Timeouts**: Default 60-second timeout may need adjustment for complex resumes
- **Database Connections**: Uses existing connection pools for efficiency
- **Retry Logic**: Exponential backoff prevents overwhelming external services

## Integration with Existing Code

This service can be used as a drop-in replacement for queue-based processing:

```python
# Instead of queueing a task
# task_id = await resume_queue.enqueue(...)

# Process directly
result = await process_resume_synchronously(
    file_content, filename, user_id, content_type
)

# Result is immediately available
resume_id = result['resume_id']
```

## Testing

The service includes comprehensive unit tests covering:

- Text extraction from various file types
- AI processing with timeout and retry scenarios
- Data validation with valid and invalid inputs
- Database storage operations
- Error handling for all failure modes

Run tests with:
```bash
uv run pytest tests/test_resume_processor_service.py -v
```