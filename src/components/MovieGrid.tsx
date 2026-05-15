import { LazyMovieGrid } from "./LazyMovieGrid";
import type { ImdbTitle } from "@/lib/imdb";

interface MovieGridProps {
  title: string;
  items: ImdbTitle[];
  subtitle?: string;
  /** First paint card count (full list still available via Load more). */
  initialCount?: number;
}

export function MovieGrid({ title, items, subtitle, initialCount }: MovieGridProps) {
  return (
    <LazyMovieGrid
      title={title}
      items={items}
      subtitle={subtitle}
      initialCount={initialCount}
    />
  );
}
