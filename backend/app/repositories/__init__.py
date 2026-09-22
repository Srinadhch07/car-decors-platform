"""Data-access layer. Routers must use repositories instead of querying MongoDB."""

from app.repositories.admin_users import AdminUserRepository
from app.repositories.base import BaseRepository
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.shop_settings import SHOP_SETTINGS_ID, ShopSettingsRepository
from app.repositories.subcategories import SubcategoryRepository

__all__ = [
    "SHOP_SETTINGS_ID",
    "AdminUserRepository",
    "BaseRepository",
    "CategoryRepository",
    "ProductRepository",
    "ShopSettingsRepository",
    "SubcategoryRepository",
]
