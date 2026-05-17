#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const allowedCreatedBy = new Set(["api", "claude", "codex", "manual"]);

const usage = `Usage:
  node tools/explain-code-ingest/publish.mjs payload.json [--dry-run]
  node tools/explain-code-ingest/publish.mjs --list-groups [--dry-run]
  cat payload.json | node tools/explain-code-ingest/publish.mjs --stdin

Environment:
  EXPLAIN_CODE_API_URL       Default: http://localhost:4000/api
  EXPLAIN_CODE_API_TOKEN     Required unless --dry-run
  EXPLAIN_CODE_GROUP_KEY     Advanced override for payload.groupKey
  EXPLAIN_CODE_PROJECT_NAME  Optional default for payload.projectName
  EXPLAIN_CODE_CREATED_BY    Optional default: api
`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const listGroups = args.includes("--list-groups");
const readStdin = args.includes("--stdin");
const payloadPath = args.find((arg) => !arg.startsWith("--"));

const fail = (message, details) => {
  console.error(`explain-code ingest: ${message}`);
  if (details) console.error(details);
  process.exit(1);
};

const readPayloadText = async () => {
  if (readStdin) {
    let input = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) input += chunk;
    return input;
  }

  if (!payloadPath) fail("payload file is required.", usage);

  return readFile(payloadPath, "utf8");
};

const parsePayload = async () => {
  const text = await readPayloadText();

  try {
    return JSON.parse(text);
  } catch (error) {
    fail("payload must be valid JSON.", error instanceof Error ? error.message : "");
  }
};

const toStringArray = (value, fieldName) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${fieldName} must be an array.`);
  return value.filter((item) => String(item).trim()).map((item) => String(item).trim());
};

const normalizePayload = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("payload root must be a JSON object.");
  }

  const createdBy = raw.createdBy ?? process.env.EXPLAIN_CODE_CREATED_BY ?? "api";
  if (!allowedCreatedBy.has(createdBy)) {
    fail("createdBy must be one of api, claude, codex, manual.");
  }

  const payload = {
    ...raw,
    groupKey:
      process.env.EXPLAIN_CODE_GROUP_KEY?.trim() ||
      String(raw.groupKey ?? "").trim(),
    projectName:
      raw.projectName ?? process.env.EXPLAIN_CODE_PROJECT_NAME?.trim() ?? undefined,
    createdBy,
    frameworks: toStringArray(raw.frameworks, "frameworks"),
    concepts: toStringArray(raw.concepts, "concepts"),
    flow: toStringArray(raw.flow, "flow"),
  };

  if (!payload.groupKey) fail("groupKey is required.");
  if (!payload.title || String(payload.title).trim().length < 2) {
    fail("title is required and must be at least 2 characters.");
  }
  if (!payload.summary || String(payload.summary).trim().length < 2) {
    fail("summary is required and must be at least 2 characters.");
  }

  payload.title = String(payload.title).trim();
  payload.summary = String(payload.summary).trim();
  if (payload.overview) payload.overview = String(payload.overview).trim();
  if (payload.diffSummary) payload.diffSummary = String(payload.diffSummary).trim();

  return payload;
};

const requestUrl = (path = "/ingest/episodes") => {
  const base = (process.env.EXPLAIN_CODE_API_URL || "http://localhost:4000/api")
    .trim()
    .replace(/\/+$/, "");

  return `${base}${path}`;
};

const apiToken = () => {
  const token = process.env.EXPLAIN_CODE_API_TOKEN?.trim();
  if (!token) fail("EXPLAIN_CODE_API_TOKEN is required unless --dry-run is used.");
  return token;
};

const readJsonResponse = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const printGroupList = (groups) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    console.log("No Explain Code groups found.");
    return;
  }

  for (const group of groups) {
    console.log(
      [
        group.id,
        `project=${group.project}`,
        `episodes=${group.episodeCount ?? 0}`,
        `frameworks=${(group.frameworks ?? []).join(", ") || "-"}`,
      ].join(" | "),
    );
  }
};

const fetchGroups = async () => {
  const url = requestUrl("/ingest/groups");

  if (dryRun) {
    console.log(JSON.stringify({ method: "GET", url }, null, 2));
    return;
  }

  const response = await fetch(url, {
    headers: {
      "x-api-token": apiToken(),
    },
    method: "GET",
  });
  const body = await readJsonResponse(response);

  if (!response.ok) {
    fail(`request failed with ${response.status}.`, JSON.stringify(body, null, 2));
  }

  printGroupList(body.groups);
};

const main = async () => {
  if (listGroups) {
    await fetchGroups();
    return;
  }

  const payload = normalizePayload(await parsePayload());
  const url = requestUrl();

  if (dryRun) {
    console.log(JSON.stringify({ payload, url }, null, 2));
    return;
  }

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      "x-api-token": apiToken(),
    },
    method: "POST",
  });
  const body = await readJsonResponse(response);

  if (!response.ok) {
    fail(`request failed with ${response.status}.`, JSON.stringify(body, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        episodeId: body.episode?.id,
        groupId: body.episode?.groupId,
        href: body.href,
        title: body.episode?.title,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  fail("unexpected error.", error instanceof Error ? error.stack : String(error));
});
