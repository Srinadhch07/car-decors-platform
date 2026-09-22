import { useNavigate, useParams } from "react-router-dom";
import type { Product } from "../../../types/api";
import { Container, SectionHeading } from "../../../components/ui";
import { ProductForm } from "./ProductForm";

export function ProductFormPage() {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const isCreate = !productId || productId === "new";

  const handleSaved = (_product: Product) => {
    navigate("/admin/products");
  };

  const handleCancel = () => {
    navigate("/admin/products");
  };

  return (
    <Container className="py-8">
      <SectionHeading
        title={isCreate ? "Add Product" : "Edit Product"}
        subtitle={
          isCreate
            ? "Create a new product in your catalog."
            : "Update the product details below."
        }
      />
      <ProductForm
        productId={isCreate ? undefined : productId}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    </Container>
  );
}

export default ProductFormPage;