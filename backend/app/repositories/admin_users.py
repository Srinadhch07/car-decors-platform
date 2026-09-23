"""Admin user data access."""

from app.models.admin_user import AdminUser
from app.repositories.base import BaseRepository


class AdminUserRepository(BaseRepository[AdminUser]):
    collection_name = "admin_users"
    document_model = AdminUser

    async def get_by_email(self, email: str) -> AdminUser | None:
        return self._to_model(await self.collection.find_one({"email": email.strip().lower()}))

    async def find_by_password_reset_token_hash(self, token_hash: str) -> AdminUser | None:
        """Return the admin holding the given reset-token hash, if any."""
        return self._to_model(
            await self.collection.find_one({"password_reset_token_hash": token_hash})
        )
