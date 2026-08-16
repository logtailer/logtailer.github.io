// Pure, DOM-free formatting primitives shared by every command handler in
// handlers.js and by commands.js itself. No ctx.content knowledge here —
// these just turn strings/rows into output blocks.

export function text(value, className) {
  return { type: "text", value, className };
}
export function html(value, className) {
  return { type: "html", value, className };
}
export function blank() {
  return text(" ", "blank");
}
// Returns [headingLine, ruleLine] — spread this at call sites (...heading("X"))
// so every section gets a consistent title + underline without repeating it.
export function heading(value) {
  return [text(value, "heading"), text("─".repeat(Math.min(60, value.length + 2)), "rule")];
}
export function subheading(value) {
  return text(value, "subheading");
}
export function row(value, className) {
  return text(value, className || "table-row");
}
export function head(value) {
  return text(value, "table-head");
}

// Column widths across a set of rows, so every row in a table lines up.
export function colWidths(rows, count) {
  const widths = new Array(count).fill(0);
  for (const r of rows) {
    for (let i = 0; i < count; i++) widths[i] = Math.max(widths[i], String(r[i] ?? "").length);
  }
  return widths;
}
// Pads every cell but the last (no point padding what's already at the edge).
export function padCols(cells, widths) {
  return cells
    .map((c, i) => (i === cells.length - 1 ? String(c) : String(c).padEnd(widths[i])))
    .join("  ");
}

// Below this, padded columns stop having room to breathe — matches the
// .mobile-controls breakpoint in terminal.css.
export function isNarrow() {
  return window.innerWidth <= 640;
}

// Pulls `-o <format>` / `--output <format>` out of an args list, wherever it
// appears, and returns the remaining positional args separately — so e.g.
// `projects stratusfleet -o json` and `projects -o json stratusfleet` both work.
// A trailing `-o`/`--output` with no value reports an error rather than
// silently falling through to `rest` as a bogus positional arg.
export function extractOutputFlag(args) {
  const rest = [];
  let format = null;
  let error = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      if (i + 1 >= args.length) {
        error = `${args[i]} requires a value (json or yaml)`;
        break;
      }
      format = args[i + 1].toLowerCase();
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { format, rest, error };
}

// `ls`-style multi-column grid for a flat list of short items.
export function columnize(items, columns = 3) {
  const width = Math.max(...items.map((i) => i.length)) + 2;
  const lines = [];
  for (let i = 0; i < items.length; i += columns) {
    lines.push(row(items.slice(i, i + columns).map((s) => s.padEnd(width)).join("").trimEnd(), "table-row indent"));
  }
  return lines;
}
