// ─── Availability ───

export type ProductAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "ON_ORDER";

// ─── Shop ───

/** Website color/theme values saved in Shop Settings. */
export interface ThemeColors {
  preset: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

export interface ShopSettings {
  shop_name: string;
  whatsapp_number: string;
  phone: string;
  email: string | null;
  address: string;
  business_hours: string | null;
  social_links: Record<string, string>;
  logo_url: string | null;
  theme?: ThemeColors;
}

export interface ShopSettingsUpdatePayload {
  shop_name?: string;
  whatsapp_number?: string;
  phone?: string;
  email?: string | null;
  address?: string;
  business_hours?: string | null;
  social_links?: Record<string, string>;
  logo_url?: string | null;
  theme?: ThemeColors;
}

// ─── Admin auth ───

/** The minimized admin principal returned by /api/admin/auth/login and /me. */
export interface AdminUser {
  id: string;
  email: string;
}

// ─── Categories ───

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryCreatePayload {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryUpdatePayload {
  name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ─── Subcategories ───

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SubcategoryCreatePayload {
  category_id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface SubcategoryUpdatePayload {
  name?: string;
  slug?: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ─── Products ───

export interface Product {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: string | null;
  availability: ProductAvailability;
  is_active: boolean;
  vehicle_tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  category_id: string;
  subcategory_id?: string | null;
  description: string;
  price?: string | null;
  availability: ProductAvailability;
  is_active?: boolean;
  vehicle_tags: string[];
  /** Optional binary image file (multipart field `image`). */
  image?: File | null;
}

export interface ProductUpdatePayload {
  name?: string;
  category_id?: string;
  subcategory_id?: string | null;
  description?: string;
  price?: string | null;
  availability?: ProductAvailability;
  is_active?: boolean;
  vehicle_tags?: string[];
  /** Optional binary image file to replace the current one. */
  image?: File | null;
  /** Comma-separated field names (e.g. "price,subcategory_id") to null out. */
  clear_fields?: string[];
}

export interface ProductListPage {
  items: Product[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  subcategory?: string;
  vehicle?: string;
  availability?: ProductAvailability;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "price_asc" | "price_desc";
  page?: number;
  page_size?: number;
}

// ─── Admin product listing (includes inactive, filters, admin query) ───

export interface ProductAdminQueryParams {
  search?: string;
  category?: string;
  subcategory?: string;
  availability?: ProductAvailability;
  is_active?: boolean;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "price_asc" | "price_desc";
  page?: number;
  page_size?: number;
}

export type ProductAdminListPage = ProductListPage;

// ─── API error ───

export interface ApiError {
  detail: string;
}
