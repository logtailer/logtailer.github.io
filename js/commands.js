// Command registry, parser, and dispatcher. Handlers only ever read from
// ctx.content (content.js) and return output blocks — no direct DOM access,
// so this file stays testable/editable independent of terminal.js.

import { banner } from "./ascii-art.js";

const FILES = {
  "about.txt": "about",
  "experience.log": "experience",
  "education.md": "education",
  "skills.json": "skills",
  "certs.pem": "certs",
  "projects/": "projects",
  "contact.vcf": "contact",
  "resume.pdf": "resume",
};

function text(value, className) {
  return { type: "text", value, className };
}
function html(value, className) {
  return { type: "html", value, className };
}
function blank() {
  return text(" ", "blank");
}
// Returns [headingLine, ruleLine] — spread this at call sites (...heading("X"))
// so every section gets a consistent title + underline without repeating it.
function heading(value) {
  return [text(value, "heading"), text("─".repeat(Math.min(60, value.length + 2)), "rule")];
}
function subheading(value) {
  return text(value, "subheading");
}
function row(value, className) {
  return text(value, className || "table-row");
}
function head(value) {
  return text(value, "table-head");
}

// Column widths across a set of rows, so every row in a table lines up.
function colWidths(rows, count) {
  const widths = new Array(count).fill(0);
  for (const r of rows) {
    for (let i = 0; i < count; i++) widths[i] = Math.max(widths[i], String(r[i] ?? "").length);
  }
  return widths;
}
// Pads every cell but the last (no point padding what's already at the edge).
function padCols(cells, widths) {
  return cells
    .map((c, i) => (i === cells.length - 1 ? String(c) : String(c).padEnd(widths[i])))
    .join("  ");
}

// `ls`-style multi-column grid for a flat list of short items.
function columnize(items, columns = 3) {
  const width = Math.max(...items.map((i) => i.length)) + 2;
  const lines = [];
  for (let i = 0; i < items.length; i += columns) {
    lines.push(row(items.slice(i, i + columns).map((s) => s.padEnd(width)).join("").trimEnd(), "table-row indent"));
  }
  return lines;
}

function cmdHelp(_args, ctx) {
  const out = [...heading("Available Commands")];
  const seen = new Set();
  for (const [name, def] of Object.entries(COMMANDS)) {
    if (def.hidden || seen.has(name)) continue;
    seen.add(name);
    out.push(row(`  ${name.padEnd(12)} ${def.summary}`));
  }
  out.push(blank());
  out.push(text("Tip: use Tab to autocomplete, Up/Down to browse history.", "muted"));
  return out;
}

function cmdAbout(_args, ctx) {
  const { meta, summary } = ctx.content;
  return [...heading(`${meta.name} — ${meta.title}`), blank(), text(summary)];
}

// Experience/education deliberately aren't rendered as a single 3-column table:
// company/school names are long enough (40+ chars) that a shared column width
// across all rows pushes PERIOD off the edge of any reasonably sized terminal.
// Instead, only role+period (both short) share a column so they align down
// the list, and the long field gets its own line.
function cmdExperience(_args, ctx) {
  const jobs = ctx.content.experience;
  const roleWidth = Math.max(...jobs.map((j) => j.role.length));
  const out = [...heading("Experience")];
  for (const job of jobs) {
    out.push(blank());
    out.push(row(`${job.role.padEnd(roleWidth)}  ${job.period}`, "subheading"));
    out.push(text(job.company, "muted"));
    for (const b of job.bullets) out.push(text(`  - ${b}`));
  }
  return out;
}

function cmdEducation(_args, ctx) {
  const edu = ctx.content.education;
  const degreeWidth = Math.max(...edu.map((e) => e.degree.length));
  const out = [...heading("Education")];
  for (const e of edu) {
    out.push(blank());
    out.push(row(`${e.degree.padEnd(degreeWidth)}  ${e.period}`, "subheading"));
    out.push(text(e.school, "muted"));
  }
  return out;
}

function cmdSkills(_args, ctx) {
  const s = ctx.content.skills;
  const groups = [
    ["Core", s.core],
    ["Observability", s.observability],
    ["Platform", s.platform],
  ];
  // Fewer columns on narrow viewports so the grid doesn't clip the longer
  // skill names (matches the .mobile-controls breakpoint in terminal.css).
  const columns = window.innerWidth <= 640 ? 2 : 3;
  const out = [...heading("Skills")];
  for (const [label, items] of groups) {
    out.push(blank());
    out.push(subheading(label));
    out.push(...columnize(items, columns));
  }
  return out;
}

function cmdCerts(_args, ctx) {
  const rows = ctx.content.certifications;
  const widths = colWidths(rows.map((c) => [c.date, c.name]), 2);
  const out = [...heading("Certifications"), blank()];
  out.push(head(padCols(["DATE", "CERTIFICATION"], widths) + "  LINK"));
  for (const c of rows) {
    out.push(
      html(
        `${ctx.escapeHtml(c.date.padEnd(widths[0]))}  ${ctx.escapeHtml(c.name.padEnd(widths[1]))}  ` +
          `<a href="${ctx.escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">verify</a>`,
        "table-row"
      )
    );
  }
  return out;
}

