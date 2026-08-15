// Command registry, parser, and dispatcher. Handlers only ever read from
// ctx.content (content.js) and return output blocks — no direct DOM access,
// so this file stays testable/editable independent of terminal.js.

import { buildNeofetchBlocks } from "./neofetch.js";
import { toYaml } from "./yaml.js";
import { THEMES } from "./theme.js";
import { buildCowsay, randomQuote, buildLolcat, buildFiglet, buildToiletBox } from "./eastereggs.js";

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

// Not listed by `ls` — undocumented, only reachable if you already know to
// try them, same spirit as the other hidden commands below.
const HIDDEN_FILES = {
  "/etc/os-release": "os-release",
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

// Below this, padded columns stop having room to breathe — matches the
// .mobile-controls breakpoint in terminal.css.
function isNarrow() {
  return window.innerWidth <= 640;
}

// Pulls `-o <format>` / `--output <format>` out of an args list, wherever it
// appears, and returns the remaining positional args separately — so e.g.
// `projects stratusfleet -o json` and `projects -o json stratusfleet` both work.
function extractOutputFlag(args) {
  const rest = [];
  let format = null;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-o" || args[i] === "--output") && i + 1 < args.length) {
      format = args[i + 1].toLowerCase();
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { format, rest };
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
    // Plain text (wraps) rather than a no-wrap table row: the summary is
    // prose, not a data column, so on narrow screens it should wrap instead
    // of forcing a horizontal scrollbar.
    out.push(text(`  ${name.padEnd(12)} ${def.summary}`));
  }
  out.push(blank());
  out.push(text("Tip: use Tab to autocomplete, Up/Down to browse history.", "muted"));
  out.push(text("Tip: most data commands support `-o json` / `-o yaml` for raw output.", "muted"));
  return out;
}

// Real `apropos <keyword>` greps man page NAME sections; this greps command
// names/summaries/aliases instead. References COMMANDS below — fine, since
// this only runs after the module (and COMMANDS) has finished loading, same
// as resolveCommand/dispatchNamed further down this file.
function cmdApropos(args, ctx) {
  const keyword = args.join(" ").trim().toLowerCase();
  if (!keyword) return [text("usage: apropos <keyword>", "error")];
  const matches = Object.entries(COMMANDS).filter(
    ([name, def]) =>
      !def.hidden &&
      (name.includes(keyword) ||
        def.summary.toLowerCase().includes(keyword) ||
        def.aliases.some((a) => a.includes(keyword)))
  );
  if (matches.length === 0) return [text(`${keyword}: nothing appropriate.`, "muted")];
  return matches.map(([name, def]) => text(`${name.padEnd(14)} - ${def.summary || name}`));
}

function cmdAbout(_args, ctx) {
  const { meta, summary } = ctx.content;
  return [...heading(`${meta.name} — ${meta.title}`), blank(), text(summary)];
}
function dataAbout(_args, ctx) {
  const { name, title, yearsExperience } = ctx.content.meta;
  return { name, title, yearsExperience, summary: ctx.content.summary };
}

// Experience/education deliberately aren't rendered as a single 3-column table:
// company/school names are long enough (40+ chars) that a shared column width
// across all rows pushes PERIOD off the edge of any reasonably sized terminal.
// Instead, only role+period (both short) share a column so they align down
// the list, and the long field gets its own line. Even that pairing is too
// wide for a phone screen, though, so on narrow viewports it drops the
// padding entirely and stacks role/period on separate lines.
function cmdExperience(_args, ctx) {
  const jobs = ctx.content.experience;
  const narrow = isNarrow();
  const roleWidth = narrow ? 0 : Math.max(...jobs.map((j) => j.role.length));
  const out = [...heading("Experience")];
  for (const job of jobs) {
    out.push(blank());
    if (narrow) {
      out.push(row(job.role, "subheading"));
      out.push(text(job.period, "muted"));
    } else {
      out.push(row(`${job.role.padEnd(roleWidth)}  ${job.period}`, "subheading"));
    }
    out.push(text(job.company, "muted"));
    for (const b of job.bullets) out.push(text(`  - ${b}`));
  }
  return out;
}
function dataExperience(_args, ctx) {
  return ctx.content.experience;
}

