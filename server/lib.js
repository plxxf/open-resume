// Shared helpers for the Cloudflare Pages Functions in /functions.
// Secrets (OPENAI_API_KEY, SESSION_SECRET) live in the Cloudflare project
// settings, never in this repository or in the page.

const enc = new TextEncoder();
const SESSION_COOKIE = "ar_session";
const SESSION_DAYS = 30;

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

export const error = (code, message, status) =>
  json({ error: { code, message } }, status);

/** Rejects cross-site POSTs: the browser always sends Origin on POST. */
export const sameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
};

const b64url = (bytes) => {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const hmacKey = (secret) =>
  crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

export const makeSessionCookie = async (env, user) => {
  const payload = {
    sub: user.sub,
    email: user.email,
    name: user.name || "",
    picture: user.picture || "",
    exp: Date.now() + SESSION_DAYS * 864e5,
  };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(env.SESSION_SECRET),
    enc.encode(body)
  );
  const value = `${body}.${b64url(sig)}`;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
    SESSION_DAYS * 86400
  }`;
};

export const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Returns the signed-in user, or null. */
export const getUser = async (request, env) => {
  if (!env.SESSION_SECRET) return null;
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [body, sig] = match[1].split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env.SESSION_SECRET),
      fromB64url(sig),
      enc.encode(body)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

/** Verifies a Google Identity Services ID token (RS256 JWT). */
export const verifyGoogleIdToken = async (token, clientId) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("bad_token");
  const header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  if (header.alg !== "RS256" || !header.kid) throw new Error("bad_token");

  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  const { keys = [] } = await res.json();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("bad_token");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    fromB64url(parts[2]),
    enc.encode(`${parts[0]}.${parts[1]}`)
  );
  if (!ok) throw new Error("bad_token");
  const now = Math.floor(Date.now() / 1000);
  if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss))
    throw new Error("bad_token");
  if (payload.aud !== clientId) throw new Error("bad_token");
  if (!payload.exp || payload.exp < now) throw new Error("expired");
  if (!payload.sub || !payload.email || payload.email_verified === false)
    throw new Error("bad_token");
  return payload;
};

/* ---------- daily limits (Cloudflare KV) ---------- */

const today = () => new Date().toISOString().slice(0, 10); // UTC day

export const limits = (env) => ({
  perUser: Math.max(0, parseInt(env.FREE_PER_DAY || "3", 10) || 0),
  site: Math.max(0, parseInt(env.SITE_DAILY_CAP || "300", 10) || 0),
});

export const usage = async (env, sub) => {
  const day = today();
  const [mine, all] = await Promise.all([
    env.AIRESUME_KV.get(`use:${day}:${sub}`),
    env.AIRESUME_KV.get(`use:${day}:_all`),
  ]);
  return { mine: parseInt(mine || "0", 10), all: parseInt(all || "0", 10) };
};

export const addUsage = async (env, sub, used) => {
  const day = today();
  const opts = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([
    env.AIRESUME_KV.put(`use:${day}:${sub}`, String(used.mine + 1), opts),
    env.AIRESUME_KV.put(`use:${day}:_all`, String(used.all + 1), opts),
  ]);
};

export const missingConfig = (env, names) =>
  names.filter((n) => !env[n]);
