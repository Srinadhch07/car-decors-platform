import { useParams } from "react-router-dom";
import { CategoryDetail } from "../features/categories/CategoryDetail";

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return <CategoryDetail slug={slug} />;
}
