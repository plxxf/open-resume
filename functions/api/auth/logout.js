import { json, error, sameOrigin, clearSessionCookie } from "../../../server/lib.js";

export const onRequestPost = ({ request }) => {
  if (!sameOrigin(request)) return error("forbidden", "Bad origin.", 403);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
};
