import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import type { Category, Product } from "../../types/api";
import { ApiRequestError, api } from "../../lib/api/client";
import { formatPrice, availabilityLabel } from "../../lib/utils/format";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { Badge, Container } from "../../components/ui";

interface ProductDetailProps {
  slug: string;
}

export function ProductDetail({ slug }: ProductDetailProps) {
  const { data: shop } = useShopSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setCategory(null);

    api
      .getProduct(slug)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        return Promise.all([api.getCategories(), Promise.resolve(data)]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [cats, prod] = result;
        const productCategory = cats.find((c) => c.id === prod.category_id);
        if (productCategory) setCategory(productCategory);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setError("Product not found");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load product");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // SEO
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | ${shop?.shop_name ?? "Car Decor"}`;
    }
  }, [product, shop]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <section className="section-y">
        <Container>
          <div className="animate-pulse">
            <div className="mb-6 h-4 w-48 rounded bg-surface-muted" />
            <div className="grid gap-8 md:grid-cols-2">
              <div className="aspect-square rounded-lg bg-surface-muted" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded bg-surface-muted" />
                <div className="h-6 w-1/3 rounded bg-surface-muted" />
                <div className="h-4 w-full rounded bg-surface-muted" />
                <div className="h-4 w-5/6 rounded bg-surface-muted" />
                <div className="h-12 w-full rounded bg-surface-muted" />
              </div>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // --- Error / 404 ---
  if (error) {
    const is404 = error === "Product not found";
    return (
      <section className="section-y">
        <Container>
          <div className="py-16 text-center">
            <h1 className="mb-4 text-2xl font-bold text-text-primary">
              {is404 ? "Product Not Found" : "Something went wrong"}
            </h1>
            <p className="mb-6 text-text-secondary">{error}</p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  if (!product) return null;

  const availVariant =
    product.availability === "IN_STOCK"
      ? "success"
      : product.availability === "OUT_OF_STOCK"
        ? "error"
        : "warning";

  const whatsappUrl =
    shop?.whatsapp_number
      ? buildWhatsAppUrl(shop.whatsapp_number, product.name, product.vehicle_tags[0])
      : null;

  return (
    <div>
      {/* Breadcrumb */}
      <section className="border-b border-border-light bg-surface-muted">
        <Container className="py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-muted">
            <Link to="/" className="hover:text-orange-600">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/products" className="hover:text-orange-600">
              Products
            </Link>
            {category && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/categories/${category.slug}`}
                  className="hover:text-orange-600"
                >
                  {category.name}
                </Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span className="text-text-primary font-medium truncate">{product.name}</span>
          </nav>
        </Container>
      </section>

      {/* Product detail */}
      <section className="section-y">
        <Container>
          <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border-light bg-surface-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/product-fallback.svg";
                  }}
                />
              ) : (
                <img
                  src="/images/product-fallback.svg"
                  alt=""
                  className="h-full w-full object-cover opacity-60"
                  aria-hidden="true"
                />
              )}
              {/* Availability badge */}
              <div className="absolute top-3 left-3">
                <Badge variant={availVariant}>
                  {availabilityLabel(product.availability)}
                </Badge>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                {product.name}
              </h1>

              {/* Price */}
              <p className="mt-3 text-2xl font-bold text-orange-600 sm:text-3xl">
                {formatPrice(product.price)}
              </p>

              {/* Description */}
              {product.description && (
                <p className="mt-4 leading-relaxed text-text-secondary">
                  {product.description}
                </p>
              )}

              {/* Vehicle tags */}
              {product.vehicle_tags.length > 0 && (
                <div className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold text-text-primary">
                    Compatible Vehicles
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {product.vehicle_tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp CTA */}
              {whatsappUrl && (
                <div className="mt-8">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 shadow-sm sm:w-auto"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Enquire on WhatsApp
                  </a>
                </div>
              )}

              {/* Phone / contact fallback */}
              {!whatsappUrl && hasContent(shop?.phone) && (
                <div className="mt-8">
                  <a
                    href={`tel:${shop!.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 shadow-sm sm:w-auto"
                  >
                    <Phone className="h-5 w-5" />
                    Call Us
                  </a>
                </div>
              )}

              {/* Back link */}
              <div className="mt-auto pt-8">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Products
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
