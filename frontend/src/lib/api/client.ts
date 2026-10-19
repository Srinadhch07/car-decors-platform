import type {
  AdminGalleryItem,
  AdminGalleryListPage,
  AdminProduct,
  AdminTestimonial,
  AdminTestimonialListPage,
  AdminUser,
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  ChangeEmailPayload,
  ChangePasswordPayload,
  ForgotPasswordResponse,
  GalleryAdminQueryParams,
  GalleryBatchPayload,
  GalleryBatchResult,
  GalleryCreatePayload,
  GalleryItem,
  GalleryListPage,
  GalleryQueryParams,
  GalleryUpdatePayload,
  Product,
  ProductListPage,
  ProductQueryParams,
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductAdminListPage,
  ProductAdminQueryParams,
  ResetPasswordPayload,
  ShopSettings,
  ShopSettingsUpdatePayload,
  Subcategory,
  SubcategoryCreatePayload,
  SubcategoryUpdatePayload,
  Testimonial,
  TestimonialAdminQueryParams,
  TestimonialListPage,
  TestimonialStatus,
  TestimonialSubmissionPayload,
  TestimonialUpdatePayload,
} from "../../types/api";

export const CSRF_HEADER = "X-CSRF-Token";

// ─── Configuration ───

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ─── HTTP Client ───

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = (init?.method ?? "GET").toUpperCase();
    const isStateChange = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
    const response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(isStateChange ? this.csrfHeaders() : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: response.statusText }));
      throw new ApiRequestError(response.status, body.detail || response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    );
    if (entries.length === 0) return "";
    const searchParams = new URLSearchParams();
    for (const [key, value] of entries) {
      searchParams.set(key, String(value));
    }
    return `?${searchParams.toString()}`;
  }

  /** Read the readable CSRF cookie (double-submit pattern). */
  private csrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)car_decor_csrf=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /** CSRF header for state-changing admin requests. */
  private csrfHeaders(): Record<string, string> {
    const token = this.csrfToken();
    return token ? { [CSRF_HEADER]: token } : {};
  }

  // ─── Shop ───

  async getShopSettings(): Promise<ShopSettings> {
    return this.request<ShopSettings>("/api/shop");
  }

  // ─── Categories ───

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>("/api/categories");
  }

  async getCategory(slug: string): Promise<Category> {
    return this.request<Category>(`/api/categories/${encodeURIComponent(slug)}`);
  }

  async getSubcategories(categorySlug: string): Promise<Subcategory[]> {
    return this.request<Subcategory[]>(
      `/api/categories/${encodeURIComponent(categorySlug)}/subcategories`,
    );
  }

  // ─── Products ───

  async getProducts(params: ProductQueryParams = {}): Promise<ProductListPage> {
    const query = this.buildQueryString(params as Record<string, string | number>);
    return this.request<ProductListPage>(`/api/products${query}`);
  }

  async getProduct(slug: string): Promise<Product> {
    return this.request<Product>(`/api/products/${encodeURIComponent(slug)}`);
  }

  // ─── Testimonials (public) ───

  /** Approved, published, consented testimonials only. */
  async getTestimonials(
    params: { page?: number; page_size?: number } = {},
  ): Promise<TestimonialListPage> {
    const query = this.buildQueryString(params);
    return this.request<TestimonialListPage>(`/api/testimonials${query}`);
  }

  /** Featured testimonials for marketing surfaces (homepage). */
  async getFeaturedTestimonials(
    params: { page?: number; page_size?: number } = {},
  ): Promise<TestimonialListPage> {
    const query = this.buildQueryString(params);
    return this.request<TestimonialListPage>(`/api/testimonials/featured${query}`);
  }

  /** Submit a testimonial for moderation; it always starts pending. */
  async submitTestimonial(payload: TestimonialSubmissionPayload): Promise<Testimonial> {
    return this.request<Testimonial>("/api/testimonials", this.jsonInit("POST", payload));
  }

  // ─── Admin: Session / auth (cookies!) ───

  async adminLogin(email: string, password: string): Promise<AdminUser> {
    return this.request<AdminUser>(
      "/api/admin/auth/login",
      this.jsonInit("POST", { email, password }),
    );
  }

  async adminLogout(): Promise<void> {
    await this.request<void>("/api/admin/auth/logout", this.jsonInit("POST"));
  }

  async adminMe(): Promise<AdminUser> {
    return this.request<AdminUser>("/api/admin/auth/me");
  }

  /** Change the login email (current password required; revokes the session). */
  async adminChangeEmail(payload: ChangeEmailPayload): Promise<void> {
    await this.request<void>("/api/admin/auth/change-email", this.jsonInit("POST", payload));
  }

  /** Change the password (current password required; revokes the session). */
  async adminChangePassword(payload: ChangePasswordPayload): Promise<void> {
    await this.request<void>("/api/admin/auth/change-password", this.jsonInit("POST", payload));
  }

  /** Request a password-reset link; the backend always responds generically. */
  async adminForgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>(
      "/api/admin/auth/forgot-password",
      this.jsonInit("POST", { email }),
    );
  }

  /** Redeem a one-time reset token and set a new password. */
  async adminResetPassword(payload: ResetPasswordPayload): Promise<void> {
    await this.request<void>("/api/admin/auth/reset-password", this.jsonInit("POST", payload));
  }

  // ─── Admin: Shop settings ───

  async adminGetShop(): Promise<ShopSettings> {
    return this.request<ShopSettings>("/api/admin/shop");
  }

  async adminUpdateShop(payload: ShopSettingsUpdatePayload): Promise<ShopSettings> {
    return this.request<ShopSettings>(
      "/api/admin/shop",
      this.jsonInit("PUT", payload),
    );
  }

  // ─── Admin: Categories ───

  async adminListCategories(query: ProductAdminQueryParams = {}): Promise<Category[]> {
    const qs = this.buildQueryString(query as Record<string, string | number | boolean | undefined>);
    return this.request<Category[]>(`/api/admin/categories${qs}`);
  }

  async adminCreateCategory(payload: CategoryCreatePayload): Promise<Category> {
    return this.request<Category>(
      "/api/admin/categories",
      this.jsonInit("POST", payload),
    );
  }

  async adminGetCategory(id: string): Promise<Category> {
    return this.request<Category>(`/api/admin/categories/${encodeURIComponent(id)}`);
  }

  async adminUpdateCategory(id: string, payload: CategoryUpdatePayload): Promise<Category> {
    return this.request<Category>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      this.jsonInit("PUT", payload),
    );
  }

  async adminDeleteCategory(id: string): Promise<void> {
    await this.request<void>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ─── Admin: Subcategories ───

  async adminListSubcategories(query: ProductAdminQueryParams = {}): Promise<Subcategory[]> {
    const qs = this.buildQueryString(query as Record<string, string | number | boolean | undefined>);
    return this.request<Subcategory[]>(`/api/admin/subcategories${qs}`);
  }

  async adminCreateSubcategory(payload: SubcategoryCreatePayload): Promise<Subcategory> {
    return this.request<Subcategory>(
      "/api/admin/subcategories",
      this.jsonInit("POST", payload),
    );
  }

  async adminGetSubcategory(id: string): Promise<Subcategory> {
    return this.request<Subcategory>(`/api/admin/subcategories/${encodeURIComponent(id)}`);
  }

  async adminUpdateSubcategory(id: string, payload: SubcategoryUpdatePayload): Promise<Subcategory> {
    return this.request<Subcategory>(
      `/api/admin/subcategories/${encodeURIComponent(id)}`,
      this.jsonInit("PUT", payload),
    );
  }

  async adminDeleteSubcategory(id: string): Promise<void> {
    await this.request<void>(`/api/admin/subcategories/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ─── Admin: Products (multipart: JSON fields + optional image) ───

  async adminListProducts(query: ProductAdminQueryParams = {}): Promise<ProductAdminListPage> {
    const qs = this.buildQueryString(query as Record<string, string | number | boolean | undefined>);
    return this.request<ProductAdminListPage>(`/api/admin/products${qs}`);
  }

  async adminCreateProduct(
    payload: ProductCreatePayload,
    image?: File | null,
  ): Promise<AdminProduct> {
    return this.request<AdminProduct>(
      "/api/admin/products",
      this.multipartInit(payload, image),
    );
  }

  async adminGetProduct(id: string): Promise<AdminProduct> {
    return this.request<AdminProduct>(`/api/admin/products/${encodeURIComponent(id)}`);
  }

  async adminUpdateProduct(
    id: string,
    payload: ProductUpdatePayload,
    image?: File | null,
  ): Promise<AdminProduct> {
    return this.request<AdminProduct>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      this.multipartInit(payload, image, true),
    );
  }

  /**
   * Atomically adjust a product's stock by exactly one unit.
   *
   * `delta` is `+1` to add one unit or `-1` to remove one unit; the backend
   * rejects decrements below zero and returns the persisted product.
   */
  async adminAdjustProductStock(id: string, delta: 1 | -1): Promise<AdminProduct> {
    return this.request<AdminProduct>(
      `/api/admin/products/${encodeURIComponent(id)}/stock`,
      this.jsonInit("PATCH", { delta }),
    );
  }

  async adminDeleteProduct(id: string): Promise<void> {
    await this.request<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ─── Admin: Testimonials (moderation) ───

  async adminListTestimonials(
    query: TestimonialAdminQueryParams = {},
  ): Promise<AdminTestimonialListPage> {
    const qs = this.buildQueryString(
      query as Record<string, string | number | boolean | undefined>,
    );
    return this.request<AdminTestimonialListPage>(`/api/admin/testimonials${qs}`);
  }

  async adminUpdateTestimonial(
    id: string,
    payload: TestimonialUpdatePayload,
  ): Promise<AdminTestimonial> {
    return this.request<AdminTestimonial>(
      `/api/admin/testimonials/${encodeURIComponent(id)}`,
      this.jsonInit("PUT", payload),
    );
  }

  async adminSetTestimonialStatus(
    id: string,
    status: TestimonialStatus,
  ): Promise<AdminTestimonial> {
    return this.request<AdminTestimonial>(
      `/api/admin/testimonials/${encodeURIComponent(id)}/status`,
      this.jsonInit("PATCH", { status }),
    );
  }

  async adminSetTestimonialPublication(
    id: string,
    published: boolean,
  ): Promise<AdminTestimonial> {
    return this.request<AdminTestimonial>(
      `/api/admin/testimonials/${encodeURIComponent(id)}/publication`,
      this.jsonInit("PATCH", { published }),
    );
  }

  async adminSetTestimonialFeatured(id: string, isFeatured: boolean): Promise<AdminTestimonial> {
    return this.request<AdminTestimonial>(
      `/api/admin/testimonials/${encodeURIComponent(id)}/feature`,
      this.jsonInit("PATCH", { is_featured: isFeatured }),
    );
  }

  async adminDeleteTestimonial(id: string): Promise<void> {
    await this.request<void>(`/api/admin/testimonials/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // ─── Gallery (public) ───

  /** Published gallery items only, with media-type/category filters. */
  async getGallery(params: GalleryQueryParams = {}): Promise<GalleryListPage> {
    const query = this.buildQueryString(params as Record<string, string | number>);
    return this.request<GalleryListPage>(`/api/gallery${query}`);
  }

  /** Published, featured gallery items for marketing surfaces (homepage). */
  async getFeaturedGallery(
    params: { page?: number; page_size?: number } = {},
  ): Promise<GalleryListPage> {
    const query = this.buildQueryString(params);
    return this.request<GalleryListPage>(`/api/gallery/featured${query}`);
  }

  /** Public detail; unpublished items are not reachable (404). */
  async getGalleryItem(id: string): Promise<GalleryItem> {
    return this.request<GalleryItem>(`/api/gallery/${encodeURIComponent(id)}`);
  }

  // ─── Admin: Gallery ───

  async adminListGallery(query: GalleryAdminQueryParams = {}): Promise<AdminGalleryListPage> {
    const qs = this.buildQueryString(
      query as Record<string, string | number | boolean | undefined>,
    );
    return this.request<AdminGalleryListPage>(`/api/admin/gallery${qs}`);
  }

  async adminGetGalleryItem(id: string): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(`/api/admin/gallery/${encodeURIComponent(id)}`);
  }

  /** Create one item from a single file; `title` defaults to the filename stem. */
  async adminCreateGallery(
    payload: GalleryCreatePayload,
    file: File,
  ): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(
      "/api/admin/gallery",
      { method: "POST", body: this.galleryFormData(payload, file) },
    );
  }

  /** Upload up to the configured maximum of files in one batch request. */
  async adminCreateGalleryBatch(
    files: File[],
    payload: GalleryBatchPayload = {},
  ): Promise<GalleryBatchResult> {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file, file.name);
    }
    if (payload.category !== undefined && payload.category !== null) {
      form.append("category", payload.category);
    }
    if (payload.description) {
      form.append("description", payload.description);
    }
    return this.request<GalleryBatchResult>("/api/admin/gallery/batch", {
      method: "POST",
      body: form,
    });
  }

  /** Update metadata and optionally replace the stored media. */
  async adminUpdateGallery(
    id: string,
    payload: GalleryUpdatePayload,
    file?: File | null,
  ): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(
      `/api/admin/gallery/${encodeURIComponent(id)}`,
      { method: "PUT", body: this.galleryFormData(payload, file) },
    );
  }

  async adminSetGalleryPublication(id: string, is_published: boolean): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(
      `/api/admin/gallery/${encodeURIComponent(id)}/publication`,
      this.jsonInit("PATCH", { is_published }),
    );
  }

  async adminSetGalleryFeatured(id: string, is_featured: boolean): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(
      `/api/admin/gallery/${encodeURIComponent(id)}/feature`,
      this.jsonInit("PATCH", { is_featured }),
    );
  }

  async adminSetGalleryOrder(id: string, display_order: number): Promise<AdminGalleryItem> {
    return this.request<AdminGalleryItem>(
      `/api/admin/gallery/${encodeURIComponent(id)}/order`,
      this.jsonInit("PATCH", { display_order }),
    );
  }

  async adminDeleteGallery(id: string): Promise<void> {
    await this.request<void>(`/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // ─── Request builders ───

  private jsonInit(method: string, body?: unknown): RequestInit {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
  }

  /** Build the multipart body shared by gallery create/update. */
  private galleryFormData(
    payload: GalleryCreatePayload | GalleryUpdatePayload,
    file?: File | null,
  ): FormData {
    const form = new FormData();
    if (file) {
      form.append("file", file, file.name);
    }
    for (const field of ["title", "description", "category"] as const) {
      const value = payload[field];
      if (value !== undefined && value !== null) {
        form.append(field, String(value));
      }
    }
    const order = payload.display_order;
    if (order !== undefined && order !== null) {
      form.append("display_order", String(order));
    }
    const clearFields = "clear_fields" in payload ? payload.clear_fields : undefined;
    if (Array.isArray(clearFields) && clearFields.length > 0) {
      form.append("clear_fields", clearFields.join(","));
    }
    return form;
  }

  private multipartInit(
    payload: ProductCreatePayload | ProductUpdatePayload,
    image?: File | null,
    isUpdate = false,
  ): RequestInit {
    const form = new FormData();
    const fields: (keyof (ProductCreatePayload | ProductUpdatePayload))[] = [
      "name",
      "category_id",
      "subcategory_id",
      "description",
      "price",
      "availability",
      "stock_quantity",
      "external_url",
      "is_active",
    ];
    for (const field of fields) {
      const value = (payload as Record<keyof (ProductCreatePayload | ProductUpdatePayload), unknown>)[field];
      if (value !== undefined && value !== null) {
        form.append(String(field), String(value));
      }
    }
    if (isUpdate && Array.isArray((payload as ProductUpdatePayload).clear_fields)) {
      form.append("clear_fields", (payload as ProductUpdatePayload).clear_fields!.join(","));
    }
    const tags = payload.vehicle_tags;
    if (Array.isArray(tags)) {
      form.append("vehicle_tags", JSON.stringify(tags));
    }
    if (image) {
      form.append("image", image, image.name);
    }
    return { method: isUpdate ? "PUT" : "POST", body: form };
  }
}

// ─── Error class ───

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

// ─── Singleton ───

export const api = new ApiClient(API_BASE);
