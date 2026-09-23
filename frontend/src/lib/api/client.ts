import type {
  AdminUser,
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  ChangeEmailPayload,
  ChangePasswordPayload,
  ForgotPasswordResponse,
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
  ): Promise<Product> {
    return this.request<Product>(
      "/api/admin/products",
      this.multipartInit(payload, image),
    );
  }

  async adminGetProduct(id: string): Promise<Product> {
    return this.request<Product>(`/api/admin/products/${encodeURIComponent(id)}`);
  }

  async adminUpdateProduct(
    id: string,
    payload: ProductUpdatePayload,
    image?: File | null,
  ): Promise<Product> {
    return this.request<Product>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      this.multipartInit(payload, image, true),
    );
  }

  async adminDeleteProduct(id: string): Promise<void> {
    await this.request<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ─── Request builders ───

  private jsonInit(method: string, body?: unknown): RequestInit {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
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
