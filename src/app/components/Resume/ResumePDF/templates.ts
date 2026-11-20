import { createContext, useContext } from "react";

/**
 * The three airesume layouts. They match the Standard / Classic / Modern
 * templates on airesume.blog, so a resume looks the same in both places.
 *
 * pdfFont uses react-pdf's built-in standard fonts (no font files needed);
 * cssFont is what the HTML preview uses for the same look.
 */
export const TEMPLATE_IDS = ["standard", "classic", "modern"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  note: string;
  pdfFont: string;
  cssFont: string;
  nameColor: string;
  nameSize: string;
  nameAlign: "left" | "center";
  headingColor: string;
  headingStyle: "band" | "rule" | "accent";
  bandColor: string;
  ruleColor: string;
  sidebar: boolean;
  panelColor: string;
}

const SANS = "Helvetica, Arial, sans-serif";
const SERIF = '"Times New Roman", Times, serif';
const INK = "#0f172a";
const BLUE = "#2563eb";

export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  standard: {
    id: "standard",
    name: "Standard",
    note: "Clear section bands",
    pdfFont: "Helvetica",
    cssFont: SANS,
    nameColor: INK,
    nameSize: "22pt",
    nameAlign: "left",
    headingColor: INK,
    headingStyle: "band",
    bandColor: "#eef2f7",
    ruleColor: INK,
    sidebar: false,
    panelColor: "",
  },
  classic: {
    id: "classic",
    name: "Classic",
    note: "Academic serif layout",
    pdfFont: "Times-Roman",
    cssFont: SERIF,
    nameColor: INK,
    nameSize: "20pt",
    nameAlign: "center",
    headingColor: INK,
    headingStyle: "rule",
    bandColor: "",
    ruleColor: INK,
    sidebar: false,
    panelColor: "",
  },
  modern: {
    id: "modern",
    name: "Modern",
    note: "Structured side panel",
    pdfFont: "Helvetica",
    cssFont: SANS,
    nameColor: BLUE,
    nameSize: "24pt",
    nameAlign: "left",
    headingColor: BLUE,
    headingStyle: "accent",
    bandColor: "",
    ruleColor: "#cbd5e1",
    sidebar: true,
    panelColor: "#eff4ff",
  },
};

export const getTemplate = (id?: string): TemplateConfig =>
  TEMPLATES[id as TemplateId] ?? TEMPLATES.standard;

export interface TemplateContextValue extends TemplateConfig {
  // Absolute line height ("14.3pt" for 11pt text). react-pdf v4 spaces
  // unitless line heights much wider than browsers do, so we pass points.
  lineHeight: string;
}

export const getLineHeight = (fontSize: string | number) =>
  `${Math.round((Number(fontSize) || 11) * 1.3 * 10) / 10}pt`;

export const TemplateContext = createContext<TemplateContextValue>({
  ...TEMPLATES.standard,
  lineHeight: getLineHeight(11),
});

export const useTemplate = () => useContext(TemplateContext);
