# Better-Auth FastAPI Integration Guide

## Quick Reference
- Better Auth Version: Latest (2025)
- Last Updated: 2025-08-17
- Official Docs: https://www.better-auth.com/docs

## Overview

This guide provides comprehensive patterns for integrating Better-Auth (TypeScript) with FastAPI (Python) backends for secure session validation and authentication.

## Architecture Pattern

```
Frontend (Next.js) → Better-Auth → FastAPI Backend
                        ↓
                   Session/Token
                   Validation
```

## Essential Information

### Better-Auth Session Management

Better-Auth uses traditional cookie-based session management:
- Session stored in cookie, sent on every request
- Server verifies session and returns user data if valid
- Session table contains: `id` (token), `userId`, `expiresAt`, `ipAddress`, `userAgent`

### Session Validation Methods

#### 1. Database-Based Validation (Recommended)

Direct session validation against the Better-Auth session table:

```python
# app/dependencies.py
import asyncio
from typing import Optional
from fastapi import Header, HTTPException, Depends
import asyncpg
from datetime import datetime

async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_session_token: Optional[str] = Header(None)
) -> dict:
    """Validate Better-Auth session token."""
    
    # Extract token from Authorization header or custom header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif x_session_token:
        token = x_session_token
    
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Session token required"
        )
    
    # Query Better-Auth session table
    async with asyncpg.connect(DATABASE_URL) as conn:
        session = await conn.fetchrow("""
            SELECT s.id, s.userId, s.expiresAt, u.id as user_id, u.email, u.name
            FROM session s
            JOIN user u ON s.userId = u.id
            WHERE s.id = $1 AND s.expiresAt > $2
        """, token, datetime.utcnow())
        
        if not session:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session"
            )
        
        return {
            "id": session["user_id"],
            "email": session["email"],
            "name": session["name"],
            "session_id": session["id"]
        }
```

#### 2. Better-Auth API Validation

Call Better-Auth's validation endpoint:

```python
import httpx
from fastapi import HTTPException

async def validate_session_via_api(token: str) -> dict:
    """Validate session using Better-Auth API."""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BETTER_AUTH_URL}/api/get-session",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail="Invalid session"
            )
        
        session_data = response.json()
        return {
            "id": session_data["user"]["id"],
            "email": session_data["user"]["email"],
            "name": session_data["user"]["name"]
        }

async def get_current_user_api(
    authorization: Optional[str] = Header(None)
) -> dict:
    """Validate user via Better-Auth API."""
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header with Bearer token required"
        )
    
    token = authorization[7:]
    return await validate_session_via_api(token)
```

#### 3. Cookie-Based Validation

For cookie-based sessions:

```python
from fastapi import Cookie, HTTPException
import jwt
from datetime import datetime

async def get_current_user_cookie(
    better_auth_session: Optional[str] = Cookie(None)
) -> dict:
    """Validate Better-Auth session cookie."""
    
    if not better_auth_session:
        raise HTTPException(
            status_code=401,
            detail="Session cookie required"
        )
    
    # If using signed cookies, verify signature
    try:
        # For signed cookies (if enabled in Better-Auth)
        payload = jwt.decode(
            better_auth_session, 
            BETTER_AUTH_SECRET, 
            algorithms=["HS256"]
        )
        
        # Validate expiration
        if payload.get("exp", 0) < datetime.utcnow().timestamp():
            raise HTTPException(
                status_code=401,
                detail="Session expired"
            )
        
        return {
            "id": payload["userId"],
            "session_id": payload["sessionId"]
        }
        
    except jwt.InvalidTokenError:
        # Fall back to database validation
        return await validate_session_by_id(better_auth_session)
```

## Code Examples

### FastAPI Router Protection

```python
# app/routers/protected.py
from fastapi import APIRouter, Depends
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/protected", tags=["protected"])

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile - requires authentication."""
    return {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"]
    }

@router.post("/data")
async def create_data(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create data - requires authentication."""
    return {
        "message": "Data created",
        "user_id": current_user["id"],
        "data": data
    }
```

### Middleware Approach

```python
# app/middleware/auth.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import asyncpg

class BetterAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Extract session token
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization")
        
        token = auth_header[7:]
        
        # Validate session
        try:
            user = await self.validate_session(token)
            request.state.user = user
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        return await call_next(request)
    
    async def validate_session(self, token: str) -> dict:
        """Validate session against Better-Auth database."""
        async with asyncpg.connect(DATABASE_URL) as conn:
            session = await conn.fetchrow("""
                SELECT s.userId, u.email, u.name
                FROM session s
                JOIN user u ON s.userId = u.id
                WHERE s.id = $1 AND s.expiresAt > NOW()
            """, token)
            
            if not session:
                raise ValueError("Invalid session")
            
            return {
                "id": session["userId"],
                "email": session["email"],
                "name": session["name"]
            }
```

### Pydantic Models

```python
# app/schema/auth.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    session_id: Optional[str] = None

class SessionValidation(BaseModel):
    token: str
    user_id: str
    expires_at: datetime
    is_valid: bool

class AuthResponse(BaseModel):
    user: User
    session: SessionValidation
```

## Types & Schemas

### Better-Auth Session Table Schema

