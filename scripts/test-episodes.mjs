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

const series = ["tt1190634", "tt0903747", "tt0944947", "tt4574334"];

for (const id of series) {
  const seasons = await gql(
    `query($id:ID!){title(id:$id){episodes{displayableSeasons(first:20){edges{node{season text}}}}}}`,
    { id }
  );
  const sList = seasons.data?.title?.episodes?.displayableSeasons?.edges?.map((e) => e.node.season) || [];
  console.log("\n", id, "seasons:", sList.join(","));

  for (const s of sList.slice(0, 2)) {
    const eps = await gql(
      `query($id:ID!,$first:Int!,$season:String!){
        title(id:$id){episodes{episodes(first:$first,filter:{includeSeasons:[$season]}){edges{node{id titleText{text} series{episodeNumber{episodeNumber}}}}}}}
      }`,
      { id, first: 5, season: s }
    );
    const n = eps.data?.title?.episodes?.episodes?.edges?.length ?? 0;
    console.log("  season", s, "eps", n, eps.errors?.[0]?.message || "");
  }
}

// TVMaze by imdb id
for (const id of ["tt1190634", "tt0903747"]) {
  const r = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${id}`);
  const show = await r.json();
  if (show.id) {
    const eps = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
    const list = await eps.json();
    const s1 = list.filter((e) => e.season === 1);
    console.log("\nTVMaze", id, "total", list.length, "S1", s1.length, "sample", s1[0]?.name);
  }
}
