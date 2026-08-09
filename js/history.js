// Command history buffer for Up/Down arrow navigation. No rendering knowledge —
// just returns strings; terminal.js decides how to display them.

const buffer = [];
let cursor = null; // index into buffer while navigating; null when not navigating
let draft = "";    // whatever the user had typed before they started pressing Up

export function push(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (buffer[buffer.length - 1] === trimmed) return; // skip immediate repeats
  buffer.push(trimmed);
  cursor = null;
}

export function prev(currentInput) {
  if (buffer.length === 0) return currentInput;
  if (cursor === null) {
    draft = currentInput;
    cursor = buffer.length - 1;
  } else if (cursor > 0) {
    cursor -= 1;
  }
  return buffer[cursor];
}

export function next(currentInput) {
  if (cursor === null) return currentInput;
  if (cursor < buffer.length - 1) {
    cursor += 1;
    return buffer[cursor];
  }
  cursor = null;
  return draft;
}

export function reset() {
  cursor = null;
  draft = "";
}
