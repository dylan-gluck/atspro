# ATSPro: API

Backend service for the ATSPro application.

## Endpoints

- `/api/parse` Parse a document into a type-safe Resume JSON object.
- `/api/format` Reformat a Resume object based on provided job description string.

## Running the API locally

```bash
uv run fastapi dev
```

## Testing

### Running all tests

```bash
uv run pytest
```

### Running specific tests

```bash
uv run pytest tests/test_format.py::test_format_resume_success
```

### Running tests with coverage

```bash
uv run pytest --cov=app
```

The test suite currently has 100% code coverage.
