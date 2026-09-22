import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Layout } from "../../components/layout/Layout";
import { AdminAuthProvider } from "../../features/admin/auth";
import { AdminShell } from "../../features/admin/layout";
import {
  AboutPage,
  CategoryPage,
  ContactPage,
  HomePage,
  NotFoundPage,
  ProductDetailPage,
  ProductsPage,
} from "../../pages";
import { CategoriesAdminPage } from "../../pages/admin/categories/CategoriesAdminPage";
import { DashboardPage } from "../../pages/admin/dashboard/DashboardPage";
import { ProductFormPage } from "../../pages/admin/products/ProductFormPage";
import { ProductsAdminPage } from "../../pages/admin/products/ProductsAdminPage";
import { ShopSettingsAdminPage } from "../../pages/admin/shop/ShopSettingsAdminPage";
import { SubcategoriesAdminPage } from "../../pages/admin/subcategories/SubcategoriesAdminPage";
import { LoginPage } from "../../pages/admin/auth/LoginPage";

function withLayout(Page: React.ComponentType) {
  return function Wrapped() {
    return (
      <Layout>
        <Page />
      </Layout>
    );
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: withLayout(HomePage)(),
    errorElement: withLayout(NotFoundPage)(),
  },
  {
    path: "/products",
    element: withLayout(ProductsPage)(),
  },
  {
    path: "/products/:slug",
    element: withLayout(ProductDetailPage)(),
  },
  {
    path: "/categories/:slug",
    element: withLayout(CategoryPage)(),
  },
  {
    path: "/about",
    element: withLayout(AboutPage)(),
  },
  {
    path: "/contact",
    element: withLayout(ContactPage)(),
  },
  {
    path: "/admin/login",
    element: (
      <AdminAuthProvider>
        <LoginPage />
      </AdminAuthProvider>
    ),
  },
  {
    path: "/admin",
    element: (
      <AdminAuthProvider>
        <AdminShell />
      </AdminAuthProvider>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <ProductsAdminPage /> },
      { path: "products/new", element: <ProductFormPage /> },
      { path: "products/:productId/edit", element: <ProductFormPage /> },
      { path: "categories", element: <CategoriesAdminPage /> },
      { path: "subcategories", element: <SubcategoriesAdminPage /> },
      { path: "shop", element: <ShopSettingsAdminPage /> },
      { path: "*", element: <Navigate to="/admin" replace /> },
    ],
  },
  {
    path: "*",
    element: withLayout(NotFoundPage)(),
  },
]);
