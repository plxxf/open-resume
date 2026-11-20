import {
  json,
  error,
  sameOrigin,
  getUser,
  limits,
  usage,
  addUsage,
  missingConfig,
} from "../../server/lib.js";

// Rewrites resume wording for one job description with the OpenAI API.
// Rules: only facts already in the resume, every change is returned as a
// suggestion the user accepts or rejects in the editor.

const MAX_JD = 12000;
const MAX_FIELD = 400;
const MAX_LINE = 600;
const MAX_ENTRIES = 12;
const MAX_LINES = 12;

const str = (v, max = MAX_FIELD) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lines = (v) =>
  Array.isArray(v) ? v.map((l) => str(l, MAX_LINE)).filter(Boolean).slice(0, MAX_LINES) : [];
// Bullets keep their positions (empty lines included) so edit indexes match the editor.
const bullets = (v) =>
  Array.isArray(v) ? v.slice(0, MAX_LINES).map((l) => str(l, MAX_LINE)) : [];
const list = (v, map) =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, MAX_ENTRIES).map(map) : [];

const cleanResume = (r = {}) => ({
  summary: str(r.summary, 1500),
  work: list(r.work, (w) => ({
    title: str(w.title),
    company: str(w.company),
    date: str(w.date, 60),
    bullets: bullets(w.bullets),
  })),
  projects: list(r.projects, (p) => ({
    name: str(p.name),
    date: str(p.date, 60),
    bullets: bullets(p.bullets),
  })),
  education: list(r.education, (e) => ({
    school: str(e.school),
    degree: str(e.degree),
    bullets: bullets(e.bullets),
  })),
  custom: bullets(r.custom),
  skills: lines(r.skills),
});

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["edits", "skills", "missing"],
  properties: {
    edits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["target", "entry", "bullet", "after", "why"],
        properties: {
          target: { type: "string", enum: ["summary", "work", "projects", "education", "custom"] },
          entry: { type: "integer" },
          bullet: { type: "integer" },
          after: { type: "string" },
          why: { type: "string" },
        },
      },
    },
    skills: { type: "array", items: { type: "string" } },
    missing: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["keyword", "note"],
        properties: { keyword: { type: "string" }, note: { type: "string" } },
      },
    },
  },
};

const SYSTEM = `You tailor resumes to a job description for students and new graduates.
Return suggested edits only. Hard rules:
- Use ONLY facts that are already in the resume. Never add a tool, skill, employer, title, degree, date, number, metric or achievement that the resume does not state.
- Do not change numbers. Keep every number exactly as written; do not add new ones.
- You may reword, reorder clauses, use the job description's terminology for things the candidate clearly did, start bullets with strong verbs, and tighten wording.
- Keep each bullet one line where possible (under about 30 words). Write in the resume's language. No first-person pronouns.
- Only suggest an edit when it is a real improvement for this job. Leave good lines alone.
Targets and indexes:
- "summary": rewrite the summary (entry 0, bullet 0). If the resume has no summary, write one only from facts in the resume.
- "work", "projects", "education": entry = index of the entry, bullet = index of the bullet in that entry.
- "custom": entry 0, bullet = index of the line.
"skills": the same skill lines in a better order for this job, with the items inside each line reordered so job-relevant ones come first. Do not add, drop or rename items. Return [] if the order is already good.
"missing": important keywords from the job description that the resume does not show. For each, a short note telling the candidate to add it only if it is true for them and where it could go. Never put these into edits.
"why": one short sentence explaining the change in terms of the job.`;

