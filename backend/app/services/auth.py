"""Authentication service layer (login + session helpers)."""

from pymongo.asynchronous.database import AsyncDatabase

from app.core.security import spend_time_for_unknown_email, verify_password
from app.models.admin_user import AdminUser
from app.repositories.admin_users import AdminUserRepository


async def authenticate_admin(
    database: AsyncDatabase, *, email: str, password: str
) -> AdminUser | None:
    """Return the admin on valid credentials, else ``None``.

    Unknown emails and wrong passwords follow the same code path with the same
    response shape, and unknown emails spend a comparable verification time to
    avoid user-enumeration via timing.
    """
    repository = AdminUserRepository(database)
    admin = await repository.get_by_email(email)
    if admin is None:
        spend_time_for_unknown_email()
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin
