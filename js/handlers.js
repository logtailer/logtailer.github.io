// Command handlers that only ever read from ctx.content/ctx.escapeHtml/ctx
// capabilities and return output blocks — no direct DOM access, no
// knowledge of the COMMANDS registry itself. The handful of commands that
// DO need the registry (help, apropos, cat, man) live in commands.js
// instead, to avoid a circular import back into this file.

import { text, html, blank, heading, subheading, row, head, colWidths, padCols, isNarrow, columnize } from "./format.js";
import { buildNeofetchBlocks } from "./neofetch.js";
import { THEMES } from "./theme.js";
import {
  buildCowsay,
  randomQuote,
  randomDadJoke,
  buildLolcat,
  buildFiglet,
  buildToiletBox,
  fakeProcesses,
  buildPing,
  buildTraceroute,
} from "./eastereggs.js";
import * as history from "./history.js";

// Listed by `ls` — the "filesystem" cmdCat resolves against.
export const FILES = {
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
export const HIDDEN_FILES = {
  "/etc/os-release": "os-release",
};

export function cmdAbout(_args, ctx) {
  const { meta, summary } = ctx.content;
  return [...heading(`${meta.name} — ${meta.title}`), blank(), text(summary)];
}
export function dataAbout(_args, ctx) {
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
export function cmdExperience(_args, ctx) {
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
export function dataExperience(_args, ctx) {
  return ctx.content.experience;
}

export function cmdEducation(_args, ctx) {
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
export function dataEducation(_args, ctx) {
  return ctx.content.education;
}

export function cmdSkills(_args, ctx) {
  const s = ctx.content.skills;
  const groups = [
    ["Core", s.core],
    ["Observability", s.observability],
    ["Platform", s.platform],
  ];
  // Fewer columns on narrow viewports so the grid doesn't clip the longer
  // skill names (matches the .mobile-controls breakpoint in terminal.css).
  const columns = isNarrow() ? 2 : 3;
  const out = [...heading("Skills")];
  for (const [label, items] of groups) {
    out.push(blank());
    out.push(subheading(label));
    out.push(...columnize(items, columns));
  }
  return out;
}
export function dataSkills(_args, ctx) {
  return ctx.content.skills;
}

export function cmdCerts(_args, ctx) {
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
export function dataCerts(_args, ctx) {
  return ctx.content.certifications;
}

export function cmdProjects(args, ctx) {
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
export function dataProjects(args, ctx) {
  const projects = ctx.content.projects;
  if (args.length === 0) return projects;
  const slug = args[0].toLowerCase();
  const project = projects.find((p) => p.slug === slug);
  if (!project) throw new Error(`projects: no such project '${args[0]}'`);
  return project;
}

export function cmdContact(_args, ctx) {
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
export function dataContact(_args, ctx) {
  const { email, linkedin, linkedinUrl, github, githubUrl } = ctx.content.contact;
  return { email, linkedin, linkedinUrl, github, githubUrl };
}

export function cmdMail(_args, ctx) {
  ctx.renderMailForm();
  return [];
}

export function cmdResume(_args, _ctx) {
  window.open("resume.pdf", "_blank", "noopener,noreferrer");
  return [text("Opening resume.pdf in a new tab...")];
}

export function cmdClear(_args, ctx) {
  ctx.clearOutput();
  return [];
}

export function cmdBanner(_args, ctx) {
  return buildNeofetchBlocks(ctx.content);
}

export function cmdLs(_args, _ctx) {
  return [text(Object.keys(FILES).join("  "))];
}

export function cmdOsRelease(_args, ctx) {
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

export function cmdTheme(args, ctx) {
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

export function cmdSudo(_args, _ctx) {
  return [
    text("Permission denied.", "error"),
    text("This incident will be reported to /dev/null."),
  ];
}

// Traps the terminal in a fake modal edit session until :wq/:x/:q! is typed
// — the classic "how do I exit vim" joke. Actual keystroke interception
// happens in main.js (ctx.enterVimMode); this just renders the fake buffer.
export function cmdVim(_args, ctx) {
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

export function cmdKubectl(args, ctx) {
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

export function cmdChaosMonkey(_args, ctx) {
  ctx.triggerChaos();
  return [
    text("🐒 Chaos Monkey unleashed — terminating a random pod...", "error"),
    text("AWS FIS experiment fault_injection-01 started.", "muted"),
  ];
}

export function cmdSl(_args, ctx) {
  ctx.runTrain();
  return [];
}

export function cmdCowsay(args, ctx) {
  return buildCowsay(args.join(" ")).map((line) => text(line, "art"));
}

export function cmdFortune(_args, _ctx) {
  return [text(randomQuote(), "subheading")];
}

export function cmdDadjoke(_args, _ctx) {
  return [text(randomDadJoke(), "subheading")];
}

export function cmdPoweroff(_args, ctx) {
  ctx.powerOff();
  return [text("Powering off... (press any key to power back on)", "muted")];
}

export function cmdFiglet(args, ctx) {
  const value = args.join(" ").trim() || ctx.content.meta.name;
  return buildFiglet(value).map((line) => text(line, "art"));
}

export function cmdLolcat(args, ctx) {
  return [html(buildLolcat(args.join(" "), ctx.escapeHtml))];
}

export function cmdToilet(args, ctx) {
  const value = args.join(" ").trim() || ctx.content.meta.name;
  return buildToiletBox(value, ctx.escapeHtml).map((row) => html(row, "art"));
}

export function cmdHistory(_args, _ctx) {
  const entries = history.all();
  if (entries.length === 0) return [text("(no history yet)", "muted")];
  return entries.map((line, i) => text(`  ${String(i + 1).padStart(4)}  ${line}`));
}

export function cmdRm(args, _ctx) {
  if (args.includes("-rf") && (args.includes("/") || args.includes("/*"))) {
    return [
      text("rm: it's always going to say no to this one.", "error"),
      text("Nice try. Backups exist for a reason — this isn't it.", "muted"),
    ];
  }
  const target = args[args.length - 1] || "";
  return [
    text(`rm: cannot remove '${target}': Permission denied`, "error"),
    text("This is a read-only portfolio, not a filesystem.", "muted"),
  ];
}

export function cmdSu(_args, _ctx) {
  return [text("You are already root.", "muted"), text("There is no escape.", "error")];
}

export function cmdExit(_args, _ctx) {
  return [text("You can't log out of production.", "error"), text("(closing this tab works though)", "muted")];
}

export function cmdTop(_args, ctx) {
  const now = new Date().toLocaleTimeString();
  const age = ctx.content.meta.yearsExperience;
  const processes = fakeProcesses();
  const out = [
    text(`top - ${now} up ${age} years, 1 user, load average: 0.42, 0.69, 1.00`, "muted"),
    text(`Tasks: ${processes.length} total, 1 running, ${processes.length - 1} sleeping, 0 zombie`, "muted"),
    blank(),
    head(`  PID  ${"COMMAND".padEnd(26)} %CPU  %MEM`),
  ];
  for (const p of processes) {
    out.push(
      row(`${String(p.pid).padStart(5)}  ${p.name.padEnd(26)} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)}`)
    );
  }
  return out;
}

function resolvePingTarget(args, ctx) {
  const arg = (args[0] || "").toLowerCase();
  const project = ctx.content.projects.find((p) => p.slug === arg);
  if (project) {
    const index = ctx.content.projects.indexOf(project);
    return { host: `${project.slug}.portfolio.dev`, ip: `10.244.0.${(index + 1) * 10}` };
  }
  return { host: arg, ip: "10.0.0.1" };
}

export function cmdPing(args, ctx) {
  if (!args[0]) return [text("usage: ping <host>", "error")];
  const { host, ip } = resolvePingTarget(args, ctx);
  return buildPing(host, ip).map((line) => text(line, "art"));
}

export function cmdTraceroute(args, ctx) {
  if (!args[0]) return [text("usage: traceroute <host>", "error")];
  const { host } = resolvePingTarget(args, ctx);
  return buildTraceroute(host).map((line) => text(line, "art"));
}
