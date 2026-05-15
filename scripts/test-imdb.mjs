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

// other charts?
const queries = [
  `topRatedEnglishMovies: topRatedEnglishMovies(first: 5) { edges { node { id titleText { text } } } }`,
  `popularMovies: popularMovies(first: 5) { edges { node { id titleText { text } } } }`,
  `mostPopularMovies: mostPopularMovies(first: 5) { edges { node { id titleText { text } } } }`,
];

for (const q of queries) {
  const j = await gql(`query { ${q} }`);
  console.log(q.split(":")[0], j.errors?.[0]?.message || "ok", j.data ? Object.keys(j.data) : "");
}
