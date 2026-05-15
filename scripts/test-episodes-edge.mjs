async function gql(query, variables = {}) {
  const res = await fetch("https://api.graphql.imdb.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-imdb-client-name": "IMDbWebApp",
      "x-imdb-user-language": "en-US",
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// series with weird seasons?
const id = process.argv[2] || "tt4574334"; // stranger things
const season = process.argv[3] || "1";

// all episodes no filter
const all = await gql(
  `query($id:ID!,$first:Int!){
    title(id:$id){
      episodes{
        episodes(first:$first){
          pageInfo{hasNextPage}
          edges{node{id titleText{text} series{episodeNumber{episodeNumber} displayableEpisodeNumber{displayableSeason{season}}}}}
        }
      }
    }
  }`,
  { id, first: 100 }
);
const edges = all.data?.title?.episodes?.episodes?.edges || [];
const bySeason = {};
for (const e of edges) {
  const s = e.node.series?.displayableEpisodeNumber?.displayableSeason?.season || "?";
  bySeason[s] = (bySeason[s] || 0) + 1;
}
console.log(id, "by season counts", bySeason, "err", all.errors?.[0]?.message);

// TVMaze full
const r = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${id}`);
const show = await r.json();
const eps = await (await fetch(`https://api.tvmaze.com/shows/${show.id}/episodebynumber?season=${season}&number=1`)).json();
console.log("tvmaze ep1", eps.name || eps.message);

const allEps = await (await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`)).json();
console.log("tvmaze season", season, "count", allEps.filter((e) => e.season == season).length);
