const GQL = "https://api.graphql.imdb.com/";
const H = {
  "Content-Type": "application/json",
  "x-imdb-client-name": "IMDbWebApp",
  "x-imdb-user-language": "en-US",
};

async function q(query, variables = {}) {
  const r = await fetch(GQL, { method: "POST", headers: H, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

async function fetchMoviesPage(first, after) {
  const query = after
    ? `query($first:Int!,$after:String){advancedTitleSearch(first:$first,after:$after, constraints:{titleTypeConstraint:{anyTitleTypeIds:["movie"]}}, sort:{sortBy:POPULARITY,sortOrder:ASC}){pageInfo{hasNextPage endCursor} edges{node{title{id}}}}}`
    : `query($first:Int!){advancedTitleSearch(first:$first, constraints:{titleTypeConstraint:{anyTitleTypeIds:["movie"]}}, sort:{sortBy:POPULARITY,sortOrder:ASC}){pageInfo{hasNextPage endCursor} edges{node{title{id}}}}}`;
  return q(query, after ? { first, after } : { first });
}

for (const n of [100, 250, 500]) {
  try {
    const d = await fetchMoviesPage(n);
    console.log("first=", n, "got", d.advancedTitleSearch.edges.length);
  } catch (e) {
    console.log("first=", n, "ERR", e.message.slice(0, 60));
  }
}

let after;
let total = 0;
for (let i = 0; i < 5; i++) {
  const d = await fetchMoviesPage(50, after);
  total += d.advancedTitleSearch.edges.length;
  after = d.advancedTitleSearch.pageInfo.endCursor;
  console.log("page", i + 1, "total", total, "next", d.advancedTitleSearch.pageInfo.hasNextPage);
  if (!d.advancedTitleSearch.pageInfo.hasNextPage) break;
}
