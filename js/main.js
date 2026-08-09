// Entry point: wires DOM refs, runs the boot sequence, then starts the
// interactive command loop (keyboard + mobile controls).

import { content } from "./content.js";
import * as terminal from "./terminal.js";
import * as boot from "./boot.js";
import * as history from "./history.js";
import * as theme from "./theme.js";
import { dispatch, completions } from "./commands.js";

function init() {
  const outputEl = document.getElementById("output");
  const liveEl = document.getElementById("sr-live"); // separate visually-hidden live region
  const scrollEl = document.getElementById("scroll-region");
  const promptLabelEl = document.getElementById("prompt-label");
  const inputEl = document.getElementById("cmd-input");
  const terminalEl = document.getElementById("terminal");
  const hintEl = document.getElementById("skip-hint");

  terminal.init({ outputEl, liveEl, scrollEl, promptLabelEl, inputEl, terminalEl });
  renderPlainFallback(content);

  // A returning visitor's theme choice, applied before boot starts so the
  // whole intro plays in the right colors, not just the interactive part.
  const state = { themeName: theme.getStoredTheme(), promptString: "" };
  theme.applyTheme(state.themeName);
  state.promptString = theme.getPromptString(state.themeName, content.meta);

  const ctx = {
    content,
    escapeHtml: terminal.escapeHtml,
    clearOutput: terminal.clearOutput,
    getTheme: () => state.themeName,
    setTheme: (name) => {
      if (!theme.applyTheme(name)) return false;
      state.themeName = name;
      state.promptString = theme.getPromptString(name, content.meta);
      terminal.setPromptLabel(state.promptString);
      return true;
    },
  };

  boot.run(content, { hintEl }).then(() => startInteractive(state, ctx, inputEl));
}

function runLine(line, state, ctx) {
  terminal.appendPromptEcho(state.promptString, line);
  history.push(line);
  const blocks = dispatch(line, ctx);
  terminal.appendBlocks(blocks);
  terminal.focusInput();
}

function startInteractive(state, ctx, inputEl) {
  terminal.setPromptLabel(state.promptString);
  document.getElementById("prompt-line").hidden = false;
  terminal.focusInput();

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const line = terminal.getInputValue();
      terminal.setInputValue("");
      history.reset();
      runLine(line, state, ctx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      terminal.setInputValue(history.prev(terminal.getInputValue()));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      terminal.setInputValue(history.next(terminal.getInputValue()));
    } else if (e.key === "Tab") {
      e.preventDefault();
      const current = terminal.getInputValue();
      const matches = completions(current.toLowerCase());
      if (matches.length === 1) {
        terminal.setInputValue(matches[0] + " ");
      } else if (matches.length > 1) {
        terminal.appendPromptEcho(state.promptString, current);
        terminal.appendLine(matches.join("  "));
      }
    }
  });

  setupMobileControls(state, ctx);
}

function setupMobileControls(state, ctx) {
  const controls = document.getElementById("mobile-controls");
  if (!controls) return;

  controls.querySelectorAll("button[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      runLine(btn.dataset.cmd, state, ctx);
    });
  });

  const up = document.getElementById("hist-up");
  const down = document.getElementById("hist-down");
  if (up) {
    up.addEventListener("click", () => {
      terminal.setInputValue(history.prev(terminal.getInputValue()));
      terminal.focusInput();
    });
  }
  if (down) {
    down.addEventListener("click", () => {
      terminal.setInputValue(history.next(terminal.getInputValue()));
      terminal.focusInput();
    });
  }
}

// Renders a plain, semantic HTML version of the same content.js data into
// #plain-resume-content — the accessible/no-JS/SEO fallback reached via the
// skip link. Built from the same data model as the terminal commands so
// nothing here can drift out of sync with what the terminal reports.
function renderPlainFallback(content) {
  const root = document.getElementById("plain-resume-content");
  if (!root) return;

  const el = (tag, opts = {}, children = []) => {
    const node = document.createElement(tag);
    if (opts.text) node.textContent = opts.text;
    if (opts.href) {
      node.href = opts.href;
      node.rel = "noopener noreferrer";
      node.target = "_blank";
    }
    for (const child of children) node.appendChild(child);
    return node;
  };

  root.appendChild(el("h1", { text: `${content.meta.name} — ${content.meta.title}` }));
  root.appendChild(el("p", { text: content.summary }));

  const contactList = el("ul");
  contactList.appendChild(el("li", { text: `Phone: ${content.contact.phone}` }));
  contactList.appendChild(
    el("li", {}, [el("a", { href: `mailto:${content.contact.email}`, text: content.contact.email })])
  );
  contactList.appendChild(
    el("li", {}, [el("a", { href: content.contact.linkedinUrl, text: content.contact.linkedin })])
  );
  contactList.appendChild(
    el("li", {}, [el("a", { href: content.contact.githubUrl, text: content.contact.github })])
  );
  contactList.appendChild(el("li", {}, [el("a", { href: "resume.pdf", text: "Download resume (PDF)" })]));
  root.appendChild(contactList);

  root.appendChild(el("h2", { text: "Education" }));
  for (const e of content.education) {
    root.appendChild(el("h3", { text: e.degree }));
    root.appendChild(el("p", { text: `${e.school} — ${e.period}` }));
  }

  root.appendChild(el("h2", { text: "Experience" }));
  for (const job of content.experience) {
    root.appendChild(el("h3", { text: `${job.role} — ${job.company}` }));
    root.appendChild(el("p", { text: job.period }));
    const list = el("ul");
    for (const b of job.bullets) list.appendChild(el("li", { text: b }));
    root.appendChild(list);
  }

  root.appendChild(el("h2", { text: "Skills" }));
  const skillsList = el("ul");
  skillsList.appendChild(el("li", { text: `Core: ${content.skills.core.join(", ")}` }));
  skillsList.appendChild(el("li", { text: `Observability: ${content.skills.observability.join(", ")}` }));
  skillsList.appendChild(el("li", { text: `Platform: ${content.skills.platform.join(", ")}` }));
  root.appendChild(skillsList);

  root.appendChild(el("h2", { text: "Certifications" }));
  const certList = el("ul");
  for (const c of content.certifications) {
    certList.appendChild(el("li", {}, [el("a", { href: c.url, text: `${c.name} (${c.date})` })]));
  }
  root.appendChild(certList);

  root.appendChild(el("h2", { text: "Projects" }));
  for (const p of content.projects) {
    root.appendChild(el("h3", { text: p.name }));
    root.appendChild(el("p", { text: p.tagline }));
    const list = el("ul");
    for (const d of p.details) list.appendChild(el("li", { text: d }));
    root.appendChild(list);
  }
}

document.addEventListener("DOMContentLoaded", init);
