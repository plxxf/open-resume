import type { Resume } from "lib/redux/types";

export interface TailorEdit {
  target: "summary" | "work" | "projects" | "education" | "custom";
  entry: number;
  bullet: number;
  before: string;
  after: string;
  why: string;
}
export interface TailorResult {
  edits: TailorEdit[];
  skills: string[];
  missing: { keyword: string; note: string }[];
  left: number;
}
export interface TailorUser {
  email: string;
  name: string;
  picture: string;
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const call = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError("network", "Could not reach airesume. Check your connection.");
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Static hosting without functions (e.g. local dev) returns HTML.
    throw new ApiError("not_configured", "AI tailoring is not available here.");
  }
  if (!res.ok) {
    throw new ApiError(
      data?.error?.code || "error",
      data?.error?.message || "Something went wrong. Please try again."
    );
  }
  return data as T;
};

export const getConfig = () =>
  call<{ googleClientId: string; freePerDay: number; aiReady: boolean }>("/api/config");
export const getMe = () =>
  call<{ user: TailorUser | null; left?: number; perDay?: number }>("/api/me");
export const signIn = (credential: string) =>
  call<{ user: TailorUser }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
export const signOut = () => call("/api/auth/logout", { method: "POST", body: "{}" });

/** The compact shape the server expects. Indexes match the editor's arrays. */
export const toCompact = (r: Resume) => ({
  summary: r.profile.summary,
  work: r.workExperiences.map((w) => ({
    title: w.jobTitle,
    company: w.company,
    date: w.date,
    bullets: w.descriptions,
  })),
  projects: r.projects.map((p) => ({ name: p.project, date: p.date, bullets: p.descriptions })),
  education: r.educations.map((e) => ({
    school: e.school,
    degree: e.degree,
    bullets: e.descriptions,
  })),
  custom: r.custom.descriptions,
  skills: r.skills.descriptions.filter((s) => s.trim()),
});

export const tailor = (jd: string, resume: Resume) =>
  call<TailorResult>("/api/tailor", {
    method: "POST",
    body: JSON.stringify({ jd, resume: toCompact(resume) }),
  });

/** Returns a new resume with the chosen edits applied. */
export const applyEdits = (
  resume: Resume,
  edits: TailorEdit[],
  skills: string[] | null
): Resume => {
  const next: Resume = structuredClone(resume);
  for (const e of edits) {
    if (e.target === "summary") {
      if (next.profile.summary.trim() === e.before.trim()) next.profile.summary = e.after;
      continue;
    }
    const lines =
      e.target === "custom"
        ? next.custom.descriptions
        : e.target === "work"
        ? next.workExperiences[e.entry]?.descriptions
        : e.target === "projects"
        ? next.projects[e.entry]?.descriptions
        : next.educations[e.entry]?.descriptions;
    // Only replace a line that still says what the AI saw.
    if (lines && lines[e.bullet] === e.before) lines[e.bullet] = e.after;
  }
  if (skills && skills.length) next.skills.descriptions = skills;
  return next;
};

export const JD_KEY = "airesume-jd";
export const JD_EVENT = "airesume:jd";
