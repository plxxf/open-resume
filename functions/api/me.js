import { json, getUser, limits, usage } from "../../server/lib.js";

export const onRequestGet = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ user: null });
  const { perUser } = limits(env);
  let left = perUser;
  if (env.AIRESUME_KV) left = Math.max(0, perUser - (await usage(env, user.sub)).mine);
  return json({
    user: { email: user.email, name: user.name, picture: user.picture },
    left,
    perDay: perUser,
  });
};
