// Adapted from the airesume draft (github.com/plxxf/airesume, lib/input-security.ts).
// The editor imports PDF only, because the resume parser reads PDF text.

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const hasPdfSignature = (bytes: Uint8Array) =>
  bytes.length >= 5 && String.fromCharCode(...Array.from(bytes.slice(0, 5))) === "%PDF-";

/**
 * Checks a resume file before it is read. Returns an error message to show,
 * or null when the file looks like a real PDF. Nothing leaves the browser.
 */
export const validatePdfResume = async (file: File): Promise<string | null> => {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === ".docx" || extension === ".doc") {
    return "The editor imports PDF files only. Save your Word file as PDF first, or use the ATS checker on airesume.blog, which reads Word files.";
  }
  if (extension !== ".pdf") return "Choose a PDF file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_RESUME_BYTES) return "The resume must be 5 MB or smaller.";
  if (!["application/pdf", "application/octet-stream", ""].includes(file.type)) {
    return "The file type does not match its .pdf extension.";
  }
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!hasPdfSignature(signature)) return "This does not appear to be a valid PDF.";
  return null;
};
