import Image from "next/image";
import Link from "next/link";
import { backdropUrl, displayTitle, displayYear, type ImdbTitle } from "@/lib/imdb";

interface HeroProps {
  item: ImdbTitle;
}

export function Hero({ item }: HeroProps) {
  const bg = backdropUrl(item.backdrop || item.poster);

  return (
    <section className="relative mb-12 h-[55vh] min-h-[380px] max-h-[600px] w-full overflow-hidden">
      {bg && <Image src={bg} alt="" fill priority className="object-cover" sizes="100vw" />}
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/30" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">
          IMDb Most Popular · {item.type === "tv" ? "TV" : "Movie"}
        </p>
        <h1 className="font-display text-5xl leading-none text-white sm:text-7xl">
          {displayTitle(item)}
        </h1>
        <p className="mt-2 text-lg text-gray-400">{displayYear(item)}</p>
        <p className="mt-4 max-w-xl line-clamp-3 text-sm text-gray-300 sm:text-base">{item.plot}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/title/${item.id}`}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            ▶ Watch Now
          </Link>
          <a
            href={`https://www.imdb.com/title/${item.id}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-surface-border bg-surface-card/80 px-6 py-2.5 text-sm font-medium text-gray-300 transition hover:text-white"
          >
            IMDb ↗
          </a>
        </div>
      </div>
    </section>
  );
}
