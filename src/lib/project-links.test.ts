import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectLinks, validateProjectLinks } from "./project-links.ts";

test("accepts labeled HTTP(S) links and trims values", () => {
  const result = validateProjectLinks([
    { label: " GitHub ", url: " https://github.com/example/project " },
    { label: "Frontend", url: "http://localhost:5173" },
  ]);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.links.map(({ label, url }) => ({ label, url })),
    [
      { label: "GitHub", url: "https://github.com/example/project" },
      { label: "Frontend", url: "http://localhost:5173" },
    ],
  );
});

test("ignores empty draft rows and rejects invalid links", () => {
  assert.equal(validateProjectLinks([{ label: "", url: "" }]).error, null);
  assert.match(validateProjectLinks([{ label: "Docs", url: "ftp://example.com" }]).error ?? "", /http/);
  assert.match(validateProjectLinks([{ label: "", url: "https://example.com" }]).error ?? "", /label/);
});

test("normalizes legacy project link payloads", () => {
  assert.deepEqual(normalizeProjectLinks(undefined), []);
  assert.deepEqual(normalizeProjectLinks([
    { label: " Docs ", url: "https://docs.example.com" },
    { label: "Bad", url: "javascript:alert(1)" },
  ]), [{ id: "link-0", label: "Docs", url: "https://docs.example.com" }]);
});
