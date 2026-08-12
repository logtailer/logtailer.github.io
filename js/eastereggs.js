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
