// Pure data/builders for the terminal's easter-egg commands. No DOM here —
// anything that needs to touch the page (chaos-monkey's glitch, the train's
// animation, poweroff's CRT collapse) lives in main.js as a ctx capability,
// same pattern as ctx.renderMailForm.

export const TRAIN_SPRITE = [
  "     ____",
  "    /|_||_\\`.",
  "   (   __  __ )",
  "    '-(__)(__)-'",
];

export function buildCowsay(message) {
  const msg = message && message.trim() ? message.trim() : "Automate everything.";
  const top = " " + "_".repeat(msg.length + 2);
  const bottom = " " + "-".repeat(msg.length + 2);
  return [
    top,
    `< ${msg} >`,
    bottom,
    "        \\   ^__^",
    "         \\  (oo)\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ];
}

export const QUOTES = [
  "Hope is not a strategy.",
  "Everything fails, all the time. — Werner Vogels",
  "The best incident is the one that never pages anyone.",
  "You build it, you run it.",
  "There is no cloud, just someone else's computer.",
  "Chaos engineering: breaking things on purpose so they don't break by accident.",
  "A distributed system is one where a computer you didn't know existed can cause your program to fail. — Leslie Lamport",
  "Automate the boring parts so you have time for the terrifying parts.",
  "It's not a bug, it's an undocumented feature request from production.",
  "99.999% uptime means five minutes of you explaining the other 0.001%.",
];

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// `lolcat`-style rainbow text: one <span> per character, hue stepped around
// the color wheel. Takes escapeHtml as a param rather than importing it from
// terminal.js, keeping this file DOM-free per the module comment above.
export function buildLolcat(message, escapeHtml) {
  const value = message && message.trim() ? message.trim() : "Automate everything, colorfully.";
  return [...value]
    .map((ch, i) => `<span style="color:hsl(${(i * 18) % 360}, 85%, 65%)">${escapeHtml(ch)}</span>`)
    .join("");
}

// A real figlet/toilet builds letterforms out of ASCII blocks rather than
// just printing the word bigger — this is a small hand-authored 5x5
// dot-matrix font (uppercase only; case is folded on lookup) covering
// A-Z, 0-9, space, and a handful of punctuation marks. Unknown characters
// fall back to a solid block rather than vanishing silently.
const FIGLET_ROWS = 5;
const FIGLET_FALLBACK = ["#####", "#   #", "#   #", "#   #", "#####"];
const FIGLET_FONT = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "###  ", "#    ", "#####"],
  F: ["#####", "#    ", "###  ", "#    ", "#    "],
  G: [" ####", "#    ", "# ###", "#   #", " ####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["  ###", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  Q: [" ### ", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#### ", "# #  ", "#  # "],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
  0: [" ### ", "#   #", "# # #", "#   #", " ### "],
  1: ["  #  ", " ##  ", "  #  ", "  #  ", "#####"],
  2: ["#### ", "    #", "  ## ", " #   ", "#####"],
  3: ["#### ", "    #", "  ## ", "    #", "#### "],
  4: ["#  # ", "#  # ", "#####", "   # ", "   # "],
  5: ["#####", "#    ", "#### ", "    #", "#### "],
  6: [" ####", "#    ", "#### ", "#   #", " ### "],
  7: ["#####", "    #", "   # ", "  #  ", "  #  "],
  8: [" ### ", "#   #", " ### ", "#   #", " ### "],
  9: [" ### ", "#   #", " ####", "    #", " ### "],
  " ": ["     ", "     ", "     ", "     ", "     "],
  "!": ["  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "  ## ", "     ", "  #  "],
  ".": ["     ", "     ", "     ", "     ", "  #  "],
  ",": ["     ", "     ", "     ", "  #  ", " #   "],
  "-": ["     ", "     ", "#####", "     ", "     "],
  "'": [" #   ", " #   ", "     ", "     ", "     "],
  ":": ["     ", "  #  ", "     ", "  #  ", "     "],
};

// Returns FIGLET_ROWS plain-text lines (one glyph column per source
// character, single-space gap between glyphs).
export function buildFiglet(message) {
  const value = (message && message.trim() ? message.trim() : "SUMIT").toUpperCase();
  const glyphs = [...value].map((ch) => FIGLET_FONT[ch] || FIGLET_FALLBACK);
  const lines = [];
  for (let row = 0; row < FIGLET_ROWS; row++) {
    lines.push(glyphs.map((g) => g[row]).join(" "));
  }
  return lines;
}

// Same glyphs as buildFiglet, but each column gets its own hue so the whole
// banner reads as vertical rainbow stripes — `toilet`'s answer to lolcat.
export function buildFigletRainbow(message, escapeHtml) {
  return buildFiglet(message).map((line) =>
    [...line]
      .map((ch, col) => `<span style="color:hsl(${(col * 14) % 360}, 85%, 65%)">${escapeHtml(ch)}</span>`)
      .join("")
  );
}

// Wraps the rainbow banner in an ASCII box border, sized to the widest row.
export function buildToiletBox(message, escapeHtml) {
  const plainRows = buildFiglet(message);
  const width = Math.max(...plainRows.map((r) => r.length));
  const border = `+${"-".repeat(width + 2)}+`;
  const rainbowRows = buildFigletRainbow(message, escapeHtml);
  const boxedRows = rainbowRows.map((row, i) => `| ${row}${" ".repeat(width - plainRows[i].length)} |`);
  return [border, ...boxedRows, border];
}
