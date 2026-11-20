import type {
  Resume,
  ResumeEducation,
  ResumeProject,
  ResumeWorkExperience,
} from "lib/redux/types";
import type { ShowForm } from "lib/redux/settingsSlice";

const filled = (value: unknown) =>
  typeof value === "string" && value.trim() !== "";
const anyLine = (lines: string[] | undefined) => (lines ?? []).some(filled);

export const hasWork = (w: ResumeWorkExperience) =>
  filled(w.company) || filled(w.jobTitle) || filled(w.date) || anyLine(w.descriptions);
export const hasEducation = (e: ResumeEducation) =>
  filled(e.school) ||
  filled(e.degree) ||
  filled(e.date) ||
  filled(e.gpa) ||
  anyLine(e.descriptions);
export const hasProject = (p: ResumeProject) =>
  filled(p.project) || filled(p.date) || anyLine(p.descriptions);

/**
 * Drops empty entries so the PDF never shows a heading with nothing under it.
 * The form keeps its blank entries; only what is printed is filtered.
 */
export const pruneEmpty = (resume: Resume): Resume => ({
  ...resume,
  workExperiences: resume.workExperiences.filter(hasWork),
  educations: resume.educations.filter(hasEducation),
  projects: resume.projects.filter(hasProject),
  skills: {
    featuredSkills: resume.skills.featuredSkills.filter((s) => filled(s.skill)),
    descriptions: resume.skills.descriptions.filter(filled),
  },
  custom: { descriptions: resume.custom.descriptions.filter(filled) },
});

/** True when a (pruned) section has anything to print. */
export const sectionHasContent = (resume: Resume, form: ShowForm) => {
  switch (form) {
    case "workExperiences":
      return resume.workExperiences.length > 0;
    case "educations":
      return resume.educations.length > 0;
    case "projects":
      return resume.projects.length > 0;
    case "skills":
      return (
        resume.skills.featuredSkills.length > 0 ||
        resume.skills.descriptions.length > 0
      );
    case "custom":
      return resume.custom.descriptions.length > 0;
  }
};
