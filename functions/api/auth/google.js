import {
  json,
  error,
  sameOrigin,
  verifyGoogleIdToken,
  makeSessionCookie,
  missingConfig,
} from "../../../server/lib.js";

// Exchanges a Google sign-in credential for this site's own session cookie.
export const onRequestPost = async ({ request, env }) => {
  if (!sameOrigin(request)) return error("forbidden", "Bad origin.", 403);
  const missing = missingConfig(env, ["GOOGLE_CLIENT_ID", "SESSION_SECRET"]);
  if (missing.length) return error("not_configured", "Sign-in is not set up yet.", 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return error("bad_request", "Bad request.", 400);
  }
  let claims;
  try {
    claims = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID);
  } catch (e) {
    return error("bad_token", "Google sign-in could not be verified. Try again.", 401);
  }
  const user = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  };
  return json(
    { user: { email: user.email, name: user.name || "", picture: user.picture || "" } },
    200,
    { "set-cookie": await makeSessionCookie(env, user) }
  );
};
