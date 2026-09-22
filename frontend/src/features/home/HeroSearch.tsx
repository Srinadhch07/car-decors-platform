import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-lg overflow-hidden rounded-lg border border-dark-600 bg-dark-800 shadow-elevated sm:max-w-xl lg:max-w-2xl"
      role="search"
      aria-label="Search products"
    >
      <label htmlFor="hero-search" className="sr-only">
        Search car accessories
      </label>
      <input
        id="hero-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search car accessories..."
        className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none sm:py-3.5"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-orange-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:py-3.5"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
