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

/** Authenticated email change (current password required). */
export interface ChangeEmailPayload {
  new_email: string;
  current_password: string;
}

/** Authenticated password change (current password required). */
export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/** Public forgot-password request; the backend replies identically for any email. */
export interface ForgotPasswordResponse {
  message: string;
}

/** One-time reset token plus the new password. */
export interface ResetPasswordPayload {
  token: string;
  new_password: string;
  confirm_password: string;
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
  /** Optional external link (video or product page). */
  external_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A product as returned by the admin endpoints. Exact stock quantities are
 * admin-only, so they are absent from the public {@link Product} shape.
 */
export interface AdminProduct extends Product {
  stock_quantity: number;
}

export interface ProductCreatePayload {
  name: string;
  category_id: string;
  subcategory_id?: string | null;
  description: string;
  price?: string | null;
  availability: ProductAvailability;
  stock_quantity?: number;
  is_active?: boolean;
  vehicle_tags: string[];
  /** Blank or null to omit the link. */
  external_url?: string | null;
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
  stock_quantity?: number;
  is_active?: boolean;
  vehicle_tags?: string[];
  /** Blank or null to omit the link; include "external_url" in clear_fields to remove it. */
  external_url?: string | null;
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

export type ProductAdminListPage = {
  items: AdminProduct[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

// ─── Testimonials ───

export type TestimonialStatus = "pending" | "approved" | "rejected";

/** A testimonial as exposed on the public site (no moderation fields). */
export interface Testimonial {
  id: string;
  customer_name: string;
  text: string;
  rating: number | null;
  created_at: string;
}

export interface TestimonialListPage {
  items: Testimonial[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

/** Public submission payload; privileged fields are rejected by the server. */
export interface TestimonialSubmissionPayload {
  customer_name: string;
  text: string;
  rating?: number | null;
  /** Explicit consent to public display is required. */
  consent: boolean;
  /** Honeypot field; a real customer never fills it. */
  website?: string;
}

/** A testimonial as returned by the admin endpoints, including moderation state. */
export interface AdminTestimonial {
  id: string;
  customer_name: string;
  text: string;
  rating: number | null;
  status: TestimonialStatus;
  published: boolean;
  is_featured: boolean;
  consent: boolean;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTestimonialListPage {
  items: AdminTestimonial[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TestimonialAdminQueryParams {
  status?: TestimonialStatus;
  page?: number;
  page_size?: number;
}

/** Admin content edits; an included null clears rating/moderation_note. */
export interface TestimonialUpdatePayload {
  customer_name?: string;
  text?: string;
  rating?: number | null;
  moderation_note?: string | null;
}

// ─── Work Gallery ───

export type GalleryMediaType = "image" | "video";

/** Sort keys accepted by the gallery endpoints. */
export type GallerySort = "order" | "newest" | "oldest";

/** A gallery item as exposed on the public site (published only). */
export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string | null;
  media_type: GalleryMediaType;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
}

/** A gallery item as returned by the admin endpoints, with visibility flags. */
export interface AdminGalleryItem extends GalleryItem {
  storage_key: string;
  size_bytes: number;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  updated_at: string;
}

export interface GalleryListPage {
  items: GalleryItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminGalleryListPage {
  items: AdminGalleryItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface GalleryQueryParams {
  media_type?: GalleryMediaType;
  category?: string;
  sort?: GallerySort;
  page?: number;
  page_size?: number;
}

export interface GalleryAdminQueryParams {
  search?: string;
  media_type?: GalleryMediaType;
  category?: string;
  is_published?: boolean;
  is_featured?: boolean;
  sort?: GallerySort;
  page?: number;
  page_size?: number;
}

/** Optional metadata for a create upload (media is validated server-side). */
export interface GalleryCreatePayload {
  title?: string;
  description?: string;
  category?: string | null;
  display_order?: number | null;
}

/** Metadata edits for an existing item; `clear_fields` nulls optional fields. */
export interface GalleryUpdatePayload {
  title?: string;
  description?: string;
  category?: string | null;
  display_order?: number | null;
  /** Field names to clear (e.g. ["category"]). */
  clear_fields?: string[];
}

/** Shared metadata applied to every file in a batch upload. */
export interface GalleryBatchPayload {
  category?: string | null;
  description?: string;
}

/** A single file in a batch upload that the server rejected. */
export interface GalleryBatchFailure {
  filename: string;
  detail: string;
}

export interface GalleryBatchResult {
  items: AdminGalleryItem[];
  failures: GalleryBatchFailure[];
}

// ─── API error ───

export interface ApiError {
  detail: string;
}
