# Tmovies

Browse **IMDb** movies and TV shows and stream **HLS (M3U8)** via [PlayIMDb](https://playimdb.com/) sources.

All metadata (posters, ratings, plots, seasons, episodes) is fetched **directly from IMDb** — no TMDB API key required.

## Features

- IMDb Most Popular charts for movies and TV
- Search powered by IMDb
- Title pages at `/title/tt1234567` with IMDb ratings and genres
- TV seasons and episodes from IMDb
- In-browser HLS player with PlayIMDb stream backend

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How it works

| Data | Source |
|------|--------|
| Lists, search, details, seasons | [IMDb GraphQL API](https://api.graphql.imdb.com/) |
| Video streams | PlayIMDb / `streamdata.vaplayer.ru` (proxied as M3U8) |

## Legal

For personal, non-commercial use. Streams are third-party; ensure you have rights to view content in your region.