```sql
CREATE TABLE session (
    id TEXT PRIMARY KEY,           -- Session token
    userId TEXT NOT NULL,          -- User ID
    expiresAt TIMESTAMP NOT NULL,  -- Expiration time
    ipAddress TEXT,                -- Client IP
    userAgent TEXT,                -- User agent
    FOREIGN KEY (userId) REFERENCES user(id)
);

CREATE TABLE user (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    emailVerified BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Environment Configuration

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    better_auth_url: str = "http://localhost:3000"
    better_auth_secret: str
    redis_url: str = "redis://localhost:6379"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Project Context

### Related Files
- `/apps/api/app/dependencies.py` - Current auth dependency (needs implementation)
- `/apps/web/src/lib/auth.ts` - Better-Auth client configuration
- `/apps/web/src/lib/auth-client.ts` - Frontend auth client
- `/apps/api/app/routers/*.py` - API routes needing protection

### Existing Patterns
- FastAPI dependency injection for services
- PostgreSQL database with asyncpg
- Redis for caching and queues
- Pydantic for data validation

### Dependencies
```toml
# pyproject.toml additions needed
dependencies = [
    "asyncpg>=0.29.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.25.0"
]
```

## Implementation Steps

### 1. Update Dependencies

```python
# app/dependencies.py - Replace existing get_current_user
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user from better-auth session."""
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Authorization header with Bearer token required"
        )

    token = authorization[7:]
    
    # Query Better-Auth session table
    from .database.connections import get_postgres_connection
    
    async with get_postgres_connection() as conn:
        result = await conn.fetchrow("""
            SELECT s.id, s.userId, s.expiresAt, u.id as user_id, u.email, u.name
            FROM session s
            JOIN "user" u ON s.userId = u.id
            WHERE s.id = $1 AND s.expiresAt > $2
        """, token, datetime.utcnow())
        
        if not result:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session"
            )
        
        return {
            "id": result["user_id"],
            "email": result["email"],
            "name": result["name"],
            "session_id": result["id"]
        }
```

### 2. Frontend Integration

```typescript
// web/src/lib/services/api-client.ts
import { authClient } from '../auth-client';

class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await authClient.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    return {
      'Authorization': `Bearer ${session.token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async request(endpoint: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      // Handle authentication error
      await authClient.signOut();
      window.location.href = '/sign-in';
    }
    
    return response;
  }
}

export const apiClient = new ApiClient();
```

### 3. Error Handling

```python
# app/exceptions.py
from fastapi import HTTPException, status

class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class SessionExpiredError(AuthenticationError):
    def __init__(self):
        super().__init__("Session expired")

class InvalidTokenError(AuthenticationError):
    def __init__(self):
        super().__init__("Invalid authentication token")
```

## Security Best Practices

### 1. Validate Every Request
```python
# Always use dependency injection for protected routes
@router.get("/protected")
async def protected_endpoint(user: dict = Depends(get_current_user)):
    # User is guaranteed to be authenticated
    pass
```

### 2. Session Validation Caching
```python
# app/cache/session.py
import redis
import json
from datetime import timedelta

redis_client = redis.Redis.from_url(REDIS_URL)

async def cache_session_validation(token: str, user_data: dict, ttl: int = 300):
    """Cache valid session for 5 minutes."""
    await redis_client.setex(
        f"session:{token}", 
        ttl, 
        json.dumps(user_data)
    )

async def get_cached_session(token: str) -> Optional[dict]:
    """Get cached session validation."""
    cached = await redis_client.get(f"session:{token}")
    return json.loads(cached) if cached else None
```

### 3. Rate Limiting
```python
# app/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request):
    # Rate-limited authentication endpoint
    pass
```

## Testing

### Unit Tests
```python
# tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_protected_endpoint_without_auth():
    response = client.get("/api/protected/profile")
    assert response.status_code == 401

def test_protected_endpoint_with_valid_token():
    headers = {"Authorization": "Bearer valid_session_token"}
    response = client.get("/api/protected/profile", headers=headers)
    assert response.status_code == 200

@pytest.fixture
async def mock_session():
    # Create test session in database
    pass
```

## Performance Considerations

1. **Connection Pooling**: Use asyncpg connection pools for database validation
2. **Redis Caching**: Cache valid sessions to reduce database queries
3. **Async Operations**: Use async/await for all authentication operations
4. **Database Indexing**: Index session.id and session.expiresAt columns

## Troubleshooting

### Common Issues

1. **Token Format**: Ensure frontend sends tokens as `Bearer <token>`
2. **Database Schema**: Verify Better-Auth table names match queries
3. **Timezone Issues**: Use UTC for all timestamp comparisons
4. **Connection Limits**: Monitor database connection pool usage

### Debug Helpers

```python
# app/debug/auth.py
import logging

logger = logging.getLogger(__name__)

async def debug_session_validation(token: str):
    """Debug session validation issues."""
    logger.info(f"Validating token: {token[:8]}...")
    
    # Check if session exists
    async with get_postgres_connection() as conn:
        session = await conn.fetchrow(
            "SELECT * FROM session WHERE id = $1", token
        )
        
        if not session:
            logger.error("Session not found in database")
            return False
        
        logger.info(f"Session found: user={session['userId']}, expires={session['expiresAt']}")
        return True
```

This comprehensive guide provides everything needed to implement secure Better-Auth integration with FastAPI backends, ensuring proper session validation and authentication flow between your Next.js frontend and Python API.