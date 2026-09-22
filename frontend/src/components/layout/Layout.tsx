import type { ReactNode } from "react";
import { ShopSettingsProvider } from "../../context/ShopSettingsProvider";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <ShopSettingsProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ShopSettingsProvider>
  );
}
