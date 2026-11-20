import Link from "next/link";

export default function Home() {
  return (
    <main className="start">
      <p className="eyebrow">airesume · Resume editor</p>
      <h1>
        Edit your resume, <em>then download it.</em>
      </h1>
      <p className="start-lede">
        Import the PDF resume you already have, or open the editor and type it in. You
        edit on the left and see the finished page on the right. Everything
        runs in your browser.
      </p>
      <div className="start-actions">
        <Link className="btn-primary" href="/resume-import">
          Import a PDF resume
        </Link>
        <Link className="btn-secondary" href="/resume-builder">
          Open the editor
        </Link>
      </div>
      <p className="start-note">
        Want to see how well your resume matches a job first? Use the{" "}
        <a href="https://airesume.blog/#checker">ATS resume checker</a> on
        airesume.blog.
      </p>
    </main>
  );
}
