// Theme presets: each is just a set of CSS custom-property overrides plus a
// prompt-string format, applied via inline styles on <html> so they beat
// terminal.css's :root defaults regardless of specificity. Persisted in
// localStorage so a returning visitor keeps their pick.

export const THEMES = {
  nord: {
    label: "Nord (default)",
    vars: {
      "--bg": "#2e3440",
      "--bg-alt": "#3b4252",
      "--fg": "#e5e9f0",
      "--muted": "#7b88a1",
      "--accent": "#88c0d0",
      "--heading": "#81a1c1",
      "--subheading": "#ebcb8b",
      "--error": "#bf616a",
    },
    prompt: (meta) => `${meta.promptUser}@${meta.promptHost}:~$`,
  },
  powershell: {
    label: "PowerShell",
    vars: {
      "--bg": "#012456",
      "--bg-alt": "#1f3a63",
      "--fg": "#f2f2f2",
      "--muted": "#8ea4c9",
      "--accent": "#57c7ff",
      "--heading": "#ffff66",
      "--subheading": "#57c7ff",
      "--error": "#ff6b6b",
    },
    prompt: (meta) => `PS C:\\Users\\${meta.promptUser}>`,
  },
  green: {
    label: "Green Phosphor",
    vars: {
      "--bg": "#0a0f0a",
      "--bg-alt": "#101a10",
      "--fg": "#33ff33",
      "--muted": "#1f9c1f",
      "--accent": "#66ff66",
      "--heading": "#33ff33",
      "--subheading": "#7fff7f",
      "--error": "#ff5555",
    },
    prompt: (meta) => `${meta.promptUser}@${meta.promptHost}:~$`,
  },
  light: {
    label: "macOS Light",
    vars: {
      "--bg": "#f5f5f7",
      "--bg-alt": "#e8e8ec",
      "--fg": "#1d1d1f",
      "--muted": "#6e6e73",
      "--accent": "#0071e3",
      "--heading": "#0071e3",
      "--subheading": "#a2845e",
      "--error": "#d70015",
    },
    prompt: (meta) => `${meta.promptUser}@${meta.promptHost} ~ %`,
  },
};

const STORAGE_KEY = "portfolio-theme";
const DEFAULT_THEME = "nord";

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES[stored] ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // localStorage unavailable (private mode, etc.)
  }
}

export function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return false;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = name;

  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* theme just won't persist across reloads — not worth surfacing an error for */
  }
  return true;
}

export function getPromptString(name, meta) {
  const theme = THEMES[name] || THEMES[DEFAULT_THEME];
  return theme.prompt(meta);
}
