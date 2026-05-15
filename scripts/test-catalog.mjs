const GQL = "https://api.graphql.imdb.com/";
const H = { "Content-Type": "application/json", "x-imdb-client-name": "IMDbWebApp", "x-imdb-user-language": "en-US" };

async function gql(query, variables = {}) {
  const r = await fetch(GQL, { method: "POST", headers: H, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

const LIST = `id titleText{text} titleType{id} primaryImage{url} ratingsSummary{aggregateRating voteCount} releaseYear{year} plot{plotText{plainText}} runtime{seconds}`;

const d = await gql(
  `query($first:Int!,$types:[String!]!,$sortBy:AdvancedTitleSearchSortBy!,$sortOrder:SortOrder!){
    advancedTitleSearch(first:$first,constraints:{titleTypeConstraint:{anyTitleTypeIds:$types}},sort:{sortBy:$sortBy,sortOrder:$sortOrder}){
      edges{node{title{${LIST}}}}
    }
  }`,
  { first: 50, types: ["movie"], sortBy: "POPULARITY", sortOrder: "DESC" }
);
console.log("advanced OK", d.advancedTitleSearch.edges.length);

// simulate buildMoviesCatalog parallel
const [meter, popular] = await Promise.all([
  gql(`query($n:Int!){topMeterTitles(first:$n){edges{node{id}}}}`, { n: 250 }),
  gql(`query($l:Int!){popularTitles(limit:$l){titles{id}}}`, { l: 100 }),
]);
console.log("meter", meter.topMeterTitles.edges.length, "popular", popular.popularTitles.titles.length);
