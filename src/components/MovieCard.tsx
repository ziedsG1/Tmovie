import Image from "next/image";
import Link from "next/link";
import { displayTitle, displayYear, posterUrl, type ImdbTitle } from "@/lib/imdb";

interface MovieCardProps {
  item: ImdbTitle;
  badge?: string;
  layout?: "row" | "grid";
}

export function MovieCard({ item, badge, layout = "row" }: MovieCardProps) {
  const cardBadge =
    badge ??
    (item.titleTypeLabel === "TVMaze"
      ? "TVMaze"
      : item.titleTypeLabel === "Cinemeta" || item.titleTypeLabel === "TMDB"
        ? "Popular"
        : undefined);
  const poster = posterUrl(item.poster);
  const widthClass =
    layout === "grid"
      ? "relative w-full transition-transform hover:scale-[1.02]"
      : "group relative w-[140px] flex-shrink-0 transition-transform hover:scale-105 sm:w-[160px]";

  return (
    <Link href={`/title/${item.id}`} className={`group ${widthClass}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-card ring-1 ring-surface-border group-hover:ring-accent/50">
        {poster ? (
          <Image
            src={poster}
            alt={displayTitle(item)}
            fill
            sizes={layout === "grid" ? "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 160px" : "160px"}
            loading={layout === "grid" ? "lazy" : undefined}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-gray-500">
            {displayTitle(item)}
          </div>
        )}
        {cardBadge && (
          <span
            className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${
              cardBadge === "TVMaze" ? "bg-violet-600/90" : "bg-emerald-600/90"
            }`}
          >
            {cardBadge}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
          {displayTitle(item)}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-medium text-gray-200">{displayTitle(item)}</p>
      <p className="text-xs text-gray-500">
        {displayYear(item)}
        {item.rating > 0 && (
          <span className="ml-2 text-gold">★ {item.rating.toFixed(1)}</span>
        )}
      </p>
    </Link>
  );
}
