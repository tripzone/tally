export type ThemePref = 'light' | 'dark';

const STORAGE_KEY = 'tally-theme';

function systemPref(): ThemePref {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// The stored explicit choice, or -- the very first time, before the toggle
// has ever been touched -- whatever the OS was set to.
export function getStoredTheme(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // localStorage unavailable (private mode, etc.) -- fall back to system.
  }
  return systemPref();
}

export function applyTheme(pref: ThemePref) {
  document.documentElement.setAttribute('data-theme', pref);
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Ignore -- theme just won't persist across reloads.
  }
}
