import { MovieCard } from "./MovieCard";
import type { ImdbTitle } from "@/lib/imdb";

interface MovieRowProps {
  title: string;
  items: ImdbTitle[];
}

export function MovieRow({ title, items }: MovieRowProps) {
  if (!items.length) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 px-4 font-display text-2xl tracking-wide text-white sm:px-6">{title}</h2>
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:px-6">
        {items.map((item) => (
          <MovieCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
