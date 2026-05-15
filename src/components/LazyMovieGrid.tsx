"use client";

import { useCallback, useMemo, useState } from "react";
import { MovieCard } from "./MovieCard";
import type { ImdbTitle } from "@/lib/imdb";

const PAGE_SIZE = 36;

interface LazyMovieGridProps {
  title: string;
  items: ImdbTitle[];
  subtitle?: string;
  initialCount?: number;
}

export function LazyMovieGrid({
  title,
  items,
  subtitle,
  initialCount = PAGE_SIZE,
}: LazyMovieGridProps) {
  const [visible, setVisible] = useState(() => Math.min(initialCount, items.length));
  const slice = useMemo(() => items.slice(0, visible), [items, visible]);
  const hasMore = visible < items.length;

  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + PAGE_SIZE, items.length));
  }, [items.length]);

  if (!items.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 px-4 sm:px-6">
        <h2 className="font-display text-2xl tracking-wide text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        {visible < items.length ? (
          <p className="mt-1 text-xs text-gray-600">
            Showing {visible.toLocaleString()} of {items.length.toLocaleString()}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:px-6">
        {slice.map((item) => (
          <div key={item.id} className="cv-auto">
            <MovieCard item={item} layout="grid" />
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center px-4">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-lg border border-surface-border bg-surface-raised px-6 py-2.5 text-sm font-medium text-gray-200 transition hover:border-accent hover:text-white"
          >
            Load more ({Math.min(PAGE_SIZE, items.length - visible).toLocaleString()} of{" "}
            {(items.length - visible).toLocaleString()} remaining)
          </button>
        </div>
      )}
    </section>
  );
}
