import { json, limits } from "../../server/lib.js";

// Public settings the page needs. No secrets here.
export const onRequestGet = ({ env }) =>
  json({
    googleClientId: env.GOOGLE_CLIENT_ID || "",
    freePerDay: limits(env).perUser,
    aiReady: Boolean(
      env.OPENAI_API_KEY && env.GOOGLE_CLIENT_ID && env.SESSION_SECRET && env.AIRESUME_KV
    ),
  });
