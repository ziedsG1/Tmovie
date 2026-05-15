/* Ported from https://github.com/cool-dev-guy/vidsrc.ts (decoder.ts) */

function b64decode(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("binary");
}

function Iry9MQXnLs(param: string): string {
  const key = "pWB9V)[*4I`nJpp?ozyB~dbr9yt!_n4u";
  let out = "";
  const hex = param.match(/.{1,2}/g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join("");
  for (let i = 0; i < hex.length; i++) {
    out += String.fromCharCode(hex.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  let shifted = "";
  for (let i = 0; i < out.length; i++) {
    shifted += String.fromCharCode(out.charCodeAt(i) - 3);
  }
  return b64decode(shifted);
}

function IGLImMhWrI(param: string): string {
  const rev = param.split("").reverse().join("");
  const rot = rev.replace(/[a-zA-Z]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < "n" ? 13 : -13))
  );
  const rev2 = rot.split("").reverse().join("");
  return b64decode(rev2);
}

function GTAxQyTyBx(param: string): string {
  const rev = param.split("").reverse().join("");
  let everyOther = "";
  for (let i = 0; i < rev.length; i += 2) everyOther += rev[i];
  return b64decode(everyOther);
}

function C66jPHx8qu(param: string): string {
  const rev = param.split("").reverse().join("");
  const key = "X9a(O;FMV2-7VO5x;Ao\x05:dN1NoFs?j,";
  const hex = rev.match(/.{1,2}/g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join("");
  let out = "";
  for (let i = 0; i < hex.length; i++) {
    out += String.fromCharCode(hex.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function MyL1IRSfHe(param: string): string {
  const rev = param.split("").reverse().join("");
  let shifted = "";
  for (let i = 0; i < rev.length; i++) {
    shifted += String.fromCharCode(rev.charCodeAt(i) - 1);
  }
  let out = "";
  for (let i = 0; i < shifted.length; i += 2) {
    out += String.fromCharCode(parseInt(shifted.substr(i, 2), 16));
  }
  return out;
}

function detdj7JHiK(param: string): string {
  const inner = param.slice(10, -16);
  const key = '3SAY~#%Y(V%>5d/Yg"$G[Lh1rK4a;7ok';
  const decoded = b64decode(inner);
  const expanded = key.repeat(Math.ceil(decoded.length / key.length)).substring(0, decoded.length);
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) ^ expanded.charCodeAt(i));
  }
  return out;
}

const SUB_MAP: Record<string, string> = {
  x: "a", y: "b", z: "c", a: "d", b: "e", c: "f", d: "g", e: "h", f: "i",
  g: "j", h: "k", i: "l", j: "m", k: "n", l: "o", m: "p", n: "q", o: "r",
  p: "s", q: "t", r: "u", s: "v", t: "w", u: "x", v: "y", w: "z",
  X: "A", Y: "B", Z: "C", A: "D", B: "E", C: "F", D: "G", E: "H", F: "I",
  G: "J", H: "K", I: "L", J: "M", K: "N", L: "O", M: "P", N: "Q", O: "R",
  P: "S", Q: "T", R: "U", S: "V", T: "W", U: "X", V: "Y", W: "Z",
};

function nZlUnj2VSo(param: string): string {
  return param.replace(/[xyzabcdefghijklmnopqrstuvwXYZABCDEFGHIJKLMNOPQRSTUVW]/g, (c) => SUB_MAP[c] ?? c);
}

function laM1dAi3vO(param: string): string {
  const rev = param.split("").reverse().join("");
  const b64 = rev.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = b64decode(b64);
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) - 5);
  }
  return out;
}

function GuxKGDsA2T(param: string): string {
  const rev = param.split("").reverse().join("");
  const b64 = rev.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = b64decode(b64);
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) - 7);
  }
  return out;
}

function LXVUMCoAHJ(param: string): string {
  const rev = param.split("").reverse().join("");
  const b64 = rev.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = b64decode(b64);
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) - 3);
  }
  return out;
}

function bMGyx71TzQLfdonN(param: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < param.length; i += 3) {
    chunks.push(param.slice(i, i + 3));
  }
  return chunks.reverse().join("");
}

export function decrypt(param: string, type: string): string | null {
  switch (type) {
    case "LXVUMCoAHJ":
      return LXVUMCoAHJ(param);
    case "GuxKGDsA2T":
      return GuxKGDsA2T(param);
    case "laM1dAi3vO":
      return laM1dAi3vO(param);
    case "nZlUnj2VSo":
      return nZlUnj2VSo(param);
    case "Iry9MQXnLs":
      return Iry9MQXnLs(param);
    case "IGLImMhWrI":
      return IGLImMhWrI(param);
    case "GTAxQyTyBx":
      return GTAxQyTyBx(param);
    case "C66jPHx8qu":
      return C66jPHx8qu(param);
    case "MyL1IRSfHe":
      return MyL1IRSfHe(param);
    case "detdj7JHiK":
      return detdj7JHiK(param);
    case "bMGyx71TzQLfdonN":
      return bMGyx71TzQLfdonN(param);
    default:
      return null;
  }
}
