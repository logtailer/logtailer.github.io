// Rendering engine: owns the output scrollback, the persistent prompt/input line,
// aria-live announcements, and focus handling. No resume data and no command
// parsing live here — this module only knows how to put things on screen.

let refs = null;

export function init({ outputEl, liveEl, scrollEl, promptLabelEl, inputEl, terminalEl }) {
  refs = { outputEl, liveEl, scrollEl, promptLabelEl, inputEl, terminalEl };

  // Click anywhere in the terminal (that isn't a text-selection drag) focuses the input.
  terminalEl.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    inputEl.focus({ preventScroll: true });
  });
}

export function setPromptLabel(text) {
  refs.promptLabelEl.textContent = text;
}

export function focusInput() {
  refs.inputEl.focus({ preventScroll: true });
}

export function getInputValue() {
  return refs.inputEl.value;
}

export function setInputValue(value) {
  refs.inputEl.value = value;
}

export function appendLine(text, className) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.textContent = text;
  refs.outputEl.appendChild(line);
  announce(text);
  scrollToBottom();
  return line;
}

export function appendHTML(html, className) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.innerHTML = html;
  refs.outputEl.appendChild(line);
  announce(line.textContent);
  scrollToBottom();
  return line;
}

export function appendBlank() {
  appendLine(" ", "blank");
}

// Updates a line's text without triggering an aria-live announcement —
// used by the typewriter effect so screen readers aren't spammed per character.
export function updateLineSilently(lineEl, text) {
  lineEl.textContent = text;
  scrollToBottom();
}

export function announceText(text) {
  announce(text);
}

// For output that needs real DOM (form inputs, live event listeners) rather
// than a static text/html block — e.g. the mail command's inline form.
export function appendNode(node) {
  refs.outputEl.appendChild(node);
  scrollToBottom();
  return node;
}

export function appendPromptEcho(promptString, commandText) {
  appendLine(`${promptString} ${commandText}`, "echo");
}

// blocks: [{ type: 'text' | 'html', value: string, className?: string }]
export function appendBlocks(blocks) {
  for (const block of blocks || []) {
    if (block.type === "html") {
      appendHTML(block.value, block.className);
    } else {
      appendLine(block.value, block.className);
    }
  }
}

export function clearOutput() {
  refs.outputEl.innerHTML = "";
}

function announce(text) {
  if (!refs.liveEl) return;
  refs.liveEl.textContent = text;
}

export function scrollToBottom() {
  const el = refs.scrollEl || refs.outputEl;
  el.scrollTop = el.scrollHeight;
}

// Small helper commands.js can use to build safe html output blocks (links etc.)
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
