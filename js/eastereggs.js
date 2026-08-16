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

const DAD_JOKES = [
  "Why do SREs make terrible poker players? Their pager always tells on them.",
  "I told my team a joke about UDP. Not sure if it landed.",
  "There are 10 kinds of SREs: those who understand binary, and those who don't.",
  "Why did the deployment go to therapy? Too many unresolved dependencies.",
  "I'd tell you a DNS joke, but it takes 24–48 hours to propagate.",
  "My code doesn't have bugs. It has undocumented features with three nines of availability.",
  "Why did the load balancer break up with the server? It needed some space, and better health checks.",
  "How many SREs does it take to change a light bulb? None — that's a hardware problem, file a ticket.",
  "Why don't SREs trust the cloud? Because it's just someone else's computer, and someone else's problem at 3am.",
  "What did the SRE say to the flaky test? It's not you, it's your race condition.",
];

export function randomDadJoke() {
  return DAD_JOKES[Math.floor(Math.random() * DAD_JOKES.length)];
}

const FAKE_PROCESSES = [
  { name: "coffee.service", cpu: 92.4, mem: 12.1 },
  { name: "on-call-anxiety.exe", cpu: 78.3, mem: 45.6 },
  { name: "kubectl-yaml-indent-fixer", cpu: 61.0, mem: 8.2 },
  { name: "terraform-plan-review", cpu: 54.7, mem: 22.9 },
  { name: "slack-notifications", cpu: 43.2, mem: 15.0 },
  { name: "prometheus-alert-triage", cpu: 38.9, mem: 19.4 },
  { name: "stackoverflow-tab-x47", cpu: 31.5, mem: 3.3 },
  { name: "rubber-duck-debugger", cpu: 12.0, mem: 1.1 },
];

// Returns { pid, name, cpu, mem } rows, sorted highest CPU first, same shape
// real `top` uses — the rendering side (column widths/padding) belongs to
// the handler, not here.
export function fakeProcesses() {
  return FAKE_PROCESSES.map((p, i) => ({ pid: 1000 + i, ...p }));
}

// Simulated `ping` output. Takes a random-ish jitter, so this is the one
// builder in this file that isn't deterministic — same precedent as
// randomQuote()/randomDadJoke() above.
export function buildPing(host, ip) {
  const lines = [`PING ${host} (${ip}): 56 data bytes`];
  const times = [];
  for (let i = 0; i < 4; i++) {
    const t = 0.3 + Math.random() * 0.4;
    times.push(t);
    lines.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${t.toFixed(3)} ms`);
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  lines.push("");
  lines.push(`--- ${host} ping statistics ---`);
  lines.push("4 packets transmitted, 4 packets received, 0.0% packet loss");
  lines.push(`round-trip min/avg/max = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)} ms`);
  return lines;
}

// Fixed set of fake infrastructure hops, always ending at "the-cloud" —
// the punchline being that everything, eventually, is just someone else's
// computer (see the QUOTES list above).
const TRACE_HOPS = [
  "localhost (127.0.0.1)",
  "gateway.local (10.0.0.1)",
  "isp-edge-router.net (198.51.100.1)",
  "us-east-1.aws-transit.net (203.0.113.5)",
  "cloudfront-edge.aws.com (203.0.113.9)",
  "the-cloud (☁)",
];

export function buildTraceroute(host) {
  const lines = [`traceroute to ${host}, 30 hops max`];
  let t = 0.4;
  TRACE_HOPS.forEach((hop, i) => {
    t += Math.random() * 6 + 1;
    lines.push(`${String(i + 1).padStart(2)}  ${hop}  ${t.toFixed(3)} ms`);
  });
  return lines;
}
