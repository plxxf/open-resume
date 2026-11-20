import { Text, View, Link } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import {
  useTemplate,
  type TemplateConfig,
} from "components/Resume/ResumePDF/templates";

export const ResumePDFSection = ({
  themeColor,
  heading,
  style = {},
  children,
}: {
  // Kept for compatibility with the section components; colours now come
  // from the selected template.
  themeColor?: string;
  heading?: string;
  style?: Style;
  children: React.ReactNode;
}) => {
  const template = useTemplate();
  return (
    <View
      style={{
        ...styles.flexCol,
        gap: spacing["2"],
        marginTop: spacing["4"],
        ...style,
      }}
    >
      {heading && <ResumePDFHeading heading={heading} template={template} />}
      {children}
    </View>
  );
};

const ResumePDFHeading = ({
  heading,
  template,
}: {
  heading: string;
  template: TemplateConfig;
}) => {
  const text = (
    <Text
      style={{
        fontWeight: "bold",
        letterSpacing: "0.3pt",
        color: template.headingColor,
        textTransform: "uppercase",
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {heading}
    </Text>
  );
  if (template.headingStyle === "band") {
    return (
      <View
        style={{
          backgroundColor: template.bandColor,
          padding: "2pt 5pt",
        }}
      >
        {text}
      </View>
    );
  }
  return (
    <View
      style={{
        borderBottomWidth: template.headingStyle === "rule" ? "0.8pt" : "0.6pt",
        borderBottomStyle: "solid",
        borderBottomColor: template.ruleColor,
        paddingBottom: "2pt",
      }}
    >
      {text}
    </View>
  );
};

export const ResumePDFText = ({
  bold = false,
  themeColor,
  style = {},
  children,
}: {
  bold?: boolean;
  themeColor?: string;
  style?: Style;
  children: React.ReactNode;
}) => {
  return (
    <Text
      style={{
        color: themeColor || DEFAULT_FONT_COLOR,
        fontWeight: bold ? "bold" : "normal",
        ...style,
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {children}
    </Text>
  );
};

export const ResumePDFBulletList = ({
  items,
  showBulletPoints = true,
}: {
  items: string[];
  showBulletPoints?: boolean;
}) => {
  return (
    <>
      {items.map((item, idx) => (
        <View style={{ ...styles.flexRow }} key={idx}>
          {showBulletPoints && (
            <ResumePDFText
              style={{
                paddingLeft: spacing["2"],
                paddingRight: spacing["2"],
                lineHeight: 1.3,
              }}
              bold={true}
            >
              {"•"}
            </ResumePDFText>
          )}
          {/* A breaking change was introduced causing text layout to be wider than node's width
              https://github.com/diegomura/react-pdf/issues/2182. flexGrow & flexBasis fixes it */}
          <ResumePDFText
            style={{ lineHeight: 1.3, flexGrow: 1, flexBasis: 0 }}
          >
            {item}
          </ResumePDFText>
        </View>
      ))}
    </>
  );
};

export const ResumePDFLink = ({
  src,
  isPDF,
  children,
}: {
  src: string;
  isPDF: boolean;
  children: React.ReactNode;
}) => {
  if (isPDF) {
    return (
      <Link src={src} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={src}
      style={{ textDecoration: "none" }}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

export const ResumeFeaturedSkill = ({
  skill,
  rating,
  themeColor,
  style = {},
}: {
  skill: string;
  rating: number;
  themeColor: string;
  style?: Style;
}) => {
  const numCircles = 5;

  return (
    <View style={{ ...styles.flexRow, alignItems: "center", ...style }}>
      <ResumePDFText style={{ marginRight: spacing[0.5] }}>
        {skill}
      </ResumePDFText>
      {[...Array(numCircles)].map((_, idx) => (
        <View
          key={idx}
          style={{
            height: "9pt",
            width: "9pt",
            marginLeft: "2.25pt",
            backgroundColor: rating >= idx ? themeColor : "#d9d9d9",
            borderRadius: "100%",
          }}
        />
      ))}
    </View>
  );
};