const numbersIn = (s) => (s.match(/\d+(?:[.,]\d+)*%?/g) || []).map((n) => n.replace(/,/g, ""));
const items = (line) =>
  line
    .split(/[,;:]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");

const beforeOf = (r, e) => {
  if (e.target === "summary") return r.summary;
  if (e.target === "custom") return r.custom[e.bullet];
  const entry = r[e.target][e.entry];
  return entry ? entry.bullets[e.bullet] : undefined;
};

export const onRequestPost = async ({ request, env }) => {
  if (!sameOrigin(request)) return error("forbidden", "Bad origin.", 403);
  const missingCfg = missingConfig(env, ["OPENAI_API_KEY", "SESSION_SECRET", "AIRESUME_KV"]);
  if (missingCfg.length) return error("not_configured", "AI tailoring is not set up yet.", 503);

  const user = await getUser(request, env);
  if (!user) return error("login_required", "Sign in with Google to use AI tailoring.", 401);

  const { perUser, site } = limits(env);
  const used = await usage(env, user.sub);
  if (used.mine >= perUser)
    return error("free_quota_used", `You have used today's ${perUser} free tailoring runs. Try again tomorrow.`, 429);
  if (used.all >= site)
    return error("busy", "AI tailoring is busy today. Please try again tomorrow.", 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return error("bad_request", "Bad request.", 400);
  }
  const jd = str(body.jd, MAX_JD);
  const resume = cleanResume(body.resume);
  if (jd.length < 80) return error("bad_request", "Paste the full job description first.", 400);
  const hasText = resume.summary || resume.work.length || resume.projects.length || resume.education.length;
  if (!hasText) return error("bad_request", "Add your resume content first.", 400);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `JOB DESCRIPTION:\n${jd}\n\nRESUME (JSON):\n${JSON.stringify(resume)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "tailor", strict: true, schema: SCHEMA },
      },
      user: user.sub,
    }),
  });
  if (!res.ok) {
    console.log("openai error", res.status, (await res.text()).slice(0, 500));
    return error("upstream_error", "The AI service is busy. Nothing was used; please try again.", 502);
  }
  let out;
  try {
    const data = await res.json();
    out = JSON.parse(data.choices[0].message.content);
  } catch {
    return error("upstream_error", "The AI reply could not be read. Nothing was used; please try again.", 502);
  }

  // Guard rails: drop anything that points nowhere, adds numbers, or balloons.
  const allText = JSON.stringify(resume);
  const lowerText = allText.toLowerCase();
  const known = new Set(numbersIn(allText));
  // Keywords the model itself says the resume lacks must not slip into edits.
  const absent = (out.missing || [])
    .map((m) => str(m && m.keyword, 80).toLowerCase())
    .filter((k) => k && !lowerText.includes(k));
  const seen = new Set();
  const edits = (out.edits || [])
    .map((e) => ({ ...e, after: str(e.after, MAX_LINE * 3), why: str(e.why, 300) }))
    .filter((e) => {
      const before = beforeOf(resume, e);
      if (!before && e.target !== "summary") return false;
      if (before === undefined || !e.after || e.after === before) return false;
      if (e.after.length > Math.max(400, (before || "").length * 2 + 120)) return false;
      if (numbersIn(e.after).some((n) => !known.has(n))) return false;
      const lowerAfter = e.after.toLowerCase();
      if (absent.some((k) => lowerAfter.includes(k))) return false;
      const key = `${e.target}:${e.entry}:${e.bullet}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((e) => ({ ...e, before: beforeOf(resume, e) || "" }));

  let skills = Array.isArray(out.skills) ? out.skills.map((s) => str(s, MAX_LINE)) : [];
  const sameSkills =
    skills.length === resume.skills.length &&
    skills.map(items).sort().join("#") === resume.skills.map(items).sort().join("#");
  if (!sameSkills || skills.join("\n") === resume.skills.join("\n")) skills = [];

  const missing = (out.missing || [])
    .slice(0, 15)
    .map((m) => ({ keyword: str(m.keyword, 80), note: str(m.note, 240) }))
    .filter((m) => m.keyword);

  await addUsage(env, user.sub, used);
  return json({ edits, skills, missing, left: Math.max(0, perUser - used.mine - 1) });
};
