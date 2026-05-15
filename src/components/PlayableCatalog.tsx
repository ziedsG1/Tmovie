"use client";



import { useCallback, useEffect, useState } from "react";

import { MovieCard } from "./MovieCard";

import type { ImdbTitle } from "@/lib/imdb";



interface PlayableCatalogProps {

  pool: ImdbTitle[];

  title: string;

  emptyMessage?: string;

}



function itemKey(t: ImdbTitle) {

  return t.type === "tv" ? `${t.id}:s1:e1` : t.id;

}



export function PlayableCatalog({ pool, title, emptyMessage }: PlayableCatalogProps) {

  const [playable, setPlayable] = useState<ImdbTitle[]>([]);

  const [checking, setChecking] = useState(true);

  const [checked, setChecked] = useState(0);



  const verifyPool = useCallback(async () => {

    setChecking(true);

    setPlayable([]);

    setChecked(0);



    const batchSize = 12;

    const found: ImdbTitle[] = [];

    const map: Record<string, boolean> = {};



    for (let i = 0; i < pool.length; i += batchSize) {

      const chunk = pool.slice(i, i + batchSize);

      const items = chunk.map((t) =>

        t.type === "tv"

          ? { imdbId: t.id, type: "series" as const, season: 1, episode: 1 }

          : { imdbId: t.id, type: "movie" as const }

      );



      try {

        const res = await fetch("/api/stream/check", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ items }),

        });

        const data = await res.json();

        Object.assign(map, data.results || {});

      } catch {

        /* skip batch */

      }



      for (const t of chunk) {

        if (map[itemKey(t)]) found.push(t);

      }



      setChecked(Math.min(i + batchSize, pool.length));

      setPlayable([...found]);

    }



    setChecking(false);

  }, [pool]);



  useEffect(() => {

    verifyPool();

  }, [verifyPool]);



  return (

    <section className="mb-10">

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-4 sm:px-6">

        <h2 className="font-display text-2xl tracking-wide text-white">{title}</h2>

        <p className="text-xs text-gray-500">

          {checking

            ? `Checking streams… ${checked}/${pool.length}`

            : `${playable.length} with at least one source`}

        </p>

      </div>



      {checking && playable.length === 0 && (

        <div className="flex justify-center py-12">

          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />

        </div>

      )}



      {!checking && playable.length === 0 && (

        <p className="px-4 text-sm text-gray-500 sm:px-6">

          {emptyMessage || "No stream sources found in this chart."}

        </p>

      )}



      {playable.length > 0 && (

        <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:px-6">

          {playable.map((item) => (

            <MovieCard key={item.id} item={item} />

          ))}

        </div>

      )}

    </section>

  );

}