function cmdEducation(_args, ctx) {
  const edu = ctx.content.education;
  const narrow = isNarrow();
  const degreeWidth = narrow ? 0 : Math.max(...edu.map((e) => e.degree.length));
  const out = [...heading("Education")];
  for (const e of edu) {
    out.push(blank());
    if (narrow) {
      out.push(row(e.degree, "subheading"));
      out.push(text(e.period, "muted"));
    } else {
      out.push(row(`${e.degree.padEnd(degreeWidth)}  ${e.period}`, "subheading"));
    }
    out.push(text(e.school, "muted"));
  }
  return out;
}
function dataEducation(_args, ctx) {
  return ctx.content.education;
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
function dataSkills(_args, ctx) {
  return ctx.content.skills;
}

function cmdCerts(_args, ctx) {
  const rows = ctx.content.certifications;
  const out = [...heading("Certifications"), blank()];

  if (isNarrow()) {
    for (const c of rows) {
      out.push(text(c.name, "subheading"));
      out.push(
        html(
          `${ctx.escapeHtml(c.date)} — ` +
            `<a href="${ctx.escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">verify</a>`,
          "muted"
        )
      );
      out.push(blank());
    }
    out.pop();
    return out;
  }

  const widths = colWidths(rows.map((c) => [c.date, c.name]), 2);
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
function dataCerts(_args, ctx) {
  return ctx.content.certifications;
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
function dataProjects(args, ctx) {
  const projects = ctx.content.projects;
  if (args.length === 0) return projects;
  const slug = args[0].toLowerCase();
  const project = projects.find((p) => p.slug === slug);
  if (!project) throw new Error(`projects: no such project '${args[0]}'`);
  return project;
}

function cmdContact(_args, ctx) {
  const c = ctx.content.contact;
  return [
    ...heading("Contact"),
    blank(),
    html(`Email:    <a href="mailto:${ctx.escapeHtml(c.email)}">${ctx.escapeHtml(c.email)}</a>`),
    html(`LinkedIn: <a href="${ctx.escapeHtml(c.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${ctx.escapeHtml(c.linkedin)}</a>`),
    html(`GitHub:   <a href="${ctx.escapeHtml(c.githubUrl)}" target="_blank" rel="noopener noreferrer">${ctx.escapeHtml(c.github)}</a>`),
    blank(),
    text("Run `mail` to send a message directly.", "muted"),
  ];
}
function dataContact(_args, ctx) {
  const { email, linkedin, linkedinUrl, github, githubUrl } = ctx.content.contact;
  return { email, linkedin, linkedinUrl, github, githubUrl };
}

function cmdMail(_args, ctx) {
  ctx.renderMailForm();
  return [];
}

function cmdResume(_args, _ctx) {
  window.open("resume.pdf", "_blank", "noopener,noreferrer");
  return [text("Opening resume.pdf in a new tab...")];
}

function cmdClear(_args, ctx) {
  ctx.clearOutput();
  return [];
}

function cmdBanner(_args, ctx) {
  return buildNeofetchBlocks(ctx.content);
}

function cmdLs(_args, _ctx) {
  return [text(Object.keys(FILES).join("  "))];
}

function cmdCat(args, ctx) {
  if (args.length === 0) return [text("usage: cat <file>", "error")];
  const target = FILES[args[0]] || HIDDEN_FILES[args[0]];
  if (!target) return [text(`cat: ${args[0]}: No such file or directory`, "error")];
  return dispatchNamed(target, args.slice(1), ctx);
}

function cmdOsRelease(_args, ctx) {
  const { yearsExperience } = ctx.content.meta;
  const lines = [
    `NAME="SumitOS"`,
    `VERSION="${yearsExperience}.0 (SRE Edition)"`,
    `ID=sumitos`,
    `ID_LIKE=devops`,
    `VERSION_ID="${yearsExperience}.0"`,
    `PRETTY_NAME="SumitOS ${yearsExperience}.0 (SRE Edition)"`,
    `ANSI_COLOR="0;36"`,
    `HOME_URL="https://logtailer.github.io/"`,
    `SUPPORT_URL="mailto:${ctx.content.contact.email}"`,
    `LOGO=terminal`,
  ];
  return lines.map((l) => text(l, "muted"));
}

function cmdTheme(args, ctx) {
  if (args.length === 0) {
    const out = [...heading("Themes"), text(`Current: ${ctx.getTheme()}`, "muted"), blank()];
    for (const [key, def] of Object.entries(THEMES)) {
      out.push(text(`  ${key.padEnd(12)} ${def.label}`));
    }
    out.push(blank());
    out.push(text("Usage: theme <name>", "muted"));
    return out;
  }
  const name = args[0].toLowerCase();
  if (!ctx.setTheme(name)) {
    return [
      text(`theme: no such theme '${args[0]}'`, "error"),
      text(`Available: ${Object.keys(THEMES).join(", ")}`),
    ];
  }
  return [text(`Theme switched to ${THEMES[name].label}.`, "muted")];
}

function cmdSudo(_args, _ctx) {
  return [
    text("Permission denied.", "error"),
    text("This incident will be reported to /dev/null."),
  ];
}

// Traps the terminal in a fake modal edit session until :wq/:x/:q! is typed
// — the classic "how do I exit vim" joke. Actual keystroke interception
// happens in main.js (ctx.enterVimMode); this just renders the fake buffer.
function cmdVim(_args, ctx) {
  ctx.enterVimMode();
  return [
    text("~", "muted"),
    text("~", "muted"),
    text("~", "muted"),
    text("~", "muted"),
    text("~", "muted"),
    text("~", "muted"),
    blank(),
    text('"resume.txt" [New File]', "muted"),
  ];
}

function kubectlGetPods(ctx) {
  const projects = ctx.content.projects;
  const age = `${ctx.content.meta.yearsExperience}y`;

  // Same reasoning as certs/experience/education: a NAME + READY + STATUS +
  // RESTARTS + AGE row is wider than a phone screen once padded, so stack
  // instead of clipping into a horizontal-scroll table there.
  if (isNarrow()) {
    const out = [];
    for (const p of projects) {
      out.push(row(p.name, "subheading"));
      out.push(text(`  Running   0 restarts   ${age}`, "muted"));
    }
    return out;
  }

  const widths = colWidths(projects.map((p) => [p.name]), 1);
  const out = [head(`${"NAME".padEnd(widths[0])}  READY   STATUS    RESTARTS   AGE`)];
  for (const p of projects) {
    out.push(row(`${p.name.padEnd(widths[0])}  1/1     Running   0          ${age}`));
  }
  return out;
}

function kubectlDescribe(slug, ctx) {
  if (!slug) {
    return [
      text("error: describe: you must specify the type and name", "error"),
      text("Run `kubectl get pods` to list names, then `kubectl describe <name>`.", "muted"),
    ];
  }
  const projects = ctx.content.projects;
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) {
    return [text(`Error from server (NotFound): pods "${slug}" not found`, "error")];
  }
  const project = projects[index];
  const age = `${ctx.content.meta.yearsExperience}y`;

  // Plain wrapping lines rather than a padded table — describe output is
  // prose-length (taglines, project details), not fixed-width columns, so
  // it should wrap on narrow screens instead of needing its own isNarrow
  // branch the way the get-pods table does.
  const out = [
    text(`Name:         ${project.name}`),
    text(`Namespace:    portfolio`),
    text(`Node:         portfolio-node-1/10.0.0.4`),
    text(`Start Time:   ${age} ago`),
    text(`Labels:       app=${project.slug},tier=personal-project`),
    text(`Annotations:  description: ${project.tagline}`),
    text(`Status:       Running`),
    text(`IP:           10.244.0.${(index + 1) * 10}`),
    blank(),
    text(`Containers:`),
    text(`  ${project.slug}:`),
    text(`    Image:          ghcr.io/logtailer/${project.slug}:latest`),
    text(`    State:          Running`),
    text(`    Ready:          True`),
    text(`    Restart Count:  0`),
    blank(),
    text(`Conditions:`),
    text(`  Type              Status`),
    text(`  Initialized       True`),
    text(`  Ready             True`),
    text(`  ContainersReady   True`),
    text(`  PodScheduled      True`),
    blank(),
    text(`Events:`),
    text(`  Type    Reason    Age   From               Message`),
    text(`  ----    ------    ----  ----               -------`),
    text(`  Normal  Scheduled ${age}   default-scheduler  Successfully assigned portfolio/${project.slug} to portfolio-node-1`),
  ];
  for (const detail of project.details) {
    out.push(text(`  Normal  Shipped   ${age}   sumit               ${detail}`));
  }
  return out;
}

function cmdKubectl(args, ctx) {
  const [sub, ...rest] = args;
  const subLower = (sub || "").toLowerCase();

  if (subLower === "get") {
    const target = rest.join(" ").toLowerCase();
    if (target !== "pods" && target !== "pod") {
      return [text(`error: the server doesn't have a resource type "${rest.join(" ")}"`, "error")];
    }
    return kubectlGetPods(ctx);
  }

  if (subLower === "describe") {
    // Accepts both `describe <name>` and the more idiomatic `describe pod <name>`.
    const podArgs = rest[0]?.toLowerCase() === "pod" || rest[0]?.toLowerCase() === "pods" ? rest.slice(1) : rest;
    return kubectlDescribe((podArgs[0] || "").toLowerCase(), ctx);
  }

  return [
    text(`error: kubectl: unknown command "${args.join(" ")}"`, "error"),
    text("Try `kubectl get pods` or `kubectl describe <name>`.", "muted"),
  ];
}

function cmdChaosMonkey(_args, ctx) {
  ctx.triggerChaos();
  return [
    text("🐒 Chaos Monkey unleashed — terminating a random pod...", "error"),
    text("AWS FIS experiment fault_injection-01 started.", "muted"),
  ];
}

function cmdSl(_args, ctx) {
  ctx.runTrain();
  return [];
}

function cmdCowsay(args, ctx) {
  return buildCowsay(args.join(" ")).map((line) => text(line, "art"));
}

function cmdFortune(_args, _ctx) {
  return [text(randomQuote(), "subheading")];
}

function cmdPoweroff(_args, ctx) {
  ctx.powerOff();
  return [text("Powering off... (press any key to power back on)", "muted")];
}

function cmdFiglet(args, ctx) {
  const value = args.join(" ").trim() || ctx.content.meta.name;
  return buildFiglet(value).map((line) => text(line, "art"));
}

function cmdLolcat(args, ctx) {
  return [html(buildLolcat(args.join(" "), ctx.escapeHtml))];
}

function cmdToilet(args, ctx) {
  const value = args.join(" ").trim() || ctx.content.meta.name;
  return buildToiletBox(value, ctx.escapeHtml).map((row) => html(row, "art"));
}

export const COMMANDS = {
  help: { summary: "list available commands", run: cmdHelp, aliases: [] },
  apropos: { summary: "apropos <keyword> — search command descriptions", run: cmdApropos, aliases: [] },
  about: { summary: "who is Sumit", run: cmdAbout, aliases: ["whoami"], data: dataAbout },
  experience: { summary: "work history", run: cmdExperience, aliases: ["exp"], data: dataExperience },
  education: { summary: "academic background", run: cmdEducation, aliases: ["edu"], data: dataEducation },
  skills: { summary: "technical skills", run: cmdSkills, aliases: [], data: dataSkills },
  certs: { summary: "certifications", run: cmdCerts, aliases: ["certifications"], data: dataCerts },
  projects: { summary: "personal projects (add a name for detail)", run: cmdProjects, aliases: [], data: dataProjects },
  contact: { summary: "how to reach Sumit", run: cmdContact, aliases: [], data: dataContact },
  mail: { summary: "send Sumit a message (opens your email client)", run: cmdMail, aliases: ["email"] },
  resume: { summary: "open/download resume PDF", run: cmdResume, aliases: [] },
  clear: { summary: "clear the screen", run: cmdClear, aliases: ["cls"] },
  banner: { summary: "replay the system info banner", run: cmdBanner, aliases: ["neofetch"] },
  theme: { summary: "switch color theme (try: theme powershell)", run: cmdTheme, aliases: [] },
  ls: { summary: "list sections (alias)", run: cmdLs, aliases: [] },
  cat: { summary: "cat <file> — alias for section commands", run: cmdCat, aliases: [] },
  sudo: { summary: "", run: cmdSudo, aliases: [], hidden: true },
  vim: { summary: "", run: cmdVim, aliases: ["vi"], hidden: true },
  kubectl: { summary: "get pods / describe <name> (real k8s energy, fake cluster)", run: cmdKubectl, aliases: [] },
  "chaos-monkey": { summary: "unleash chaos engineering on this terminal", run: cmdChaosMonkey, aliases: ["chaos"] },
  sl: { summary: "", run: cmdSl, aliases: [], hidden: true },
  cowsay: { summary: "cowsay <message>", run: cmdCowsay, aliases: [] },
  fortune: { summary: "random SRE/on-call wisdom", run: cmdFortune, aliases: ["quote"] },
  poweroff: { summary: "power off the terminal (any key restores it)", run: cmdPoweroff, aliases: [] },
  "os-release": { summary: "", run: cmdOsRelease, aliases: [], hidden: true },
  figlet: { summary: "figlet <text> — print it big", run: cmdFiglet, aliases: [] },
  toilet: { summary: "toilet <text> — print it big and loud", run: cmdToilet, aliases: [] },
  lolcat: { summary: "lolcat <text> — rainbow it", run: cmdLolcat, aliases: [] },
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
  const def = COMMANDS[resolved];
  const { format, rest } = extractOutputFlag(args);

  if (format) {
    if (!def.data) {
      return [text(`${name}: -o is not supported for this command`, "error")];
    }
    if (format !== "json" && format !== "yaml") {
      return [text(`${name}: unsupported output format '${format}' (use json or yaml)`, "error")];
    }
    try {
      const value = def.data(rest, ctx);
      const serialized = format === "json" ? JSON.stringify(value, null, 2) : toYaml(value);
      return serialized.split("\n").map((line) => text(line));
    } catch (err) {
      return [text(err.message, "error")];
    }
  }

  try {
    return def.run(rest, ctx) || [];
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
