import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiRequestError } from "./client";

describe("ApiClient", () => {
  const mockFetch = vi.fn();
  let client: ApiClient;

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    client = new ApiClient("http://localhost:8000");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ shop_name: "Test" }),
    });

    await client.getShopSettings();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/shop",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("throws ApiRequestError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ detail: "Product not found" }),
    });

    await expect(client.getProduct("nonexistent")).rejects.toThrow(ApiRequestError);
  });

  it("constructs query strings correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 12, total_pages: 0 }),
    });

    await client.getProducts({ search: "mat", page: 2 });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("?search=mat&page=2");
  });

  it("omits undefined params from query string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 12, total_pages: 0 }),
    });

    await client.getProducts({ search: "mat" });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe("http://localhost:8000/api/products?search=mat");
  });

});
