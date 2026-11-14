// Share link state: JSON -> deflate -> base64url, stored in the URL #hash.
// The hash never reaches the server, so nothing about the user is stored by us.
// Works in browsers and Node 18+ (CompressionStream, btoa/atob).

const PREFIX = "v1.";

function bytesToBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeState(state) {
  const json = new TextEncoder().encode(JSON.stringify(state));
  const packed = await pipe(json, new CompressionStream("deflate-raw"));
  return PREFIX + bytesToBase64Url(packed);
}

export async function decodeState(token) {
  if (typeof token !== "string" || !token.startsWith(PREFIX)) throw new Error("Not a Bridge Sim link");
  const packed = base64UrlToBytes(token.slice(PREFIX.length));
  const json = await pipe(packed, new DecompressionStream("deflate-raw"));
  return JSON.parse(new TextDecoder().decode(json));
}
