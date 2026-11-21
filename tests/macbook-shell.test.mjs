import assert from "node:assert/strict";
import test from "node:test";
import { execute, initialShell } from "../lib/macbook-shell.ts";

const pdf = { kind: "pdf", path: "/Documents/My Notes.pdf", url: "/example", pages: 2 };
const files = [{ kind: "directory", path: "/Documents" }, pdf];

test("navigate from home, including absolute, parent and previous paths", () => {
  assert.equal(execute(files, initialShell, "ls").output, "Documents/");
  const docs = execute(files, initialShell, "cd ~/Documents");
  assert.equal(docs.cwd, "/Documents");
  assert.equal(execute(files, docs, "pwd").output, "/Users/ardatas/Documents");
  assert.equal(execute(files, docs, "ls").output, "My Notes.pdf");
  const home = execute(files, docs, "cd ..");
  assert.equal(execute(files, home, "cd -").cwd, docs.cwd);
  assert.equal(execute(files, home, "cd /Users/ardatas/Documents").cwd, docs.cwd);
});

test("the three open forms resolve quoted and escaped filenames to the indexed PDF", () => {
  const docs = execute(files, initialShell, "cd Documents");
  for (const line of ['open "My Notes.pdf"', "xdg-open My\\ Notes.pdf", "./'My Notes.pdf'"]) {
    assert.deepEqual(execute(files, docs, line).document, pdf);
  }
});

test("invalid commands and paths preserve the working directory", () => {
  for (const line of ['cd "Documents/My Notes.pdf"', "cd missing/../Documents", "open missing.pdf", 'open "unfinished', "rm Documents"]) {
    const result = execute(files, initialShell, line);
    assert.ok(result.output);
    assert.equal(result.cwd, "/");
    assert.equal(result.document, undefined);
  }
});
