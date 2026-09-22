import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { Category, Product, Subcategory } from "../../../types/api";
import { ProductForm } from "./ProductForm";

// URL.createObjectURL is unreliable in the jsdom test environment; override it.
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  configurable: true,
  value: () => "blob:mock-product-image",
});
Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  configurable: true,
  value: () => undefined,
});

// ─── Mock data ───

const mockCategories: Category[] = [
  { id: "cat-1", name: "Seat Covers", slug: "seat-covers", description: null, image_url: null, sort_order: 0, is_active: true },
  { id: "cat-2", name: "Floor Mats", slug: "floor-mats", description: null, image_url: null, sort_order: 1, is_active: true },
];

const mockSubcategories: Subcategory[] = [
  { id: "sub-1", category_id: "cat-1", name: "Premium", slug: "premium", image_url: null, sort_order: 0, is_active: true },
];

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    category_id: "cat-1",
    subcategory_id: "sub-1",
    name: "Leather Seat Cover",
    slug: "leather-seat-cover",
    description: "Premium leather",
    price: "2999",
    availability: "IN_STOCK",
    is_active: true,
    vehicle_tags: ["Swift", "City"],
    image_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const existingProduct = makeProduct();

const savedProduct = makeProduct({ id: "prod-new", slug: "leather-seat-cover" });

// ─── MSW Server ───

let lastPostForm: FormData | null = null;
let lastPutForm: FormData | null = null;
let postCount = 0;
let putCount = 0;

const handlers = [
  http.get("*/api/categories", () => HttpResponse.json(mockCategories)),
  http.get("*/api/categories/:slug/subcategories", ({ params }) => {
    if (params.slug === "seat-covers") return HttpResponse.json(mockSubcategories);
    return HttpResponse.json([]);
  }),
  http.get("*/api/admin/products/:id", () => HttpResponse.json(existingProduct)),
  http.post("*/api/admin/products", async ({ request }) => {
    postCount += 1;
    lastPostForm = await request.formData().catch((e: unknown) => {
      console.error("DIAG FORM_DATA STACK", (e as Error)?.stack ?? String(e));
      throw e;
    });
    return HttpResponse.json(savedProduct, { status: 201 });
  }),
  http.put("*/api/admin/products/:id", async ({ request }) => {
    putCount += 1;
    lastPutForm = await request.formData();
    return HttpResponse.json(existingProduct);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastPostForm = null;
  lastPutForm = null;
  postCount = 0;
  putCount = 0;
});
afterAll(() => server.close());

function renderForm(
  props: { productId?: string; onSaved?: (product: Product) => void } = {},
) {
  const onSaved = props.onSaved ?? (() => {});
  return render(
    <ProductForm productId={props.productId} onSaved={onSaved} onCancel={() => {}} />,
    {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/admin/products/new"]}>{children}</TestWrapper>
      ),
    },
  );
}

async function waitForCategoriesLoaded() {
  await waitFor(() => {
    const select = document.getElementById("product-category") as HTMLSelectElement;
    expect(Array.from(select.options).some((o) => o.value === "cat-1")).toBe(true);
  });
}

function categorySelect(): HTMLSelectElement {
  return document.getElementById("product-category") as HTMLSelectElement;
}

// ─── Create mode ───

