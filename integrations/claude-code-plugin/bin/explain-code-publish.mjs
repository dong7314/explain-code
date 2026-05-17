#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(process.cwd(), "tools/explain-code-ingest/publish.mjs"),
  resolve(__dirname, "../../../tools/explain-code-ingest/publish.mjs"),
];

const script = candidates.find((candidate) => existsSync(candidate));

if (!script) {
  console.error("Cannot find tools/explain-code-ingest/publish.mjs");
  process.exit(1);
}

const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
