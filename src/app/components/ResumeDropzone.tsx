"use client";
import { useState } from "react";
import {
  ArrowUpTrayIcon,
  LockClosedIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import {
  getHasUsedAppBefore,
  saveStateToLocalStorage,
} from "lib/redux/local-storage";
import { type ShowForm, initialSettings } from "lib/redux/settingsSlice";
import { useRouter } from "next/navigation";
import { cx } from "lib/cx";
import { deepClone } from "lib/deep-clone";
import { validatePdfResume } from "lib/input-security";

const defaultFileState = {
  name: "",
  size: 0,
  fileUrl: "",
};

export const ResumeDropzone = ({
  onFileUrlChange,
  className,
  playgroundView = false,
}: {
  onFileUrlChange: (fileUrl: string) => void;
  className?: string;
  playgroundView?: boolean;
}) => {
  const [file, setFile] = useState(defaultFileState);
  const [isHoveredOnDropzone, setIsHoveredOnDropzone] = useState(false);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const hasFile = Boolean(file.name);

  const setNewFile = (newFile: File) => {
    if (file.fileUrl) {
      URL.revokeObjectURL(file.fileUrl);
    }

    const { name, size } = newFile;
    const fileUrl = URL.createObjectURL(newFile);
    setFile({ name, size, fileUrl });
    onFileUrlChange(fileUrl);
  };

  // Check type, size and the %PDF- signature before reading anything.
  const acceptFile = async (newFile?: File) => {
    if (!newFile) return;
    const message = await validatePdfResume(newFile);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setNewFile(newFile);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHoveredOnDropzone(false);
    void acceptFile(event.dataTransfer.files[0]);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void acceptFile(event.target.files?.[0]);
    // Allow choosing the same file again after removing it.
    event.target.value = "";
  };

  const onRemove = () => {
    if (file.fileUrl) URL.revokeObjectURL(file.fileUrl);
    setFile(defaultFileState);
    setError("");
    onFileUrlChange("");
  };

  const onImportClick = async () => {
    setIsImporting(true);
    setError("");
    try {
      const resume = await parseResumeFromPdf(file.fileUrl);
      const settings = deepClone(initialSettings);

      // Set formToShow settings based on uploaded resume if users have used the app before
      if (getHasUsedAppBefore()) {
        const sections = Object.keys(settings.formToShow) as ShowForm[];
        const sectionToFormToShow: Record<ShowForm, boolean> = {
          workExperiences: resume.workExperiences.length > 0,
          educations: resume.educations.length > 0,
          projects: resume.projects.length > 0,
          skills: resume.skills.descriptions.length > 0,
          custom: resume.custom.descriptions.length > 0,
        };
        for (const section of sections) {
          settings.formToShow[section] = sectionToFormToShow[section];
        }
      }

      saveStateToLocalStorage({ resume, settings });
      router.push("/resume-builder");
    } catch {
      setIsImporting(false);
      setError(
        "We couldn't read text from this PDF. If it is a scanned image, open the editor and type your resume in instead."
      );
    }
  };

  return (
    <div
      className={cx(
        "upload-box",
        playgroundView && "upload-box-compact",
        isHoveredOnDropzone && "dragging",
        hasFile && "has-file",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsHoveredOnDropzone(true);
      }}
      onDragLeave={() => setIsHoveredOnDropzone(false)}
      onDrop={onDrop}
    >
      {!hasFile ? (
        <>
          {!playgroundView && (
            <ArrowUpTrayIcon className="upload-icon" aria-hidden="true" />
          )}
          <b>Choose or drop your PDF resume</b>
          <span>PDF only · up to 5 MB</span>
          <label
            className={cx(
              "cursor-pointer",
              playgroundView ? "btn-secondary" : "btn-primary"
            )}
          >
            Browse file
            <input
              type="file"
              className="sr-only"
              accept=".pdf,application/pdf"
              onChange={onInputChange}
            />
          </label>
        </>
      ) : (
        <>
          <div className="upload-file">
            <div>
              <b>{file.name}</b>
              <span>
                {getFileSizeString(file.size)} · PDF signature checked
              </span>
            </div>
            <button
              type="button"
              className="upload-remove"
              title="Remove file"
              aria-label="Remove file"
              onClick={onRemove}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {!playgroundView && (
            <button
              type="button"
              className="btn-primary"
              disabled={isImporting}
              onClick={onImportClick}
            >
              {isImporting ? (
                "Reading your resume…"
              ) : (
                <>
                  Import and continue <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          )}
          <span>
            {playgroundView ? "The parser" : "Import"} works best on a
            single-column resume.
          </span>
        </>
      )}
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
      {!playgroundView && (
        <p className="upload-lock">
          <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Read in your browser. Nothing is uploaded.
        </p>
      )}
    </div>
  );
};

const getFileSizeString = (fileSizeB: number) => {
  const fileSizeKB = fileSizeB / 1024;
  const fileSizeMB = fileSizeKB / 1024;
  if (fileSizeKB < 1000) {
    return fileSizeKB.toPrecision(3) + " KB";
  } else {
    return fileSizeMB.toPrecision(3) + " MB";
  }
};
