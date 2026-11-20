import { View } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFLink,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { useTemplate } from "components/Resume/ResumePDF/templates";
import type { ResumeProfile } from "lib/redux/types";

const CONTACT_GRAY = "#475569";

type ContactKey = "email" | "phone" | "location" | "url";

const getContactItems = (profile: ResumeProfile) =>
  (["email", "phone", "location", "url"] as ContactKey[])
    .map((key) => ({ key, value: String(profile[key] ?? "") }))
    .filter(({ value }) => Boolean(value));

const getContactHref = (key: ContactKey, value: string) => {
  switch (key) {
    case "email":
      return `mailto:${value}`;
    case "phone":
      return `tel:${value.replace(/[^\d+]/g, "")}`; // Keep only + and digits
    case "url":
      return value.startsWith("http") ? value : `https://${value}`;
    default:
      return "";
  }
};

const ContactItem = ({
  contactKey,
  value,
  isPDF,
}: {
  contactKey: ContactKey;
  value: string;
  isPDF: boolean;
}) => {
  const text = (
    <ResumePDFText themeColor={CONTACT_GRAY}>{value}</ResumePDFText>
  );
  const href = getContactHref(contactKey, value);
  if (!href) return text;
  return (
    <ResumePDFLink src={href} isPDF={isPDF}>
      {text}
    </ResumePDFLink>
  );
};

/**
 * Name, summary and (unless the template has a side panel) the contact line.
 * Contact details are plain text joined with "·", which ATS software reads
 * more reliably than icons.
 */
export const ResumePDFProfile = ({
  profile,
  isPDF,
}: {
  profile: ResumeProfile;
  themeColor?: string;
  isPDF: boolean;
}) => {
  const template = useTemplate();
  const { name, summary } = profile;
  const contactItems = getContactItems(profile);
  const center = template.nameAlign === "center";

  return (
    <ResumePDFSection
      style={{
        marginTop: 0,
        gap: spacing["1"],
        alignItems: center ? "center" : "flex-start",
      }}
    >
      <ResumePDFText
        bold={true}
        themeColor={template.nameColor}
        style={{ fontSize: template.nameSize }}
      >
        {name}
      </ResumePDFText>
      {!template.sidebar && contactItems.length > 0 && (
        <View
          style={{
            ...styles.flexRow,
            flexWrap: "wrap",
            justifyContent: center ? "center" : "flex-start",
            marginTop: spacing["0.5"],
          }}
        >
          {contactItems.map(({ key, value }, idx) => (
            <View key={key} style={{ ...styles.flexRow }}>
              {idx > 0 && (
                <ResumePDFText
                  themeColor={CONTACT_GRAY}
                  style={{ paddingLeft: "5pt", paddingRight: "5pt" }}
                >
                  ·
                </ResumePDFText>
              )}
              <ContactItem contactKey={key} value={value} isPDF={isPDF} />
            </View>
          ))}
        </View>
      )}
      {summary && (
        <ResumePDFText
          style={{
            marginTop: spacing["1"],
            textAlign: center ? "center" : "left",
            lineHeight: "1.3",
          }}
        >
          {summary}
        </ResumePDFText>
      )}
    </ResumePDFSection>
  );
};

/** Contact block for the Modern template's side panel. */
export const ResumePDFSidebarContact = ({
  profile,
  isPDF,
}: {
  profile: ResumeProfile;
  isPDF: boolean;
}) => {
  const contactItems = getContactItems(profile);
  if (contactItems.length === 0) return null;
  return (
    <ResumePDFSection heading="Contact" style={{ marginTop: 0 }}>
      {contactItems.map(({ key, value }) => (
        <ContactItem key={key} contactKey={key} value={value} isPDF={isPDF} />
      ))}
    </ResumePDFSection>
  );
};
