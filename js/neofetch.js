// Builds the neofetch/screenfetch-style avatar + specs block, shared by
// boot.js (initial reveal) and commands.js's `banner` command (instant
// replay) so the two never drift out of sync.

import { escapeHtml } from "./terminal.js";

const SWATCH_VARS = ["--accent", "--heading", "--subheading", "--error", "--muted", "--fg"];

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

// Returns [{ type: 'html', value }] — same output-block shape commands.js
// uses, so it can be appended via terminal.appendBlocks directly. It's a
// single combined block (image + specs laid out with flexbox) rather than
// one row per spec line — real layout, not a text zipper, so it can't be
// built line-by-line the way the old ASCII-logo version was.
export function buildNeofetchBlocks(content) {
  const { meta } = content;
  const specs = buildSpecs(content);

  const specLines = [
    `<div class="nf-header">${escapeHtml(`${meta.promptUser}@${meta.promptHost}`)}</div>`,
    `<div class="nf-rule">${"─".repeat(20)}</div>`,
    ...specs.map(
      ([label, value]) => `<div><span class="nf-label">${escapeHtml(label)}</span>: ${escapeHtml(value)}</div>`
    ),
    `<div class="nf-swatch-row">${buildSwatchRow()}</div>`,
  ].join("");

  const panel = `
    <div class="nf-panel">
      <img class="nf-avatar" src="avatar.jpg" alt="${escapeHtml(meta.name)}" width="140" height="140" />
      <div class="nf-specs">${specLines}</div>
    </div>
  `;

  return [{ type: "html", value: panel }];
}
