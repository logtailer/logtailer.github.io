// Command registry, parser, and dispatcher. Most handlers live in
// handlers.js (pure ctx.content renderers); the few that need direct
// access to the COMMANDS registry itself — help, apropos, cat, man — stay
// here instead, since importing COMMANDS into handlers.js would create a
// circular import (commands.js already imports handlers.js).

import { text, blank, heading, extractOutputFlag } from "./format.js";
import { toYaml } from "./yaml.js";
import * as handlers from "./handlers.js";

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
  out.push(text("Tip: `man <command>` for details, `apropos <keyword>` to search.", "muted"));
  return out;
}

// Real `apropos <keyword>` greps man page NAME sections; this greps command
// names/summaries/aliases instead.
function cmdApropos(args, _ctx) {
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

function cmdCat(args, ctx) {
  if (args.length === 0) return [text("usage: cat <file>", "error")];
  const target = handlers.FILES[args[0]] || handlers.HIDDEN_FILES[args[0]];
  if (!target) return [text(`cat: ${args[0]}: No such file or directory`, "error")];
  return dispatchNamed(target, args.slice(1), ctx);
}

// Longer, hand-written write-ups for the commands worth explaining beyond
// their one-line help summary. Anything without an entry here falls back to
// a synthesized DESCRIPTION built from the command's summary.
const MANPAGES = {
  kubectl: {
    synopsis: "kubectl get pods | kubectl describe <name>",
    description: [
      "A tiny, entirely fake Kubernetes control plane fronting Sumit's real",
      "personal projects. `get pods` lists them as Running pods; `describe`",
      "renders a full kubectl-describe-pod block, with the project's actual",
      "tagline as the description annotation and its highlights as events.",
      "No real cluster was harmed in the making of this command.",
    ],
  },
  "chaos-monkey": {
    synopsis: "chaos-monkey",
    description: [
      "Simulates Netflix's Chaos Monkey terminating a random pod. Glitches",
      "the screen for a couple of seconds, then self-heals and reports back",
      "with a fake SLA number — that's the whole point of chaos engineering:",
      "things break, and you find out before customers do.",
    ],
  },
  sl: {
    synopsis: "sl",
    description: [
      "Steam Locomotive. What you get for mistyping `ls`. A train enters",
      "from the left and chugs off the right edge of the screen. Does",
      "nothing useful, which is the point.",
    ],
  },
  cowsay: {
    synopsis: "cowsay [message]",
    description: ["An ASCII cow says whatever you tell it to. Deploys attitude, not code."],
  },
  fortune: {
    synopsis: "fortune",
    description: ["Prints a random piece of on-call/SRE wisdom. Alias: quote."],
  },
  dadjoke: {
    synopsis: "dadjoke",
    description: ["Prints a random SRE-flavored dad joke. Groaning is the expected reaction, not a bug."],
  },
  figlet: {
    synopsis: "figlet <text>",
    description: [
      "Renders text as block letters using a small hand-authored 5x5",
      "dot-matrix font — real ASCII art, not just a bigger font-size.",
    ],
  },
  toilet: {
    synopsis: "toilet <text>",
    description: ["Like figlet, but boxed and run through a rainbow filter, because why not."],
  },
  lolcat: {
    synopsis: "lolcat <text>",
    description: ["Colors text one hue per character, cycling around the color wheel."],
  },
  mail: {
    synopsis: "mail",
    description: [
      "Opens an inline form that builds a mailto: link — no third-party form",
      "backend, no signup, nothing leaves your browser until you hit send.",
    ],
  },
  theme: {
    synopsis: "theme [name]",
    description: ["Switches the site's color scheme. Run with no arguments to see what's available."],
  },
  apropos: {
    synopsis: "apropos <keyword>",
    description: ["Greps every command's name, summary, and aliases for a keyword. Like man -k, but tiny."],
  },
  ping: {
    synopsis: "ping <host>",
    description: ["Simulates ICMP echo requests. Give it a project slug for a friendlier reply."],
  },
  traceroute: {
    synopsis: "traceroute <host>",
    description: ["Hops through a handful of fake infrastructure nodes on the way to... the cloud. Obviously."],
  },
  top: {
    synopsis: "top",
    description: ["A live-ish look at what's actually consuming cycles around here."],
  },
  history: {
    synopsis: "history",
    description: ["Lists every command run this session, in order — same idea as the real shell builtin."],
  },
  kbd: {
    synopsis: "(not a command)",
    description: ["Try the Konami code — ↑ ↑ ↓ ↓ ← → ← → B A — and see what happens."],
  },
};

function cmdMan(args, ctx) {
  const name = (args[0] || "").toLowerCase();
  if (!name) return [text("What manual page do you want?", "error"), text("Usage: man <command>", "muted")];
  const resolved = resolveCommand(name);
  if (!resolved) return [text(`No manual entry for ${name}`, "error")];
  const def = COMMANDS[resolved];
  const custom = MANPAGES[resolved];
  const out = [
    text(`${resolved.toUpperCase()}(1)`, "heading"),
    blank(),
    text("NAME", "subheading"),
    text(`    ${resolved} - ${def.summary || "no summary available"}`),
    blank(),
    text("SYNOPSIS", "subheading"),
    text(`    ${custom?.synopsis || resolved}`),
    blank(),
    text("DESCRIPTION", "subheading"),
  ];
  const desc = custom?.description || [def.summary || `Run \`${resolved}\` to see it in action.`];
  for (const line of desc) out.push(text(`    ${line}`));
  if (def.aliases.length) {
    out.push(blank());
    out.push(text("ALIASES", "subheading"));
    out.push(text(`    ${def.aliases.join(", ")}`));
  }
  return out;
}

export const COMMANDS = {
  help: { summary: "list available commands", run: cmdHelp, aliases: [] },
  apropos: { summary: "apropos <keyword> — search command descriptions", run: cmdApropos, aliases: [] },
  man: { summary: "man <command> — read the full manual entry", run: cmdMan, aliases: [] },
  history: { summary: "list commands run this session", run: handlers.cmdHistory, aliases: [] },
  about: { summary: "who is Sumit", run: handlers.cmdAbout, aliases: ["whoami"], data: handlers.dataAbout },
  experience: { summary: "work history", run: handlers.cmdExperience, aliases: ["exp"], data: handlers.dataExperience },
  education: { summary: "academic background", run: handlers.cmdEducation, aliases: ["edu"], data: handlers.dataEducation },
  skills: { summary: "technical skills", run: handlers.cmdSkills, aliases: [], data: handlers.dataSkills },
  certs: { summary: "certifications", run: handlers.cmdCerts, aliases: ["certifications"], data: handlers.dataCerts },
  projects: { summary: "personal projects (add a name for detail)", run: handlers.cmdProjects, aliases: [], data: handlers.dataProjects },
  contact: { summary: "how to reach Sumit", run: handlers.cmdContact, aliases: [], data: handlers.dataContact },
  mail: { summary: "send Sumit a message (opens your email client)", run: handlers.cmdMail, aliases: ["email"] },
  resume: { summary: "open/download resume PDF", run: handlers.cmdResume, aliases: [] },
  clear: { summary: "clear the screen", run: handlers.cmdClear, aliases: ["cls"] },
  banner: { summary: "replay the system info banner", run: handlers.cmdBanner, aliases: ["neofetch"] },
  theme: { summary: "switch color theme (try: theme powershell)", run: handlers.cmdTheme, aliases: [] },
  ls: { summary: "list sections (alias)", run: handlers.cmdLs, aliases: [] },
  cat: { summary: "cat <file> — alias for section commands", run: cmdCat, aliases: [] },
  sudo: { summary: "", run: handlers.cmdSudo, aliases: [], hidden: true },
  vim: { summary: "", run: handlers.cmdVim, aliases: ["vi"], hidden: true },
  kubectl: { summary: "get pods / describe <name> (real k8s energy, fake cluster)", run: handlers.cmdKubectl, aliases: [] },
  "chaos-monkey": { summary: "unleash chaos engineering on this terminal", run: handlers.cmdChaosMonkey, aliases: ["chaos"] },
  sl: { summary: "", run: handlers.cmdSl, aliases: [], hidden: true },
  cowsay: { summary: "cowsay <message>", run: handlers.cmdCowsay, aliases: [] },
  fortune: { summary: "random SRE/on-call wisdom", run: handlers.cmdFortune, aliases: ["quote"] },
  dadjoke: { summary: "a random SRE dad joke", run: handlers.cmdDadjoke, aliases: ["joke"] },
  poweroff: { summary: "power off the terminal (any key restores it)", run: handlers.cmdPoweroff, aliases: [] },
  "os-release": { summary: "", run: handlers.cmdOsRelease, aliases: [], hidden: true },
  figlet: { summary: "figlet <text> — print it big", run: handlers.cmdFiglet, aliases: [] },
  toilet: { summary: "toilet <text> — print it big and loud", run: handlers.cmdToilet, aliases: [] },
  lolcat: { summary: "lolcat <text> — rainbow it", run: handlers.cmdLolcat, aliases: [] },
  top: { summary: "what's eating the CPU right now", run: handlers.cmdTop, aliases: [] },
  ping: { summary: "ping <host> — try a project name", run: handlers.cmdPing, aliases: [] },
  traceroute: { summary: "traceroute <host> — hops to the cloud", run: handlers.cmdTraceroute, aliases: ["tracert"] },
  rm: { summary: "", run: handlers.cmdRm, aliases: [], hidden: true },
  su: { summary: "", run: handlers.cmdSu, aliases: [], hidden: true },
  exit: { summary: "", run: handlers.cmdExit, aliases: ["logout", "quit"], hidden: true },
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
  const { format, rest, error } = extractOutputFlag(args);
  if (error) return [text(error, "error")];

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