function cmdProjects(args, ctx) {
  const projects = ctx.content.projects;
  if (args.length === 0) {
    // Taglines are too long to share a column with PROJECT at any reasonable
    // terminal width without clipping, so this stays a name + indented
    // description list rather than a single-line table row.
    const out = [...heading("Personal Projects"), text("(run `projects <name>` for details)", "muted")];
    for (const p of projects) {
      out.push(blank());
      out.push(row(p.name, "subheading"));
      out.push(text(`  ${p.tagline}`));
    }
    return out;
  }
  const slug = args[0].toLowerCase();
  const project = projects.find((p) => p.slug === slug);
  if (!project) {
    return [
      text(`projects: no such project '${args[0]}'`, "error"),
      text("Run `projects` with no arguments to list them."),
    ];
  }
  const out = [...heading(project.name), text(project.tagline, "muted"), blank()];
  for (const d of project.details) out.push(text(`  - ${d}`));
  return out;
}

function cmdContact(_args, ctx) {
  const c = ctx.content.contact;
  return [
    ...heading("Contact"),
    blank(),
    text(`Phone:    ${c.phone}`),
    html(`Email:    <a href="mailto:${ctx.escapeHtml(c.email)}">${ctx.escapeHtml(c.email)}</a>`),
    html(`LinkedIn: <a href="${ctx.escapeHtml(c.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${ctx.escapeHtml(c.linkedin)}</a>`),
    html(`GitHub:   <a href="${ctx.escapeHtml(c.githubUrl)}" target="_blank" rel="noopener noreferrer">${ctx.escapeHtml(c.github)}</a>`),
  ];
}

function cmdResume(_args, _ctx) {
  window.open("resume.pdf", "_blank", "noopener,noreferrer");
  return [text("Opening resume.pdf in a new tab...")];
}

function cmdClear(_args, ctx) {
  ctx.clearOutput();
  return [];
}

function cmdBanner(_args, _ctx) {
  return banner.map((line) => text(line, "ascii"));
}

function cmdLs(_args, _ctx) {
  return [text(Object.keys(FILES).join("  "))];
}

function cmdCat(args, ctx) {
  if (args.length === 0) return [text("usage: cat <file>", "error")];
  const target = FILES[args[0]];
  if (!target) return [text(`cat: ${args[0]}: No such file or directory`, "error")];
  return dispatchNamed(target, [], ctx);
}

function cmdSudo(_args, _ctx) {
  return [
    text("Permission denied.", "error"),
    text("This incident will be reported to /dev/null."),
  ];
}

export const COMMANDS = {
  help: { summary: "list available commands", run: cmdHelp, aliases: [] },
  about: { summary: "who is Sumit", run: cmdAbout, aliases: ["whoami"] },
  experience: { summary: "work history", run: cmdExperience, aliases: ["exp"] },
  education: { summary: "academic background", run: cmdEducation, aliases: ["edu"] },
  skills: { summary: "technical skills", run: cmdSkills, aliases: [] },
  certs: { summary: "certifications", run: cmdCerts, aliases: ["certifications"] },
  projects: { summary: "personal projects (add a name for detail)", run: cmdProjects, aliases: [] },
  contact: { summary: "how to reach Sumit", run: cmdContact, aliases: [] },
  resume: { summary: "open/download resume PDF", run: cmdResume, aliases: [] },
  clear: { summary: "clear the screen", run: cmdClear, aliases: ["cls"] },
  banner: { summary: "replay intro banner", run: cmdBanner, aliases: [] },
  ls: { summary: "list sections (alias)", run: cmdLs, aliases: [] },
  cat: { summary: "cat <file> — alias for section commands", run: cmdCat, aliases: [] },
  sudo: { summary: "", run: cmdSudo, aliases: [], hidden: true },
};

function resolveCommand(name) {
  if (COMMANDS[name]) return name;
  for (const [key, def] of Object.entries(COMMANDS)) {
    if (def.aliases.includes(name)) return key;
  }
  return null;
}

function dispatchNamed(name, args, ctx) {
  const resolved = resolveCommand(name);
  if (!resolved) {
    return [
      text(`command not found: ${name}`, "error"),
      text("Type `help` to see available commands."),
    ];
  }
  try {
    return COMMANDS[resolved].run(args, ctx) || [];
  } catch (err) {
    return [text(`error running '${name}': ${err.message}`, "error")];
  }
}

export function dispatch(line, ctx) {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const [name, ...args] = trimmed.split(/\s+/);
  return dispatchNamed(name.toLowerCase(), args, ctx);
}

export function completions(partial) {
  if (!partial) return [];
  const names = new Set();
  for (const [key, def] of Object.entries(COMMANDS)) {
    if (def.hidden) continue;
    if (key.startsWith(partial)) names.add(key);
    for (const alias of def.aliases) {
      if (alias.startsWith(partial)) names.add(alias);
    }
  }
  return Array.from(names).sort();
}
