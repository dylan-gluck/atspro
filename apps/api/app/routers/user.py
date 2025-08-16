"""User profile management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from psycopg.errors import UniqueViolation

from ..logger.logger import logger
from ..schema.user import (
    UserProfile,
    UserProfileDeleteResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from ..dependencies import get_current_user, get_task_service

router = APIRouter(prefix="/user", tags=["user"])


# Auth and service dependencies are now imported from dependencies module


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    task_service = Depends(get_task_service),
):
    """
    Get the current user's profile.

    Returns:
        UserProfileResponse: User profile data or null if no profile exists
    """
    user_id = current_user["id"]

    try:
        async with task_service.postgres_pool.connection() as conn:
            # Query user profile
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    SELECT user_id, phone, location, title, bio, resume_id, 
                           created_at, updated_at
                    FROM user_profiles 
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )
                row = await cursor.fetchone()

            if not row:
                # Return success with null data if no profile exists
                return UserProfileResponse(
                    success=True, data=None, message="No profile found"
                )

            # Convert row to UserProfile model
            # Row is a tuple, access by index based on SELECT order:
            # SELECT user_id, phone, location, title, bio, resume_id, created_at, updated_at
            profile = UserProfile(
                user_id=row[0],
                phone=row[1],
                location=row[2],
                title=row[3],
                bio=row[4],
                resume_id=row[5],
                created_at=row[6],
                updated_at=row[7],
            )

            return UserProfileResponse(success=True, data=profile)

    except Exception as e:
        logger.error(f"Error retrieving user profile for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving user profile")


@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    task_service = Depends(get_task_service),
):
    """
    Update the current user's profile (creates profile if it doesn't exist).

    Args:
        profile_update: Profile fields to update

    Returns:
        UserProfileResponse: Updated user profile data
    """
    user_id = current_user["id"]

    # Get only the fields that were actually provided (not None)
    update_data = profile_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=422, detail="No fields provided for update")

    try:
        async with task_service.postgres_pool.connection() as conn:
            async with conn.transaction():
                # First, check if profile exists, if not create it
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT user_id FROM user_profiles WHERE user_id = %s",
                        (user_id,),
                    )
                    profile_exists = await cursor.fetchone()

                    if not profile_exists:
                        await cursor.execute(
                            "INSERT INTO user_profiles (user_id) VALUES (%s)",
                            (user_id,),
                        )
                        logger.info(f"Created new profile for user {user_id}")

                # Build dynamic UPDATE query based on provided fields
                if update_data:
                    set_clauses = []
                    values = []

                    for field, value in update_data.items():
                        set_clauses.append(f"{field} = %s")
                        values.append(value)

                    values.append(user_id)  # For WHERE clause

                    update_query = f"""
                        UPDATE user_profiles 
                        SET {", ".join(set_clauses)}
                        WHERE user_id = %s
                    """

                    async with conn.cursor() as cursor:
                        await cursor.execute(update_query, values)

                # Fetch the updated profile
                # Fetch the updated profile
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        """
                        SELECT user_id, phone, location, title, bio, resume_id, 
                               created_at, updated_at
                        FROM user_profiles 
                        WHERE user_id = %s
                        """,
                        (user_id,),
                    )
                    row = await cursor.fetchone()

                if not row:
                    raise HTTPException(
                        status_code=500, detail="Error retrieving updated profile"
                    )

                # Convert row to UserProfile model
                # Row is a tuple, access by index based on SELECT order:
                # SELECT user_id, phone, location, title, bio, resume_id, created_at, updated_at
                profile = UserProfile(
                    user_id=row[0],
                    phone=row[1],
                    location=row[2],
                    title=row[3],
                    bio=row[4],
                    resume_id=row[5],
                    created_at=row[6],
                    updated_at=row[7],
                )

                logger.info(f"Updated profile for user {user_id}")
                return UserProfileResponse(
                    success=True, data=profile, message="Profile updated successfully"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating user profile")


@router.delete("/profile", response_model=UserProfileDeleteResponse)
async def delete_user_profile(
    current_user: dict = Depends(get_current_user),
    task_service = Depends(get_task_service),
):
    """
    Delete the current user's profile.

    Returns:
        UserProfileDeleteResponse: Deletion confirmation
    """
    user_id = current_user["id"]

    try:
        async with task_service.postgres_pool.connection() as conn:
            # Delete user profile
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    DELETE FROM user_profiles 
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )

                # Check if profile was actually deleted
                if cursor.rowcount == 0:
                    raise HTTPException(
                        status_code=404, detail="User profile not found"
                    )

            logger.info(f"Deleted profile for user {user_id}")
            return UserProfileDeleteResponse(
                success=True, message="Profile deleted successfully"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user profile for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting user profile")
