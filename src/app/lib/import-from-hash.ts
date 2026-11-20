/**
 * Hand-off from the airesume.blog checker to this editor.
 *
 * The checker opens /resume-builder#import=<base64url JSON>. The resume
 * travels in the URL fragment, which browsers never send to a server, and is
 * read here, checked and length-capped before it touches the store.
 */
import type {
  Resume,
  ResumeEducation,
  ResumeProject,
  ResumeWorkExperience,
} from "lib/redux/types";
import { initialResumeState } from "lib/redux/resumeSlice";
import { TEMPLATE_IDS } from "components/Resume/ResumePDF/templates";

const PREFIX = "#import=";
const MAX_HASH = 200_000;
const MAX_FIELD = 300;
const MAX_LINE = 600;
const MAX_ENTRIES = 20;
const MAX_LINES = 30;

export interface ImportedResume {
  resume: Resume;
  template?: string;
  documentSize?: "Letter" | "A4";
  customHeading?: string;
  jd?: string;
}

const str = (value: unknown, max = MAX_FIELD) =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";

const lines = (value: unknown) =>
  Array.isArray(value)
    ? value.map((line) => str(line, MAX_LINE)).filter(Boolean).slice(0, MAX_LINES)
    : [];

const list = <T>(value: unknown, map: (item: any) => T) =>
  Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === "object")
        .slice(0, MAX_ENTRIES)
        .map(map)
    : [];

const decodeBase64Url = (input: string) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Returns null when there is no import in the URL or it can't be read. */
export const readImportFromHash = (hash: string): ImportedResume | null => {
  if (!hash.startsWith(PREFIX) || hash.length > MAX_HASH) return null;
  let data: any;
  try {
    data = JSON.parse(decodeBase64Url(hash.slice(PREFIX.length)));
  } catch {
    return null;
  }
  if (!data || data.v !== 1 || typeof data.resume !== "object") return null;
  const r = data.resume ?? {};
  const p = r.profile ?? {};

  const resume: Resume = {
    profile: {
      name: str(p.name),
      headline: str(p.headline),
      summary: str(p.summary, 2000),
      email: str(p.email),
      phone: str(p.phone),
      url: str(p.url),
      location: str(p.location),
    },
    workExperiences: list<ResumeWorkExperience>(r.workExperiences, (w) => ({
      company: str(w.company),
      jobTitle: str(w.jobTitle),
      date: str(w.date),
      descriptions: lines(w.descriptions),
    })),
    educations: list<ResumeEducation>(r.educations, (e) => ({
      school: str(e.school),
      degree: str(e.degree),
      date: str(e.date),
      gpa: str(e.gpa),
      descriptions: lines(e.descriptions),
    })),
    projects: list<ResumeProject>(r.projects, (pr) => ({
      project: str(pr.project),
      date: str(pr.date),
      descriptions: lines(pr.descriptions),
    })),
    skills: {
      featuredSkills: initialResumeState.skills.featuredSkills,
      descriptions: lines(r.skills?.descriptions),
    },
    custom: { descriptions: lines(r.custom?.descriptions) },
  };

  // The forms expect at least one (possibly blank) entry per section.
  if (!resume.workExperiences.length)
    resume.workExperiences = initialResumeState.workExperiences;
  if (!resume.educations.length) resume.educations = initialResumeState.educations;
  if (!resume.projects.length) resume.projects = initialResumeState.projects;

  const s = data.settings ?? {};
  const template = (TEMPLATE_IDS as readonly string[]).includes(s.template)
    ? s.template
    : undefined;
  const documentSize =
    s.documentSize === "A4" || s.documentSize === "Letter"
      ? s.documentSize
      : undefined;

  return {
    resume,
    template,
    documentSize,
    customHeading: str(r.custom?.heading, 60) || undefined,
    jd: str(data.jd, 12000) || undefined,
  };
};

/** Removes #import=… from the address bar without reloading the page. */
export const clearImportHash = () => {
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", pathname + search);
  } catch {
    // Ignore
  }
};
