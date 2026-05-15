"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (/^tt\d+$/i.test(q)) {
      router.push(`/watch/${q.toLowerCase()}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-display text-3xl tracking-wide text-accent">
          T<span className="text-white">movies</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-gray-400 sm:flex">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/movies" className="transition hover:text-white">
            Movies
          </Link>
          <Link href="/tv" className="transition hover:text-white">
            TV Shows
          </Link>
        </nav>

        <form onSubmit={onSearch} className="ml-auto flex max-w-md flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or IMDb ID (tt1234567)…"
            className="w-full rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-accent focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
}
