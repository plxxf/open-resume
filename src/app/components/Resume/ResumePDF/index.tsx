import type { JSX } from "react";
import { Page, View, Document } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFProfile,
  ResumePDFSidebarContact,
} from "components/Resume/ResumePDF/ResumePDFProfile";
import {
  TemplateContext,
  getTemplate,
} from "components/Resume/ResumePDF/templates";
import { ResumePDFWorkExperience } from "components/Resume/ResumePDF/ResumePDFWorkExperience";
import { ResumePDFEducation } from "components/Resume/ResumePDF/ResumePDFEducation";
import { ResumePDFProject } from "components/Resume/ResumePDF/ResumePDFProject";
import { ResumePDFSkills } from "components/Resume/ResumePDF/ResumePDFSkills";
import { ResumePDFCustom } from "components/Resume/ResumePDF/ResumePDFCustom";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import type { Settings, ShowForm } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { SuppressResumePDFErrorMessage } from "components/Resume/ResumePDF/common/SuppressResumePDFErrorMessage";

/**
 * Note: ResumePDF is supposed to be rendered inside PDFViewer. However,
 * PDFViewer is rendered too slow and has noticeable delay as you enter
 * the resume form, so we render it without PDFViewer to make it render
 * instantly. There are 2 drawbacks with this approach:
 * 1. Not everything works out of box if not rendered inside PDFViewer,
 *    e.g. svg doesn't work, so it takes in a isPDF flag that maps react
 *    pdf element to the correct dom element.
 * 2. It throws a lot of errors in console log, e.g. "<VIEW /> is using incorrect
 *    casing. Use PascalCase for React components, or lowercase for HTML elements."
 *    in development, causing a lot of noises. We can possibly workaround this by
 *    mapping every react pdf element to a dom element, but for now, we simply
 *    suppress these messages in <SuppressResumePDFErrorMessage />.
 *    https://github.com/diegomura/react-pdf/issues/239#issuecomment-487255027
 */
export const ResumePDF = ({
  resume,
  settings,
  isPDF = false,
}: {
  resume: Resume;
  settings: Settings;
  isPDF?: boolean;
}) => {
  const { profile, workExperiences, educations, projects, skills, custom } =
    resume;
  const { name } = profile;
  const {
    fontSize,
    documentSize,
    formToHeading,
    formToShow,
    formsOrder,
    showBulletPoints,
  } = settings;
  const template = getTemplate(settings.template);
  // The PDF uses react-pdf's built-in fonts; the HTML preview uses the
  // matching browser fonts.
  const fontFamily = isPDF ? template.pdfFont : template.cssFont;
  // Accent for the featured-skill dots; headings and name colours come from
  // the template.
  const themeColor = template.headingColor || DEFAULT_FONT_COLOR;

  const showFormsOrder = formsOrder.filter((form) => formToShow[form]);
  // Modern puts skills in the side panel, so the main column skips them.
  const mainFormsOrder = template.sidebar
    ? showFormsOrder.filter((form) => form !== "skills")
    : showFormsOrder;
  const SIDEBAR_WIDTH = "32.7%"; // 200pt of a 612pt Letter page

  const formTypeToComponent: { [type in ShowForm]: () => JSX.Element } = {
    workExperiences: () => (
      <ResumePDFWorkExperience
        heading={formToHeading["workExperiences"]}
        workExperiences={workExperiences}
        themeColor={themeColor}
      />
    ),
    educations: () => (
      <ResumePDFEducation
        heading={formToHeading["educations"]}
        educations={educations}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["educations"]}
      />
    ),
    projects: () => (
      <ResumePDFProject
        heading={formToHeading["projects"]}
        projects={projects}
        themeColor={themeColor}
      />
    ),
    skills: () => (
      <ResumePDFSkills
        heading={formToHeading["skills"]}
        skills={skills}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["skills"]}
      />
    ),
    custom: () => (
      <ResumePDFCustom
        heading={formToHeading["custom"]}
        custom={custom}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["custom"]}
      />
    ),
  };

  const mainColumn = (
    <>
      <ResumePDFProfile profile={profile} isPDF={isPDF} />
      {mainFormsOrder.map((form) => {
        const Component = formTypeToComponent[form];
        return <Component key={form} />;
      })}
    </>
  );

  return (
    <>
      <Document title={`${name} Resume`} author={name} producer={"airesume"}>
        <TemplateContext.Provider value={template}>
          <Page
            size={documentSize === "A4" ? "A4" : "LETTER"}
            style={{
              ...styles.flexCol,
              position: "relative",
              color: DEFAULT_FONT_COLOR,
              fontFamily,
              fontSize: fontSize + "pt",
            }}
          >
            {template.sidebar ? (
              <>
                {/* Side panel background, repeated on every PDF page */}
                <View
                  {...(isPDF ? { fixed: true } : {})}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: SIDEBAR_WIDTH,
                    backgroundColor: template.panelColor,
                  }}
                />
                <View style={{ ...styles.flexRow }}>
                  <View
                    style={{
                      ...styles.flexCol,
                      width: SIDEBAR_WIDTH,
                      padding: "40pt 16pt 36pt 28pt",
                    }}
                  >
                    <ResumePDFSidebarContact profile={profile} isPDF={isPDF} />
                    {formToShow.skills && formTypeToComponent.skills()}
                  </View>
                  <View
                    style={{
                      ...styles.flexCol,
                      flexGrow: 1,
                      flexBasis: 0,
                      padding: "36pt 40pt 36pt 22pt",
                    }}
                  >
                    {mainColumn}
                  </View>
                </View>
              </>
            ) : (
              <View
                style={{
                  ...styles.flexCol,
                  padding: "36pt 50pt",
                }}
              >
                {mainColumn}
              </View>
            )}
          </Page>
        </TemplateContext.Provider>
      </Document>
      <SuppressResumePDFErrorMessage />
    </>
  );
};
