export type DocumentFile = { kind: "pdf"; path: string; url: string; pages: number };
export type HomeEntry = { kind: "directory"; path: string } | DocumentFile;
export type ShellState = { cwd: string; previous: string };
export const initialShell: ShellState = { cwd: "/", previous: "/" };
const home = "/Users/ardatas";
export const commands = "ls [folder]   cd [folder]   pwd\nopen file.pdf   xdg-open file.pdf   ./file.pdf\nhelp   clear";
export const promptFor = (cwd: string) =>
  `(base) ardatas@Ardas-MacBook-Pro ${cwd === "/" ? "~" : cwd.split("/").pop()} %`;

function words(line: string) {
  const args: string[] = [];
  let word = "", quote = "", started = false, escape = false;
  for (const char of line) {
    if (escape) { word += char; escape = false; }
    else if (char === "\\" && quote !== "'") { escape = true; started = true; }
    else if (quote) { if (char === quote) quote = ""; else word += char; }
    else if (char === "'" || char === '"') { quote = char; started = true; }
    else if (/\s/.test(char)) {
      if (started) args.push(word);
      word = ""; started = false;
    } else { word += char; started = true; }
  }
  if (escape || quote) return null;
  if (started) args.push(word);
  return args;
}

function lookup(files: HomeEntry[], cwd: string, operand: string): HomeEntry | undefined {
  const root = { path: "/", kind: "directory" } as const;
  const path = operand.replace(/^~(?=\/|$)|^\/Users\/ardatas(?=\/|$)/, "") || "/";
  let current = operand.startsWith("/") || operand === "~" || operand.startsWith("~/") ? "/" : cwd;
  let entry: HomeEntry | undefined = current === "/" ? root : files.find(f => f.path === current);
  for (const part of path.split("/").filter(Boolean)) {
    if (entry?.kind !== "directory") return;
    if (part === ".") continue;
    current = part === ".." ? current.slice(0, current.lastIndexOf("/")) || "/" : (current === "/" ? "" : current) + "/" + part;
    entry = current === "/" ? root : files.find(f => f.path === current);
  }
  if (operand.endsWith("/") && entry?.kind !== "directory") return;
  return entry;
}

export interface ShellResult extends ShellState {
  output: string;
  document?: DocumentFile;
  clear?: boolean;
}

export function execute(files: HomeEntry[], state: ShellState, line: string): ShellResult {
  const result = (output: string): ShellResult => ({ ...state, output });
  const args = words(line);
  if (!args) return result("Unclosed quote or trailing backslash.");
  if (!args.length) return result("");
  const [command, operand] = args;
  const direct = command.startsWith("./") && command.toLowerCase().endsWith(".pdf");
  if (args.length > 2 || (direct && args.length !== 1)) return result("Expected one path. Quote names that contain spaces.");
  if (operand !== undefined && ["help", "clear", "pwd"].includes(command)) return result(`Usage: ${command}`);
  if (command === "help") return result(commands);
  if (command === "clear") return { ...result(""), clear: true };
  if (command === "pwd") return result(home + (state.cwd === "/" ? "" : state.cwd));
  if (!direct && !["cd", "ls", "open", "xdg-open"].includes(command)) return result(`Command not found: ${command}. Type help for commands.`);
  if (!direct && command !== "cd" && command !== "ls" && !operand) return result(`Usage: ${command} file.pdf`);
  const target = direct ? command : operand ?? (command === "cd" ? "~" : ".");
  const entry = lookup(files, state.cwd, command === "cd" && target === "-" ? state.previous : target);
  if (!entry) return result(`No such file or directory: ${target}`);
  if (command === "ls") {
    if (entry.kind === "pdf") return result(entry.path.split("/").pop()!);
    const prefix = entry.path === "/" ? "/" : entry.path + "/";
    return result(files.filter(f => f.path.startsWith(prefix) && !f.path.slice(prefix.length).includes("/"))
      .map(f => f.path.slice(prefix.length) + (f.kind === "directory" ? "/" : "")).join("  "));
  }
  if (command === "cd") {
    if (entry.kind !== "directory") return result(`Not a directory: ${target}`);
    return { ...result(""), previous: state.cwd, cwd: entry.path };
  }
  if (entry.kind === "directory") return result(`Use cd to enter ${target}.`);
  return { ...result(""), document: entry };
}
