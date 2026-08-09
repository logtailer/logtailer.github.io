// Builds the neofetch/screenfetch-style logo + specs block, shared by
// boot.js (initial reveal) and commands.js's `banner` command (instant
// replay) so the two never drift out of sync.

import { neofetchLogo } from "./ascii-art.js";
import { escapeHtml } from "./terminal.js";

const LOGO_WIDTH = Math.max(...neofetchLogo.map((l) => l.length));
const SWATCH_VARS = ["--accent", "--heading", "--subheading", "--error", "--muted", "--fg"];

// Matches the .mobile-controls breakpoint in terminal.css — below this, a
// logo+specs side-by-side row is wider than the screen.
function isNarrow() {
  return window.innerWidth <= 640;
}

function buildSpecs(content) {
  const { meta, skills, projects, certifications } = content;
  return [
    ["OS", `SumitOS ${meta.yearsExperience}.0 (SRE Edition)`],
    ["Host", `${meta.promptHost}.dev`],
    ["Kernel", "devops-5.0.0-sre"],
    ["Uptime", `${meta.yearsExperience} years in production`],
    ["Shell", "portfolio.js"],
    ["Terminal", "web-terminal (you are here)"],
    ["CPU", skills.core.slice(0, 3).join(" / ")],
    ["Memory", `${projects.length} personal projects cached`],
    ["Packages", `${certifications.length} certifications installed`],
  ];
}

function buildSwatchRow() {
  return SWATCH_VARS.map((v) => `<span class="nf-swatch" style="background:var(${v})"></span>`).join("");
}

function buildInfoLines(content) {
  const { meta } = content;
  const specs = buildSpecs(content);
  return [
    `<span class="nf-header">${escapeHtml(`${meta.promptUser}@${meta.promptHost}`)}</span>`,
    `<span class="nf-rule">${"─".repeat(20)}</span>`,
    ...specs.map(([label, value]) => `<span class="nf-label">${escapeHtml(label)}</span>: ${escapeHtml(value)}`),
    "",
    buildSwatchRow(),
  ];
}

// Returns [{ type: 'html', value }] — same output-block shape commands.js
// uses, so it can be appended via terminal.appendBlocks directly.
export function buildNeofetchBlocks(content) {
  const infoLines = buildInfoLines(content);

  if (isNarrow()) {
    const blocks = neofetchLogo.map((l) => ({ type: "html", value: `<span class="nf-logo">${escapeHtml(l)}</span>` }));
    blocks.push({ type: "html", value: " " });
    for (const line of infoLines) blocks.push({ type: "html", value: line || " " });
    return blocks;
  }

  const rows = Math.max(neofetchLogo.length, infoLines.length);
  const blocks = [];
  for (let i = 0; i < rows; i++) {
    const logoPart = (neofetchLogo[i] ?? "").padEnd(LOGO_WIDTH);
    const infoPart = infoLines[i] ?? "";
    blocks.push({ type: "html", value: `<span class="nf-logo">${escapeHtml(logoPart)}</span>  ${infoPart}` });
  }
  return blocks;
}
