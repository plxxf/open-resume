"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectResume, setResume } from "lib/redux/resumeSlice";
import type { Resume } from "lib/redux/types";
import {
  ApiError,
  JD_EVENT,
  JD_KEY,
  applyEdits,
  getConfig,
  getMe,
  signIn,
  signOut,
  tailor,
  type TailorResult,
  type TailorUser,
} from "components/Tailor/api";

declare global {
  interface Window {
    google?: any;
  }
}

const TARGET_LABEL: Record<string, string> = {
  summary: "Summary",
  work: "Work experience",
  projects: "Project",
  education: "Education",
  custom: "Extra section",
};

const loadGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById("gsi-client");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.id = "gsi-client";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(s);
  });

const readJd = () => {
  try {
    return localStorage.getItem(JD_KEY) || "";
  } catch {
    return "";
  }
};

export const TailorPanel = () => {
  const dispatch = useAppDispatch();
  const resume = useAppSelector(selectResume);

  const [config, setConfig] = useState<{ googleClientId: string; freePerDay: number; aiReady: boolean } | null>(null);
  const [user, setUser] = useState<TailorUser | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);
  const [pickSkills, setPickSkills] = useState(true);
  const [missing, setMissing] = useState<TailorResult["missing"]>([]);
  const [undo, setUndo] = useState<Resume | null>(null);
  const googleBtn = useRef<HTMLDivElement>(null);

  // Job description: kept in this browser, also filled by the checker hand-off.
  useEffect(() => {
    setJd(readJd());
    const onJd = () => setJd(readJd());
    window.addEventListener(JD_EVENT, onJd);
    return () => window.removeEventListener(JD_EVENT, onJd);
  }, []);
  const changeJd = (value: string) => {
    setJd(value);
    try {
      localStorage.setItem(JD_KEY, value);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    getConfig()
      .then((c) => {
        setConfig(c);
        if (!c.aiReady) return;
        return getMe().then((me) => {
          setUser(me.user);
          setLeft(me.user ? me.left ?? null : null);
        });
      })
      .catch(() => setConfig({ googleClientId: "", freePerDay: 0, aiReady: false }));
  }, []);

  const onCredential = useCallback((response: { credential: string }) => {
    setMessage(null);
    signIn(response.credential)
      .then(() => getMe())
      .then((me) => {
        setUser(me.user);
        setLeft(me.left ?? null);
      })
      .catch((e: ApiError) => setMessage({ text: e.message, bad: true }));
  }, []);

  // Render the Google button when signed out.
  useEffect(() => {
    if (!config?.aiReady || user || !googleBtn.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleBtn.current) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: onCredential,
        });
        googleBtn.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtn.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
        });
      })
      .catch((e: Error) => setMessage({ text: e.message, bad: true }));
    return () => {
      cancelled = true;
    };
  }, [config, user, onCredential]);

  const run = () => {
    setMessage(null);
    setResult(null);
    setMissing([]);
    setUndo(null);
    if (jd.trim().length < 80) {
      setMessage({ text: "Paste the full job description first.", bad: true });
      return;
    }
    setBusy(true);
    tailor(jd, resume)
      .then((r) => {
        setResult(r);
        setMissing(r.missing);
        setPicked(r.edits.map(() => true));
        setPickSkills(true);
        setLeft(r.left);
        if (!r.edits.length && !r.skills.length)
          setMessage({ text: "No changes suggested: your wording already fits this job well." });
      })
      .catch((e: ApiError) => {
        if (e.code === "login_required") setUser(null);
        setMessage({ text: e.message, bad: true });
      })
      .finally(() => setBusy(false));
  };

  const apply = () => {
    if (!result) return;
    const chosen = result.edits.filter((_, i) => picked[i]);
    const next = applyEdits(resume, chosen, pickSkills ? result.skills : null);
    setUndo(resume);
    dispatch(setResume(next));
    const n = chosen.length + (pickSkills && result.skills.length ? 1 : 0);
    setResult(null);
    setMessage({
      text: `Applied ${n} change${n === 1 ? "" : "s"}. Check every line before you export.`,
    });
  };

  const revert = () => {
    if (!undo) return;
    dispatch(setResume(undo));
    setUndo(null);
    setMessage({ text: "Changes undone." });
  };

  const logout = () => {
    signOut().finally(() => {
      setUser(null);
      setLeft(null);
    });
  };

  if (!config) return null;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-blue-100 bg-white p-6 pt-4 shadow">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Tailor to a job with AI</h2>
        {user && (
          <span className="text-xs text-gray-500">
            {user.email} ·{" "}
            <button type="button" className="underline" onClick={logout}>
              Sign out
            </button>
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">
        Paste the job description. AI rewrites your summary and bullet points in
        the job&apos;s language using only facts already in your resume, and
        you choose which changes to keep.
      </p>
      <label className="text-base font-medium text-gray-700">
        Job description
        <textarea
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 shadow-sm outline-none"
          rows={5}
          value={jd}
          placeholder="Paste responsibilities, requirements and nice-to-haves"
          onChange={(e) => changeJd(e.target.value)}
        />
      </label>

      {!config.aiReady ? (
        <p className="text-sm text-gray-500">AI tailoring is coming soon.</p>
      ) : !user ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            Sign in with Google to use AI tailoring ({config.freePerDay} free
            runs a day).
          </p>
          <div ref={googleBtn} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={run} disabled={busy || left === 0}>
            {busy ? "Tailoring…" : "Tailor my resume"}
          </button>
          {left !== null && (
            <span className="text-sm text-gray-500">
              {left} of {config.freePerDay} free runs left today
            </span>
          )}
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.bad ? "text-red-600" : "text-gray-700"}`} role="status">
          {message.text}{" "}
          {undo && (
            <button type="button" className="underline" onClick={revert}>
              Undo
            </button>
          )}
        </p>
      )}

      {result && (result.edits.length > 0 || result.skills.length > 0) && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-800">
            Suggested changes: untick any you don&apos;t want.
          </p>
          <ul className="flex flex-col gap-3">
            {result.edits.map((e, i) => (
              <li key={i} className="rounded-md border border-gray-200 p-3">
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={picked[i] ?? false}
                    onChange={() => setPicked((p) => p.map((v, j) => (j === i ? !v : v)))}
                  />
                  <span className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {TARGET_LABEL[e.target]}
                    </span>
                    {e.before && <span className="text-gray-400 line-through">{e.before}</span>}
                    <span className="text-gray-900">{e.after}</span>
                    {e.why && <span className="text-xs text-blue-700">{e.why}</span>}
                  </span>
                </label>
              </li>
            ))}
            {result.skills.length > 0 && (
              <li className="rounded-md border border-gray-200 p-3">
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={pickSkills}
                    onChange={() => setPickSkills((v) => !v)}
                  />
                  <span className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Skills order
                    </span>
                    {result.skills.map((s, i) => (
                      <span key={i} className="text-gray-900">
                        {s}
                      </span>
                    ))}
                    <span className="text-xs text-blue-700">
                      Same skills, with the ones this job asks for first.
                    </span>
                  </span>
                </label>
              </li>
            )}
          </ul>
          <div className="flex gap-3">
            <button type="button" className="btn-primary" onClick={apply}>
              Apply selected
            </button>
            <button type="button" className="btn-secondary" onClick={() => setResult(null)}>
              Discard
            </button>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Keywords from the job your resume doesn&apos;t show
          </p>
          <p className="text-xs text-amber-800">
            We never add these for you. Add one yourself only if it is true.
          </p>
          <ul className="flex flex-col gap-1 text-sm text-amber-900">
            {missing.map((m, i) => (
              <li key={i}>
                <b>{m.keyword}</b>
                {m.note ? `: ${m.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
