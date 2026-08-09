// Minimal YAML dumper for the `-o yaml` output flag. Not a general-purpose
// serializer — just enough to render this site's plain objects/arrays of
// strings/numbers the way a real CLI's `-o yaml` would.

function needsQuoting(str) {
  return (
    str === "" ||
    /^\s|\s$/.test(str) ||
    /: |:$/.test(str) ||
    /\s#/.test(str) ||
    /^[-?:,[\]{}&*!|>'"%@`]/.test(str) ||
    /\n/.test(str)
  );
}

function scalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const str = String(value);
  if (!needsQuoting(str)) return str;
  return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function toYaml(value, indent = 0) {
  const pad = "  ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        if (item !== null && typeof item === "object") {
          const nested = toYaml(item, indent + 1);
          return nested.replace(new RegExp(`^${pad}  `), `${pad}- `);
        }
        return `${pad}- ${scalar(item)}`;
      })
      .join("\n");
  }

  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return `${pad}{}`;
    return keys
      .map((k) => {
        const v = value[k];
        if (Array.isArray(v)) {
          return v.length === 0 ? `${pad}${k}: []` : `${pad}${k}:\n${toYaml(v, indent + 1)}`;
        }
        if (v !== null && typeof v === "object") {
          return Object.keys(v).length === 0 ? `${pad}${k}: {}` : `${pad}${k}:\n${toYaml(v, indent + 1)}`;
        }
        return `${pad}${k}: ${scalar(v)}`;
      })
      .join("\n");
  }

  return `${pad}${scalar(value)}`;
}
