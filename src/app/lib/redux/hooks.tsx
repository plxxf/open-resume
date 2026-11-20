import { useEffect } from "react";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import { store, type RootState, type AppDispatch } from "lib/redux/store";
import {
  loadStateFromLocalStorage,
  saveStateToLocalStorage,
} from "lib/redux/local-storage";
import { initialResumeState, setResume } from "lib/redux/resumeSlice";
import {
  initialSettings,
  setSettings,
  type Settings,
} from "lib/redux/settingsSlice";
import { deepMerge } from "lib/deep-merge";
import { readImportFromHash, clearImportHash } from "lib/import-from-hash";
import { JD_KEY, JD_EVENT } from "components/Tailor/api";
import type { Resume } from "lib/redux/types";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Hook to save store to local storage on store change
 */
export const useSaveStateToLocalStorageOnChange = () => {
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      saveStateToLocalStorage(store.getState());
    });
    return unsubscribe;
  }, []);
};

const hasSavedResume = (state: any) => {
  const resume = state?.resume;
  if (!resume) return false;
  const { profile = {}, workExperiences = [] } = resume;
  return Boolean(
    profile.name ||
      profile.email ||
      workExperiences.some((w: any) => w?.company || w?.jobTitle)
  );
};

export const useSetInitialStore = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const state = loadStateFromLocalStorage();

    // A resume handed over from the airesume.blog checker (#import=…).
    const imported = readImportFromHash(window.location.hash);
    if (window.location.hash.startsWith("#import=")) clearImportHash();
    if (
      imported &&
      (!hasSavedResume(state) ||
        window.confirm(
          "Replace the resume saved in this browser with the one from the airesume checker?"
        ))
    ) {
      const baseSettings = state?.settings
        ? (deepMerge(initialSettings, state.settings) as Settings)
        : initialSettings;
      const hasCustom = imported.resume.custom.descriptions.length > 0;
      const settings = deepMerge(baseSettings, {
        ...(imported.template ? { template: imported.template } : {}),
        ...(imported.documentSize
          ? { documentSize: imported.documentSize }
          : {}),
        formToShow: { custom: hasCustom },
        ...(hasCustom && imported.customHeading
          ? { formToHeading: { custom: imported.customHeading.toUpperCase() } }
          : {}),
      }) as Settings;
      dispatch(setResume(imported.resume));
      if (imported.jd) {
        try {
          localStorage.setItem(JD_KEY, imported.jd);
        } catch {
          // Ignore
        }
        window.dispatchEvent(new Event(JD_EVENT));
      }
      dispatch(setSettings(settings));
      // Save right away: the change listener may not be subscribed yet.
      saveStateToLocalStorage(store.getState());
      return;
    }

    if (!state) return;
    if (state.resume) {
      // We merge the initial state with the stored state to ensure
      // backward compatibility, since new fields might be added to
      // the initial state over time.
      const mergedResumeState = deepMerge(
        initialResumeState,
        state.resume
      ) as Resume;
      dispatch(setResume(mergedResumeState));
    }
    if (state.settings) {
      const mergedSettingsState = deepMerge(
        initialSettings,
        state.settings
      ) as Settings;
      dispatch(setSettings(mergedSettingsState));
    }
  }, []);
};
