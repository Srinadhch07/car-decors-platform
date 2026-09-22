"""Real MongoDB + real local storage smoke test for B5."""

import asyncio
import os
import sys
import uuid

os.chdir(os.path.dirname(os.path.abspath(__file__)))

JPEG_TINY = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"
PNG_TINY = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx"
    b"\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)


async def main() -> int:
    import httpx
    from bson import ObjectId
    from httpx import ASGITransport

    from app.core.config import Settings, get_settings
    from app.core.db import mongo
    from app.db.dependencies import get_database
    from app.main import create_app
    from app.repositories.categories import CategoryRepository
    from app.repositories.products import ProductRepository
    from app.repositories.subcategories import SubcategoryRepository
    from app.storage.base import build_storage

    settings = Settings()
    app = create_app()

    connected = await mongo.connect(
        settings.mongo_uri, settings.mongo_db_name, settings.mongo_timeout_ms
    )
    if not connected:
        print("ERROR: Could not connect to MongoDB")
        return 1
    database = mongo.database

    storage = build_storage(settings)
    app.state.storage = storage
    app.dependency_overrides[get_database] = lambda: database

    print(f"Storage mode: {settings.storage_mode}")
    print(f"DB: {settings.mongo_db_name}")

    initial_products = await ProductRepository(database).count()
    initial_categories = await CategoryRepository(database).count()
    initial_subcategories = await SubcategoryRepository(database).count()
    print("\n--- Initial state ---")
    print(f"Products: {initial_products}")
    print(f"Categories: {initial_categories}")
    print(f"Subcategories: {initial_subcategories}")

    uuid_tag = uuid.uuid4().hex[:8]
    smoke_cat_name = f"B5 Smoke Cat {uuid_tag}"
    smoke_sub_name = f"B5 Smoke Sub {uuid_tag}"
    smoke_prod_name = f"B5 Smoke Product {uuid_tag}"
    smoke_prod_slug = f"b5-smoke-product-{uuid_tag}"

    results = []

    def check(label: str, ok: bool) -> None:
        status = "PASS" if ok else "FAIL"
        results.append((label, ok))
        print(f"  [{status}] {label}")

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Login
        print("\n--- 1. Login ---")
        login = await client.post(
            "/api/admin/auth/login",
            json={
                "email": "admin@example.com",
                "password": "correct-horse-battery",
            },
        )
        check("Login succeeds (200)", login.status_code == 200)

        csrf = client.cookies.get(get_settings().csrf_cookie_name) or ""
        headers = {"X-CSRF-Token": csrf}

        # 2. Create smoke category
        print("\n--- 2. Category ---")
        cat_resp = await client.post(
            "/api/admin/categories",
            headers=headers,
            json={
                "name": smoke_cat_name,
                "is_active": True,
                "sort_order": 100,
                "description": "Smoke test category",
            },
        )
        check("Category created (201)", cat_resp.status_code == 201)
        cat = cat_resp.json()
        check("Category has id", "id" in cat and cat["id"])

        # 3. Create smoke subcategory
        print("\n--- 3. Subcategory ---")
        sub_resp = await client.post(
            "/api/admin/subcategories",
            headers=headers,
            json={
                "category_id": cat["id"],
                "name": smoke_sub_name,
                "is_active": True,
                "sort_order": 100,
            },
        )
        check("Subcategory created (201)", sub_resp.status_code == 201)
        sub = sub_resp.json()
        check("Subcategory has id", "id" in sub and sub["id"])

        # 4. Create product with image
        print("\n--- 4. Product creation with image ---")
        files = {"image": ("test.jpg", JPEG_TINY, "image/jpeg")}
        data = {
            "name": smoke_prod_name,
            "category_id": cat["id"],
            "subcategory_id": sub["id"],
            "description": "A B5 smoke test product for verification",
            "price": "1299.99",
            "availability": "IN_STOCK",
            "is_active": "true",
            "vehicle_tags": '["Hyundai Creta", "Universal Fit"]',
        }
        create_resp = await client.post(
            "/api/admin/products", headers=headers, data=data, files=files
        )
        check("Product created (201)", create_resp.status_code == 201)
        product = create_resp.json()
        product_id = product["id"]
        check("Product has id", "id" in product and product_id)
        check(
            "Product slug auto-generated",
            product.get("slug", "").startswith("b5-smoke-product-"),
        )
        check("Product price round-trips", product.get("price") == "1299.99")
        check("Product is IN_STOCK", product.get("availability") == "IN_STOCK")
        check("Product is active", product.get("is_active") is True)
        check(
            "Product has vehicle_tags",
            set(product.get("vehicle_tags", [])) == {"Hyundai Creta", "Universal Fit"},
        )
        check(
            "Product description",
            product.get("description") == "A B5 smoke test product for verification",
        )

        # 5. Verify image_url in MongoDB
        print("\n--- 5. Image URL persistence ---")
        db_product = await ProductRepository(database).get_by_id(ObjectId(product_id))
        check("Product exists in MongoDB", db_product is not None)
        check(
            "image_url stored in DB",
            db_product is not None and db_product.image_url is not None,
        )
        check(
            "image_url starts with /media/products/",
            db_product is not None
            and db_product.image_url is not None
            and db_product.image_url.startswith("/media/products/"),
        )

        # 6. Verify image exists in storage
        print("\n--- 6. Storage verification ---")
        if db_product and db_product.image_url:
            img_key = storage.extract_key_from_url(db_product.image_url)
            check("Key extracted from URL", img_key is not None)
            check(
                "Image file exists in storage",
                img_key is not None and storage.file_exists(img_key),
            )

        # 7. Public listing
        print("\n--- 7. Public listing ---")
        listing = await client.get("/api/products")
        check("Public listing (200)", listing.status_code == 200)
        listing_data = listing.json()
        slugs = [i["slug"] for i in listing_data["items"]]
        check("Smoke product in public listing", smoke_prod_slug in slugs)
        check("Total count >= 1", listing_data["total"] >= 1)

        # 8. Public detail
        print("\n--- 8. Public detail ---")
        detail = await client.get(f"/api/products/{smoke_prod_slug}")
        check("Public detail (200)", detail.status_code == 200)
        detail_data = detail.json()
        check("Detail name matches", detail_data["name"] == smoke_prod_name)
        check(
            "Detail category_id matches",
            detail_data["category_id"] == cat["id"],
        )
        check(
            "Detail subcategory_id matches",
            detail_data["subcategory_id"] == sub["id"],
        )

        # 9. Search
        print("\n--- 9. Search ---")
        search_resp = await client.get("/api/products", params={"search": smoke_prod_name})
        search_data = search_resp.json()
        check(
            "Search by name finds product",
            any(i["name"] == smoke_prod_name for i in search_data["items"]),
        )
        search_desc = await client.get("/api/products", params={"search": "smoke test product"})
        search_desc_data = search_desc.json()
        check(
            "Search by description finds product",
            any(i["name"] == smoke_prod_name for i in search_desc_data["items"]),
        )
        search_tag = await client.get("/api/products", params={"search": "Hyundai Creta"})
        search_tag_data = search_tag.json()
        check(
            "Search by vehicle tag finds product",
            any(i["name"] == smoke_prod_name for i in search_tag_data["items"]),
        )

        # 10. Filters
        print("\n--- 10. Filters ---")
        by_cat = await client.get("/api/products", params={"category": cat["slug"]})
        check(
            "Category filter finds product",
            any(i["name"] == smoke_prod_name for i in by_cat.json()["items"]),
        )
        by_sub = await client.get("/api/products", params={"subcategory": sub["slug"]})
        check(
            "Subcategory filter finds product",
            any(i["name"] == smoke_prod_name for i in by_sub.json()["items"]),
        )
        by_vehicle = await client.get("/api/products", params={"vehicle": "Creta"})
        check(
            "Vehicle filter finds product",
            any(i["name"] == smoke_prod_name for i in by_vehicle.json()["items"]),
        )
        by_avail = await client.get("/api/products", params={"availability": "IN_STOCK"})
        check(
            "Availability filter finds product",
            any(i["name"] == smoke_prod_name for i in by_avail.json()["items"]),
        )

        # 11. Combined filters
        print("\n--- 11. Combined filters ---")
        combined = await client.get(
            "/api/products",
            params={
                "category": cat["slug"],
                "vehicle": "Creta",
                "availability": "IN_STOCK",
            },
        )
        combined_data = combined.json()
        check(
            "Combined filters find product",
            any(i["name"] == smoke_prod_name for i in combined_data["items"]),
        )

        # 12. Sort
        print("\n--- 12. Sort ---")
        for sort_val in [
            "newest",
            "oldest",
            "name_asc",
            "name_desc",
            "price_asc",
            "price_desc",
        ]:
            s = await client.get(
                "/api/products",
                params={"sort": sort_val, "category": cat["slug"]},
            )
            check(f"Sort '{sort_val}' works (200)", s.status_code == 200)

        # 13. Pagination
        print("\n--- 13. Pagination ---")
        page1 = (await client.get("/api/products", params={"page": 1, "page_size": 2})).json()
        check(
            "Pagination page 1",
            "items" in page1 and "total_pages" in page1,
        )
        check("Page size 2", len(page1["items"]) <= 2)

        # 14. Update product
        print("\n--- 14. Update product ---")
        update_resp = await client.put(
            f"/api/admin/products/{product_id}",
            headers=headers,
            data={
                "name": smoke_prod_name + " Updated",
                "price": "2499.00",
            },
        )
        check("Product update (200)", update_resp.status_code == 200)
        updated = update_resp.json()
        check(
            "Updated name",
            updated["name"] == smoke_prod_name + " Updated",
        )
        check("Updated price", updated["price"] == "2499.00")
        check(
            "Slug stable after rename",
            updated["slug"] == smoke_prod_slug,
        )

        # 15. Image replacement
        print("\n--- 15. Image replacement ---")
        old_image_url = updated["image_url"]
        old_img_key = storage.extract_key_from_url(old_image_url)
        replace_resp = await client.put(
            f"/api/admin/products/{product_id}",
            headers=headers,
            files={"image": ("new.png", PNG_TINY, "image/png")},
        )
        check("Image replace (200)", replace_resp.status_code == 200)
        replaced = replace_resp.json()
        check(
            "New image URL differs",
            replaced["image_url"] != old_image_url,
        )
        new_img_key = storage.extract_key_from_url(replaced["image_url"])
        check(
            "New image exists in storage",
            storage.file_exists(new_img_key),
        )
        check("Old image cleaned up", not storage.file_exists(old_img_key))

        # 16. Deactivate / Reactivate
        print("\n--- 16. Deactivate / Reactivate ---")
        deactivate_resp = await client.put(
            f"/api/admin/products/{product_id}",
            headers=headers,
            data={"is_active": "false"},
        )
        check("Deactivate (200)", deactivate_resp.status_code == 200)
        check(
            "Product is_active=False",
            deactivate_resp.json()["is_active"] is False,
        )
        pub_after_deactivate = await client.get(f"/api/products/{smoke_prod_slug}")
        check(
            "Public detail 404 after deactivate",
            pub_after_deactivate.status_code == 404,
        )
        listing_after_deactivate = (
            await client.get("/api/products", params={"category": cat["slug"]})
        ).json()
        check(
            "Absent from listing after deactivate",
            not any(
                i["name"] == smoke_prod_name + " Updated" for i in listing_after_deactivate["items"]
            ),
        )

        reactivate_resp = await client.put(
            f"/api/admin/products/{product_id}",
            headers=headers,
            data={"is_active": "true"},
        )
        check("Reactivate (200)", reactivate_resp.status_code == 200)
        pub_after_reactivate = await client.get(f"/api/products/{smoke_prod_slug}")
        check(
            "Public detail 200 after reactivate",
            pub_after_reactivate.status_code == 200,
        )

        # 17. Delete product
        print("\n--- 17. Delete product ---")
        img_key_before_delete = storage.extract_key_from_url(replaced["image_url"])
        delete_resp = await client.delete(f"/api/admin/products/{product_id}", headers=headers)
        check("Delete product (204)", delete_resp.status_code == 204)
        gone = await client.get(f"/api/products/{smoke_prod_slug}")
        check("Product gone from public (404)", gone.status_code == 404)
        admin_gone = await client.get(f"/api/admin/products/{product_id}", headers=headers)
        check(
            "Product gone from admin (404)",
            admin_gone.status_code == 404,
        )
        check(
            "Image cleaned up from storage",
            not storage.file_exists(img_key_before_delete),
        )

        # 18. Delete subcategory and category
        print("\n--- 18. Cleanup subcategory & category ---")
        del_sub = await client.delete(f"/api/admin/subcategories/{sub['id']}", headers=headers)
        check("Delete subcategory (204)", del_sub.status_code == 204)
        del_cat = await client.delete(f"/api/admin/categories/{cat['id']}", headers=headers)
        check("Delete category (204)", del_cat.status_code == 204)

        # 19. Verify smoke records are gone
        print("\n--- 19. Verify cleanup ---")
        final_products = await ProductRepository(database).count()
        final_categories = await CategoryRepository(database).count()
        final_subcats = await SubcategoryRepository(database).count()
        check(
            "Products count restored",
            final_products == initial_products,
        )
        check(
            "Categories count restored",
            final_categories == initial_categories,
        )
        check(
            "Subcategories count restored",
            final_subcats == initial_subcategories,
        )

        # 20. Security spot checks (use fresh unauthenticated client)
        print("\n--- 20. Security spot checks ---")
        unauth_client = httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        unauth_create = await unauth_client.post("/api/admin/products", data=data)
        check(
            "Unauthenticated create -> 401",
            unauth_create.status_code == 401,
        )
        unauth_list = await unauth_client.get("/api/admin/products")
        check(
            "Unauthenticated admin list -> 401",
            unauth_list.status_code == 401,
        )
        public_no_auth = await unauth_client.get("/api/products")
        check(
            "Public listing requires no auth (200)",
            public_no_auth.status_code == 200,
        )
        await unauth_client.aclose()
        wrong_csrf = await client.post(
            "/api/admin/products",
            headers={"X-CSRF-Token": "wrong"},
            data=data,
        )
        check("Wrong CSRF -> 403", wrong_csrf.status_code == 403)

    await mongo.close()

    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    print(f"\n{'=' * 60}")
    print(f"SMOKE TEST RESULTS: {passed} passed, {failed} failed out of {len(results)}")
    if failed:
        print("\nFailed checks:")
        for label, ok in results:
            if not ok:
                print(f"  - {label}")
    else:
        print("\nALL CHECKS PASSED")
    print(f"{'=' * 60}")
    return 1 if failed else 0


exit_code = asyncio.run(main())
sys.exit(exit_code)
