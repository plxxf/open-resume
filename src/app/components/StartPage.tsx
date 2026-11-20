"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ResumeDropzone } from "components/ResumeDropzone";
import { getHasUsedAppBefore } from "lib/redux/local-storage";

/**
 * Start page: import a PDF, continue a saved draft, or open the editor.
 * Layout follows the airesume draft's builder shell.
 */
export const StartPage = () => {
  const [hasUsedAppBefore, setHasUsedAppBefore] = useState(false);
  const [hasAddedResume, setHasAddedResume] = useState(false);

  useEffect(() => {
    setHasUsedAppBefore(getHasUsedAppBefore());
  }, []);

  return (
    <main className="start">
      <div className="start-heading">
        <div>
          <p className="eyebrow">airesume · Resume editor</p>
          <h1>
            Edit your resume, <em>then download it.</em>
          </h1>
        </div>
        <p className="start-lede">
          Import the PDF resume you already have, or open the editor and type
          it in. You edit on the left and see the finished page on the right.
        </p>
      </div>

      <div className="start-shell">
        <div className="start-steps" aria-hidden="true">
          <span className="active">01 Import</span>
          <span>02 Edit</span>
          <span>03 Download</span>
          <i />
        </div>

        <div className="start-grid">
          <div>
            <div className="field-label">
              <span>01</span>
              <div>
                <b>
                  {hasUsedAppBefore
                    ? "Import a new PDF resume"
                    : "Import your PDF resume"}
                </b>
                <small>
                  {hasUsedAppBefore
                    ? "This replaces the draft saved in this browser"
                    : "We fill in the editor from your file"}
                </small>
              </div>
            </div>
            <ResumeDropzone
              onFileUrlChange={(fileUrl) => setHasAddedResume(Boolean(fileUrl))}
            />
          </div>

          <div className="start-alt">
            <div className="field-label">
              <span>02</span>
              <div>
                <b>{hasUsedAppBefore ? "Or keep editing" : "No PDF yet?"}</b>
                <small>
                  {hasUsedAppBefore
                    ? "Your last draft is saved in this browser"
                    : "Type your resume into the editor"}
                </small>
              </div>
            </div>
            <div className="start-alt-card">
              <p>
                {hasUsedAppBefore
                  ? "Pick up where you left off. Your draft stays in this browser until you clear it."
                  : "Start with empty sections for education, experience, projects and skills, then download a PDF."}
              </p>
              <Link
                className={hasAddedResume ? "btn-secondary" : "btn-primary"}
                href="/resume-builder"
              >
                {hasUsedAppBefore
                  ? "Continue where I left off"
                  : "Start from scratch"}
              </Link>
            </div>
          </div>
        </div>

        <div className="start-submit">
          <p>
            Want a match score against a job first? Use the{" "}
            <a href="https://airesume.blog/#checker">ATS resume checker</a> on
            airesume.blog.
          </p>
        </div>
      </div>
    </main>
  );
};
