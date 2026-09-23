import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Car, Layers, LayoutDashboard, LogOut, Menu, Package, ShieldCheck, Store, Tags, UserCircle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { ThridhaSignature } from "../../../components/common/ThridhaSignature";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Agreed admin routes. Sibling pages are mounted by Integration. */
const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/subcategories", label: "Subcategories", icon: Layers },
  { to: "/admin/shop", label: "Shop Settings", icon: Store },
  { to: "/admin/account", label: "Account", icon: UserCircle },
];

interface AdminNavProps {
  onNavigate?: () => void;
}

function AdminNav({ onNavigate }: AdminNavProps) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // The provider clears the session even when the logout call fails.
    }
    navigate("/admin/login", { replace: true });
  }

  return (
    <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-orange-600 text-white"
                : "text-text-muted hover:bg-dark-800 hover:text-white"
            }`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-dark-800 pt-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-dark-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Log out
        </button>
      </div>
    </nav>
  );
}

function AdminBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/admin"
      onClick={onNavigate}
      className="flex h-14 items-center gap-2 border-b border-dark-800 px-4 text-white"
    >
      <Car className="h-5 w-5 text-orange-500" aria-hidden="true" />
      <span className="font-bold tracking-tight">Car Decor Admin</span>
    </Link>
  );
}

export function AdminShell() {
  const { session, isAuthenticated, loading } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Give the first focusable element a starting point when the drawer opens.
  useEffect(() => {
    if (!mobileOpen) return;
    const menu = document.getElementById("admin-mobile-nav");
    menu?.querySelector<HTMLElement>("a, button")?.focus();
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-3 text-text-muted" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-orange-500" />
          <p className="text-sm">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-dark-900 lg:flex">
        <AdminBrand />
        <AdminNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="admin-mobile-nav"
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-dark-900 shadow-elevated"
          >
            <div className="flex items-center justify-between pr-2">
              <AdminBrand onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin navigation"
                className="rounded-md p-2 text-text-muted hover:bg-dark-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <AdminNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-light bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle admin navigation"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
            className="rounded-md p-2 text-text-secondary hover:bg-surface-muted lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <Link to="/admin" className="flex items-center gap-2 lg:hidden">
            <Car className="h-5 w-5 text-orange-600" aria-hidden="true" />
            <span className="font-bold tracking-tight text-dark-900">Car Decor Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
            <span className="hidden sm:inline">{session?.email}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-border-light bg-white px-4 py-3">
          <ThridhaSignature variant="admin" />
        </footer>
      </div>
    </div>
  );
}

export default AdminShell;