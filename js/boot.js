// Boot/intro sequencer: ASCII banner reveal, fake boot log, typewriter intro,
// then hands off to interactive mode. Skippable via any keypress/click, and
// collapses to instant under prefers-reduced-motion.

import { banner } from "./ascii-art.js";
import * as terminal from "./terminal.js";

const BOOT_LOG = [
  "[ OK ] Loading kernel modules: sre, devops, kubernetes...",
  "[ OK ] Mounting /home/sumit...",
  "[ OK ] Starting sshd, prometheus-agent, argocd-sync...",
  "[ OK ] Calibrating on-call pager...",
  "[ OK ] Verifying disaster recovery runbooks...",
  "Establishing secure session...",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function run(content, { hintEl } = {}) {
  const skip = { value: prefersReducedMotion() };

  const onInterrupt = () => {
    skip.value = true;
  };
  document.addEventListener("keydown", onInterrupt);
  document.addEventListener("click", onInterrupt);

  if (hintEl && !skip.value) hintEl.hidden = false;

  try {
    for (const line of banner) {
      terminal.appendLine(line, "ascii");
      if (!skip.value) await sleep(35);
    }

    terminal.appendBlank();

    for (const line of BOOT_LOG) {
      terminal.appendLine(line, "bootlog");
      if (!skip.value) await sleep(100);
    }

    terminal.appendBlank();

    await typewriter(content.summary, skip);

    terminal.appendBlank();
    terminal.appendLine("Type 'help' to see available commands.", "muted");
  } finally {
    document.removeEventListener("keydown", onInterrupt);
    document.removeEventListener("click", onInterrupt);
    if (hintEl) hintEl.hidden = true;
  }
}

async function typewriter(text, skip) {
  if (skip.value) {
    terminal.appendLine(text);
    terminal.announceText(text);
    return;
  }
  const lineEl = terminal.appendLine("");
  let shown = "";
  for (let i = 0; i < text.length; i++) {
    if (skip.value) {
      shown = text;
      terminal.updateLineSilently(lineEl, shown);
      break;
    }
    shown += text[i];
    terminal.updateLineSilently(lineEl, shown);
    await sleep(12);
  }
  terminal.announceText(text);
}
