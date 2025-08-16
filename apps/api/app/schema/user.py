"""User profile schema definitions."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UserProfileBase(BaseModel):
    """Base user profile model with common fields."""

    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    location: Optional[str] = Field(
        None, max_length=255, description="Location/address"
    )
    title: Optional[str] = Field(None, max_length=255, description="Professional title")
    bio: Optional[str] = Field(None, description="Biography/summary")
    resume_id: Optional[str] = Field(
        None, description="Resume ID for onboarding completion"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format if provided."""
        if v is not None:
            # Remove common separators and spaces
            cleaned = "".join(c for c in v if c.isdigit() or c in "+-()")
            if len(cleaned) < 10:
                raise ValueError("Phone number must be at least 10 digits")
            if len(cleaned) > 20:
                raise ValueError("Phone number too long")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v):
        """Validate bio length if provided."""
        if v is not None and len(v) > 2000:
            raise ValueError("Bio must be 2000 characters or less")
        return v


class UserProfileCreate(UserProfileBase):
    """Schema for creating a new user profile."""

    pass


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile (all fields optional)."""

    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    location: Optional[str] = Field(
        None, max_length=255, description="Location/address"
    )
    title: Optional[str] = Field(None, max_length=255, description="Professional title")
    bio: Optional[str] = Field(None, description="Biography/summary")
    resume_id: Optional[str] = Field(
        None, description="Resume ID for onboarding completion"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format if provided."""
        if v is not None:
            # Remove common separators and spaces
            cleaned = "".join(c for c in v if c.isdigit() or c in "+-()")
            if len(cleaned) < 10:
                raise ValueError("Phone number must be at least 10 digits")
            if len(cleaned) > 20:
                raise ValueError("Phone number too long")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v):
        """Validate bio length if provided."""
        if v is not None and len(v) > 2000:
            raise ValueError("Bio must be 2000 characters or less")
        return v


class UserProfile(UserProfileBase):
    """Complete user profile with system fields."""

    user_id: str = Field(..., description="User ID from authentication system")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    updated_at: datetime = Field(..., description="Profile last update timestamp")

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    """API response wrapper for user profile operations."""

    success: bool = Field(True, description="Operation success status")
    data: Optional[UserProfile] = Field(None, description="User profile data")
    message: Optional[str] = Field(None, description="Optional response message")


class UserProfileDeleteResponse(BaseModel):
    """API response for user profile deletion."""

    success: bool = Field(True, description="Operation success status")
    message: str = Field(..., description="Deletion confirmation message")