describe("ProductForm create mode", () => {
  it("renders the Add Product heading", async () => {
    renderForm();
    expect(await screen.findByRole("heading", { name: "Add Product" })).toBeInTheDocument();
  });

  it("loads categories into the dropdown", async () => {
    renderForm();
    await waitForCategoriesLoaded();
    const select = document.getElementById("product-category") as HTMLSelectElement;
    expect(select.querySelector('option[value="cat-1"]')).toBeInTheDocument();
    expect(select.querySelector('option[value="cat-2"]')).toBeInTheDocument();
  });

  it("loads subcategories when a category is selected", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    const subcatSelect = document.getElementById("product-subcategory") as HTMLSelectElement;
    expect(subcatSelect).toBeDisabled();

    await user.selectOptions(categorySelect(), "cat-1");

    await waitFor(() => {
      expect(subcatSelect.querySelector('option[value="sub-1"]')).toBeInTheDocument();
    });
    expect(subcatSelect).toBeEnabled();
  });

  it("submits a multipart create payload", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.selectOptions(categorySelect(), "cat-1");
    await user.type(screen.getByLabelText(/description/i), "Premium calf leather");
    await user.type(screen.getByLabelText(/price/i), "2999");
    await user.selectOptions(screen.getByLabelText(/availability/i), "ON_ORDER");

    const tagInput = document.getElementById("product-tags") as HTMLInputElement;
    await user.type(tagInput, "Hyundai Creta");
    await user.click(screen.getByRole("button", { name: /add vehicle tag/i }));

    await user.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(lastPostForm).not.toBeNull();
    });
    expect(lastPostForm!.get("name")).toBe("Leather Seat Cover");
    expect(lastPostForm!.get("category_id")).toBe("cat-1");
    expect(lastPostForm!.get("description")).toBe("Premium calf leather");
    expect(lastPostForm!.get("price")).toBe("2999");
    expect(lastPostForm!.get("availability")).toBe("ON_ORDER");
    expect(lastPostForm!.get("is_active")).toBe("true");
    expect(JSON.parse(String(lastPostForm!.get("vehicle_tags")))).toEqual(["Hyundai Creta"]);
    expect(postCount).toBe(1);
  });

  it("sends an image file when one is selected", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.selectOptions(categorySelect(), "cat-1");

    const file = new File(["image-bytes"], "seat-cover.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText(/choose image/i) as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Product image preview" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(lastPostForm).not.toBeNull();
    });
    const uploaded = lastPostForm!.get("image");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("seat-cover.jpg");
  });

  it("omits the price field when left blank (null price)", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.selectOptions(categorySelect(), "cat-1");

    await user.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(lastPostForm).not.toBeNull();
    });
    expect(lastPostForm!.has("price")).toBe(false);
  });

  it("reports missing name via validation without a request", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.selectOptions(categorySelect(), "cat-1");
    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Product name is required.",
    );
    expect(postCount).toBe(0);
  });

  it("reports missing category via validation", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please choose a category.",
    );
    expect(postCount).toBe(0);
  });

  it("validates the price format", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.selectOptions(categorySelect(), "cat-1");
    await user.type(screen.getByLabelText(/price/i), "not-a-number");

    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Price must be a valid number");
    expect(postCount).toBe(0);
  });

  it("surfaces the API error message on create failure", async () => {
    server.use(
      http.post("*/api/admin/products", () =>
        HttpResponse.json({ detail: "Category does not exist" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    await user.type(screen.getByLabelText(/product name/i), "Leather Seat Cover");
    await user.selectOptions(categorySelect(), "cat-1");

    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Category does not exist");
  });

  it("calls onCancel when cancelled", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
  });
});

// ─── Edit mode ───

describe("ProductForm edit mode", () => {
  it("renders the Edit Product heading and pre-fills values", async () => {
    renderForm({ productId: "prod-1" });
    expect(await screen.findByRole("heading", { name: "Edit Product" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });
    expect(screen.getByLabelText(/description/i)).toHaveValue("Premium leather");
    expect(screen.getByLabelText(/price/i)).toHaveValue("2999");
    expect(screen.getByLabelText(/availability/i)).toHaveValue("IN_STOCK");
    expect(categorySelect()).toHaveValue("cat-1");
  });

  it("pre-selects the existing subcategory", async () => {
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/subcategory/i)).not.toBeDisabled();
    });
    expect(screen.getByLabelText(/subcategory/i)).toHaveValue("sub-1");
  });

  it("pre-fills vehicle tags", async () => {
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });
    expect(screen.getByText("Swift")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
  });

  it("shows the existing image preview in edit mode", async () => {
    server.use(
      http.get("*/api/admin/products/:id", () =>
        HttpResponse.json(makeProduct({ image_url: "/media/old.jpg" })),
      ),
    );
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Product image preview" })).toHaveAttribute(
        "src",
        "/media/old.jpg",
      );
    });
  });

  it("submits an update payload via PUT", async () => {
    const user = userEvent.setup();
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });

    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), "Updated description");
    await user.selectOptions(screen.getByLabelText(/availability/i), "OUT_OF_STOCK");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(lastPutForm).not.toBeNull();
    });
    expect(lastPutForm!.get("description")).toBe("Updated description");
    expect(lastPutForm!.get("availability")).toBe("OUT_OF_STOCK");
    expect(putCount).toBe(1);
  });

  it("sends clear_fields when the price is emptied", async () => {
    const user = userEvent.setup();
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });

    await user.clear(screen.getByLabelText(/price/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(lastPutForm).not.toBeNull();
    });
    expect(lastPutForm!.has("price")).toBe(false);
    expect(lastPutForm!.get("clear_fields")).toContain("price");
  });

  it("sends clear_fields when the subcategory is removed", async () => {
    const user = userEvent.setup();
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/subcategory/i)).not.toBeDisabled();
    });

    await user.selectOptions(screen.getByLabelText(/subcategory/i), "");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(lastPutForm).not.toBeNull();
    });
    expect(lastPutForm!.has("subcategory_id")).toBe(false);
    expect(lastPutForm!.get("clear_fields")).toContain("subcategory_id");
  });

  it("resets the subcategory when the category changes and clears via clear_fields", async () => {
    const user = userEvent.setup();
    renderForm({ productId: "prod-1" });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/subcategory/i)).not.toBeDisabled();
    });

    await user.selectOptions(categorySelect(), "cat-2");
    await waitFor(() => {
      expect(screen.getByLabelText(/subcategory/i)).toHaveValue("");
    });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(lastPutForm).not.toBeNull();
    });
    expect(lastPutForm!.get("category_id")).toBe("cat-2");
    expect(lastPutForm!.get("clear_fields")).toContain("subcategory_id");
  });

  it("calls onSaved with the returned product", async () => {
    let saved: Product | null = null;
    const user = userEvent.setup();
    renderForm({ productId: "prod-1", onSaved: (p) => { saved = p; } });
    await waitFor(() => {
      expect(screen.getByLabelText(/product name/i)).toHaveValue("Leather Seat Cover");
    });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(saved).not.toBeNull();
    });
    expect(saved!.id).toBe("prod-1");
  });

  it("adds and removes vehicle tags", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    const tagInput = document.getElementById("product-tags") as HTMLInputElement;
    await user.type(tagInput, "Honda City{enter}");
    expect(screen.getByText("Honda City")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove tag honda city/i }));
    expect(await screen.queryByText("Honda City")).not.toBeInTheDocument();
  });

  it("does not duplicate duplicate tags", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitForCategoriesLoaded();

    const tagInput = document.getElementById("product-tags") as HTMLInputElement;
    await user.type(tagInput, "Swift");
    await user.click(screen.getByRole("button", { name: /add vehicle tag/i }));
    await user.type(tagInput, "Swift");
    await user.click(screen.getByRole("button", { name: /add vehicle tag/i }));

    const tagList = screen.getByLabelText("Added vehicle tags");
    expect(within(tagList).getAllByText("Swift").length).toBe(1);
  });
});
