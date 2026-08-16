// Entry point: wires DOM refs, runs the boot sequence, then starts the
// interactive command loop (keyboard + mobile controls).

import { content } from "./content.js";
import * as terminal from "./terminal.js";
import * as boot from "./boot.js";
import * as history from "./history.js";
import * as theme from "./theme.js";
import { buildMailForm } from "./mailform.js";
import { TRAIN_SPRITE } from "./eastereggs.js";
import { dispatch, completions } from "./commands.js";

// ↑ ↑ ↓ ↓ ← → ← → B A
const KONAMI_SEQUENCE = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

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
  const state = { themeName: theme.getStoredTheme(), promptString: "", vimMode: false };
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
    renderMailForm: () => {
      // Focus the form's first field once submitted, focus goes back to the
      // terminal prompt — runLine() below leaves focus alone whenever a
      // command has already claimed it, so neither of these gets stolen.
      const node = terminal.appendNode(buildMailForm(content.contact.email, terminal.focusInput));
      node.querySelector("input, textarea")?.focus();
    },
    enterVimMode: () => {
      state.vimMode = true;
      terminal.setPromptLabel(":");
    },
    triggerChaos: () => {
      const el = document.getElementById("terminal");
      el.classList.add("chaos-glitch");
      setTimeout(() => {
        el.classList.remove("chaos-glitch");
        terminal.appendLine("Recovered in 2.3s — SLA met (99.95%). All pods healthy.", "muted");
      }, 2000);
    },
    runTrain: () => {
      // Real `sl` enters from the left and exits stage right — this used to
      // run pad from 46 down to -20 (right-to-left), which read as the train
      // reversing. Mirrored to start flush left and grow rightward instead.
      const lines = TRAIN_SPRITE.map(() => terminal.appendLine("", "art"));
      let pad = 0;
      const step = () => {
        TRAIN_SPRITE.forEach((sprite, i) => {
          terminal.updateLineSilently(lines[i], " ".repeat(pad) + sprite);
        });
        pad += 6;
        if (pad < 66) setTimeout(step, 90);
      };
      step();
    },
    powerOff: () => {
      const app = document.getElementById("app");
      app.classList.add("powering-off");
      setTimeout(() => {
        app.classList.add("powered-off");
        const restore = () => {
          app.classList.remove("powering-off", "powered-off");
          terminal.focusInput();
        };
        document.addEventListener("keydown", restore, { once: true });
        document.addEventListener("click", restore, { once: true });
      }, 420);
    },
    // Konami-code payload: a canvas "digital rain" overlay on top of the
    // terminal, non-interactive (pointer-events: none) so it doesn't block
    // typing, and self-removing after a few seconds.
    triggerMatrix: () => {
      if (boot.prefersReducedMotion()) return;
      const el = document.getElementById("terminal");
      const canvas = document.createElement("canvas");
      canvas.className = "matrix-rain";
      el.appendChild(canvas);
      const c2d = canvas.getContext("2d");
      const fontSize = 16;
      canvas.width = el.clientWidth;
      canvas.height = el.clientHeight;
      const columns = Math.max(1, Math.floor(canvas.width / fontSize));
      const drops = new Array(columns).fill(1);
      const chars = "01SRE$#@&%アイウエオカキクケコ";
      let frameId;
      const draw = () => {
        c2d.fillStyle = "rgba(0,0,0,0.08)";
        c2d.fillRect(0, 0, canvas.width, canvas.height);
        c2d.fillStyle = "#8fffb0";
        c2d.font = `${fontSize}px monospace`;
        drops.forEach((y, i) => {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          c2d.fillText(ch, i * fontSize, y * fontSize);
          if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 1;
        });
        frameId = requestAnimationFrame(draw);
      };
      draw();
      setTimeout(() => {
        cancelAnimationFrame(frameId);
        canvas.classList.add("matrix-rain-fade");
        setTimeout(() => canvas.remove(), 600);
      }, 4500);
    },
  };

  boot.run(content, { hintEl }).then(() => startInteractive(state, ctx, inputEl));
}

function runLine(line, state, ctx) {
  const focusedBefore = document.activeElement;
  terminal.appendPromptEcho(state.promptString, line);
  history.push(line);
  const blocks = dispatch(line, ctx);
  terminal.appendBlocks(blocks);
  // A command (e.g. `mail`) may have moved focus into its own interactive
  // element while dispatching — only reclaim the prompt if nothing did.
  if (document.activeElement === focusedBefore) {
    terminal.focusInput();
  }
}

function startInteractive(state, ctx, inputEl) {
  terminal.setPromptLabel(state.promptString);
  document.getElementById("prompt-line").hidden = false;
  terminal.focusInput();

  inputEl.addEventListener("keydown", (e) => {
    if (state.vimMode) {
      handleVimKeydown(e, state);
      return;
    }
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
  setupKonamiCode(state, ctx);
}

// A document-level listener rather than binding on inputEl: arrow keys are
// already claimed there for history navigation (preventDefault, but not
// stopPropagation), so tracking the sequence separately at the document
// level sees the same keystrokes without disturbing that behavior.
function setupKonamiCode(state, ctx) {
  let buffer = [];
  document.addEventListener("keydown", (e) => {
    if (state.vimMode) return;
    buffer.push(e.key.toLowerCase());
    buffer = buffer.slice(-KONAMI_SEQUENCE.length);
    if (buffer.length === KONAMI_SEQUENCE.length && buffer.every((k, i) => k === KONAMI_SEQUENCE[i])) {
      buffer = [];
      terminal.appendBlank();
      terminal.appendLine("Konami code accepted. Welcome to the Matrix.", "subheading");
      ctx.triggerMatrix();
    }
  });
}

function setupMobileControls(state, ctx) {
  const controls = document.getElementById("mobile-controls");
  if (!controls) return;

  controls.querySelectorAll("button[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.vimMode) return; // trapped — mobile chips shouldn't sneak a command through
      runLine(btn.dataset.cmd, state, ctx);
    });
  });

  const up = document.getElementById("hist-up");
  const down = document.getElementById("hist-down");
  if (up) {
    up.addEventListener("click", () => {
      if (state.vimMode) return;
      terminal.setInputValue(history.prev(terminal.getInputValue()));
      terminal.focusInput();
    });
  }
  if (down) {
    down.addEventListener("click", () => {
      if (state.vimMode) return;
      terminal.setInputValue(history.next(terminal.getInputValue()));
      terminal.focusInput();
    });
  }
}

// While "in vim": only lines starting with `:` do anything (the illusion of
// typing into the file otherwise) — :wq/:x/:wq! save-and-quit, :q! quits
// without saving, anything else `:`-prefixed gets vim's real, famous error.
function handleVimKeydown(e, state) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const line = terminal.getInputValue().trim();
  terminal.setInputValue("");
  if (!line.startsWith(":")) return;
  if (line === ":wq" || line === ":wq!" || line === ":x") {
    terminal.appendLine('"resume.txt" 1L, 42B written', "muted");
    exitVimMode(state);
  } else if (line === ":q!") {
    exitVimMode(state);
  } else {
    terminal.appendLine("E37: No write since last change (add ! to override)", "error");
  }
}

function exitVimMode(state) {
  state.vimMode = false;
  terminal.setPromptLabel(state.promptString);
  terminal.focusInput();
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
