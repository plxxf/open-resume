"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_SITE = "https://airesume.blog";

const APP_LINKS = [
  ["/resume-import", "Import"],
  ["/resume-builder", "Editor"],
  ["/resume-parser", "How ATS reads your PDF"],
] as const;

const SITE_LINKS = [
  [`${MAIN_SITE}/resume-templates`, "Templates"],
] as const;

// Full-height tool pages manage their own scrolling, so they get no footer.
const PAGES_WITHOUT_FOOTER = ["/resume-builder", "/resume-parser"];

export const Brand = () => (
  <Link href="/" className="brand" aria-label="airesume editor home">
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2563eb" />
      <path
        d="M10 9h8l4 4v10H10z M18 9v4h4 M13 17h6 M13 20h4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
    <span className="brand-word">
      <span className="brand-ai">ai</span>resume
    </span>
    <span className="brand-tag">editor</span>
  </Link>
);

export const SiteNav = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="nav" aria-label="Site header">
      <div className="nav-inner">
        <Brand />
        <nav
          id="site-nav-links"
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main"
        >
          {APP_LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          {SITE_LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="nav-cta" href={`${MAIN_SITE}/#checker`}>
          ATS check
        </a>
        <button
          type="button"
          className="menu"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="site-nav-links"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};

export const SiteFooter = () => {
  const pathname = usePathname();
  if (PAGES_WITHOUT_FOOTER.includes(pathname)) return null;
  return (
    <footer className="foot">
      <div className="foot-grid">
        <div className="foot-brand">
          <Brand />
          <p>
            Update your resume, build a better career. The airesume editor runs
            in your browser; your resume is not uploaded.
          </p>
        </div>
        <div className="foot-col">
          <b>Product</b>
          <Link href="/resume-builder">Resume editor</Link>
          <a href={`${MAIN_SITE}/`}>ATS resume checker</a>
          <a href={`${MAIN_SITE}/resume-templates`}>Resume templates</a>
        </div>
        <div className="foot-col">
          <b>Company</b>
          <a href={`${MAIN_SITE}/privacy`}>Privacy Policy</a>
          <a href={`${MAIN_SITE}/terms`}>Terms of Service</a>
          <a href={`${MAIN_SITE}/contact`}>Contact</a>
        </div>
      </div>
      <div className="foot-row">
        <span>© 2026 airesume.blog</span>
        <span>
          Based on{" "}
          <a href="https://github.com/xitanggg/open-resume">OpenResume</a> by
          Xitang Zhao ·{" "}
          <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL-3.0</a> ·{" "}
          <a href="https://github.com/plxxf/open-resume">Source code</a>
        </span>
      </div>
    </footer>
  );
};
