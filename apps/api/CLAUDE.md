# ResumeNow API: Commands & Conventions

## Commands
- Start dev server: `uv run fastapi dev`
- Run all tests: `uv run pytest`
- Run specific test: `uv run pytest tests/path_to_test.py::test_name`
- Format code: `uvx ruff format`
- Add dependency: `uv add <package_name>`
- Sync dependencies: `uv sync`

## Code Style
- Python 3.11+ required
- Use type hints everywhere
- Use Pydantic for data validation and schemas
- Import order: standard lib → third-party → local
- Snake case for variables/functions (`format_resume`)
- Use docstrings with Args and Returns sections
- Return explicit HTTP status codes in responses

## Error Handling
- Use try/except blocks with specific exceptions
- Always validate input data
- Return appropriate HTTP status codes with error messages
- Log errors at appropriate levels

## Testing
- Write tests for all new features
- Test edge cases and error scenarios
- Run tests before committing changes