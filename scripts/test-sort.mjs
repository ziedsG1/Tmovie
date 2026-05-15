const GQL = "https://api.graphql.imdb.com/";
const H = { "Content-Type": "application/json", "x-imdb-client-name": "IMDbWebApp" };

async function q(query, variables) {
  const r = await fetch(GQL, { method: "POST", headers: H, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

const inline = `query {
  advancedTitleSearch(first: 3, constraints: { titleTypeConstraint: { anyTitleTypeIds: ["movie"] } }, sort: { sortBy: USER_RATING, sortOrder: DESC }) {
    edges { node { title { id } } }
  }
}`;

const typed1 = `query($f: Int!, $o: SortOrder!) {
  advancedTitleSearch(first: $f, constraints: { titleTypeConstraint: { anyTitleTypeIds: ["movie"] } }, sort: { sortBy: USER_RATING, sortOrder: $o }) {
    edges { node { title { id } } }
  }
}`;

for (const [name, query, vars] of [
  ["inline", inline, undefined],
  ["SortOrder var", typed1, { f: 3, o: "DESC" }],
]) {
  try {
    const d = await q(query, vars);
    console.log("OK", name, d.advancedTitleSearch.edges.length);
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
}
