#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const refreshGithub = args.has('--refresh-github');
const write = args.has('--write');
const contract = JSON.parse(fs.readFileSync(path.join(root, '.qa/release/readiness.json'), 'utf8'));
const allowedStatuses = new Set(contract.statuses);
const milestoneOrder = new Map(contract.milestones.map((m, i) => [m.id, i]));
const gateById = new Map(contract.gates.map((g) => [g.id, g]));
const flowById = new Map(contract.flows.map((f) => [f.id, f]));

function die(message) {
  console.error(message);
  process.exit(1);
}

function validateContract() {
  if (gateById.size !== contract.gates.length) die('Duplicate gate id');
  if (flowById.size !== contract.flows.length) die('Duplicate flow id');

  for (const gate of contract.gates) {
    if (!milestoneOrder.has(gate.requiredFrom)) die('Unknown milestone on ' + gate.id);
    for (const dep of gate.dependsOn || []) {
      if (!gateById.has(dep) && !flowById.has(dep)) die('Unknown dependency ' + dep + ' on ' + gate.id);
    }
    for (const flowId of gate.flows || []) {
      if (!flowById.has(flowId)) die('Unknown flow ' + flowId + ' on ' + gate.id);
    }
  }

  for (const flow of contract.flows) {
    if (!milestoneOrder.has(flow.requiredFrom)) die('Unknown milestone on ' + flow.id);
    for (const gateId of flow.requiredGates || []) {
      if (!gateById.has(gateId)) die('Unknown gate ' + gateId + ' on ' + flow.id);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id) || flowById.has(id)) return;
    if (visiting.has(id)) die('Gate dependency cycle at ' + id);
    visiting.add(id);
    const gate = gateById.get(id);
    for (const dep of gate.dependsOn || []) {
      if (gateById.has(dep)) visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of gateById.keys()) visit(id);
}

function githubIssue(issueNumber) {
  if (!refreshGithub) return { status: 'NOT_RUN', detail: 'GitHub refresh disabled' };
  const result = spawnSync(
    'gh',
    ['api', 'repos/' + contract.repository + '/issues/' + issueNumber, '--jq', '.state'],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) return { status: 'NOT_RUN', detail: 'gh unavailable or not authenticated' };
  const state = result.stdout.trim();
  return { status: state === 'closed' ? 'PASS' : 'FAIL', detail: 'issue #' + issueNumber + ' ' + state };
}

function humanEvidence(spec) {
  const evidencePath = path.join(root, spec.path);
  if (!fs.existsSync(evidencePath)) return { status: 'NOT_RUN', detail: 'missing ' + spec.path };

  let data;
  try {
    data = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch {
    return { status: 'FAIL', detail: 'invalid JSON ' + spec.path };
  }

  if (data.status !== 'PASS') {
    return {
      status: allowedStatuses.has(data.status) ? data.status : 'FAIL',
      detail: spec.path,
    };
  }

  if (!/^[0-9a-f]{40}$/i.test(data.commitSha || '')) {
    return { status: 'FAIL', detail: 'human evidence missing 40-char commitSha' };
  }

  const reviewers = Array.isArray(data.reviewers) ? data.reviewers.filter(Boolean) : [];
  if (reviewers.length === 0) {
    return { status: 'FAIL', detail: 'human evidence missing reviewer' };
  }

  if (Array.isArray(spec.relevantPaths) && spec.relevantPaths.length > 0) {
    const diff = spawnSync(
      'git',
      ['diff', '--name-only', data.commitSha + '..HEAD', '--', ...spec.relevantPaths],
      { cwd: root, encoding: 'utf8' },
    );
    if (diff.status !== 0) return { status: 'STALE', detail: 'cannot compare evidence commit' };
    if (diff.stdout.trim()) {
      return {
        status: 'STALE',
        detail: 'relevant paths changed since ' + data.commitSha.slice(0, 8),
      };
    }
  }

  return { status: 'PASS', detail: spec.path + ' @ ' + data.commitSha.slice(0, 8) };
}

function evaluateVerification(spec) {
  if (spec.type === 'issue_closed') return githubIssue(spec.issue);
  if (spec.type === 'file_exists') {
    return fs.existsSync(path.join(root, spec.path))
      ? { status: 'PASS', detail: spec.path }
      : { status: 'FAIL', detail: 'missing ' + spec.path };
  }
  if (spec.type === 'human_evidence') return humanEvidence(spec);
  if (spec.type === 'derived') return { status: 'PASS', detail: 'derived from dependencies' };
  return { status: 'FAIL', detail: 'unknown verification type ' + spec.type };
}

function combine(results) {
  if (results.length === 0) return { status: 'NOT_RUN', details: [] };
  if (results.some((r) => r.status === 'FAIL')) return { status: 'FAIL', details: results };
  if (results.some((r) => r.status === 'STALE')) return { status: 'STALE', details: results };
  if (results.some((r) => r.status === 'NOT_RUN')) return { status: 'NOT_RUN', details: results };
  if (results.every((r) => r.status === 'N/A')) return { status: 'N/A', details: results };
  if (results.every((r) => r.status === 'PASS' || r.status === 'N/A')) {
    return { status: 'PASS', details: results };
  }
  return { status: 'NOT_RUN', details: results };
}

validateContract();

const gateResults = new Map();
const flowResults = new Map();

function evaluateFlow(id) {
  if (flowResults.has(id)) return flowResults.get(id);
  const flow = flowById.get(id);
  const required = (flow.requiredGates || []).map((gateId) => evaluateGate(gateId));
  let status = 'PASS';
  if (required.some((r) => r.status === 'FAIL')) status = 'FAIL';
  else if (required.some((r) => r.status === 'STALE')) status = 'STALE';
  else if (required.some((r) => r.status === 'BLOCKED')) status = 'BLOCKED';
  else if (required.some((r) => r.status === 'NOT_RUN')) status = 'NOT_RUN';
  const out = { status, details: required };
  flowResults.set(id, out);
  return out;
}

function evaluateGate(id) {
  if (gateResults.has(id)) return gateResults.get(id);
  const gate = gateById.get(id);
  const dependencies = (gate.dependsOn || []).map((dep) =>
    flowById.has(dep) ? evaluateFlow(dep) : evaluateGate(dep),
  );

  if (dependencies.some((r) => r.status !== 'PASS' && r.status !== 'N/A')) {
    const out = { status: 'BLOCKED', details: dependencies };
    gateResults.set(id, out);
    return out;
  }

  const out = combine((gate.verification || []).map(evaluateVerification));
  gateResults.set(id, out);
  return out;
}

for (const gate of contract.gates) evaluateGate(gate.id);
for (const flow of contract.flows) evaluateFlow(flow.id);

const milestoneResults = contract.milestones.map((milestone, index) => {
  const required = contract.gates.filter((g) => milestoneOrder.get(g.requiredFrom) <= index);
  const passed = required.filter((g) => {
    const status = gateResults.get(g.id).status;
    return status === 'PASS' || status === 'N/A';
  });
  const missing = required.filter((g) => {
    const status = gateResults.get(g.id).status;
    return status !== 'PASS' && status !== 'N/A';
  });
  const blockers = missing.filter((g) => g.blocking);
  const pct = required.length === 0 ? 100 : Math.round((passed.length / required.length) * 1000) / 10;
  return {
    id: milestone.id,
    title: milestone.title,
    meaning: milestone.meaning,
    passed: passed.length,
    total: required.length,
    missing: missing.length,
    percentComplete: pct,
    percentMissing: Math.round((100 - pct) * 10) / 10,
    status: blockers.length === 0 ? 'READY' : 'BLOCKED',
    blockers: blockers.map((g) => g.id),
    missingTasks: missing.map((g) => ({
      id: g.id,
      area: g.area,
      title: g.title,
      status: gateResults.get(g.id).status,
      issues: g.linkedIssues || [],
      dependsOn: g.dependsOn || [],
    })),
  };
});

const runtimeDir = path.join(root, '.qa/release/runtime');
const runtimeFile = path.join(runtimeDir, 'latest.json');
let previous = null;
if (fs.existsSync(runtimeFile)) {
  try {
    previous = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
  } catch {
    previous = null;
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commitSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  milestones: milestoneResults,
  gates: Object.fromEntries(
    [...gateResults.entries()].map(([id, result]) => [id, { status: result.status, details: result.details }]),
  ),
  flows: Object.fromEntries(
    [...flowResults.entries()].map(([id, result]) => [id, { status: result.status }]),
  ),
  changes: [],
};

if (previous && previous.gates) {
  for (const [id, current] of Object.entries(report.gates)) {
    const oldStatus = previous.gates[id] && previous.gates[id].status;
    if (oldStatus && oldStatus !== current.status) {
      report.changes.push({ id, from: oldStatus, to: current.status });
    }
  }
}

function renderMarkdown(r) {
  const lines = [
    '# SagaDrive Release Readiness',
    '',
    '> GENERATED — ' + r.generatedAt + ' · commit ' + r.commitSha.slice(0, 8),
    '',
    '## Milestones',
    '',
    '| Milestone | Fertig | Gesamt | % fertig | % fehlt | Fehlende Tasks | Status |',
    '|---|---:|---:|---:|---:|---:|---|',
  ];

  for (const m of r.milestones) {
    lines.push(
      '| ' + m.title + ' | ' + m.passed + ' | ' + m.total + ' | ' +
      m.percentComplete + '% | ' + m.percentMissing + '% | ' + m.missing + ' | ' + m.status + ' |',
    );
  }

  lines.push('', '## Userflows', '');
  for (const flow of contract.flows) {
    const state = r.flows[flow.id].status;
    lines.push('- [' + (state === 'PASS' ? 'x' : ' ') + '] **' + flow.id + '** · ' + state + ' · ' + flow.title);
  }

  lines.push('', '## Changes since previous run', '');
  if (r.changes.length === 0) lines.push('- Keine gespeicherten Statusänderungen.');
  for (const change of r.changes) lines.push('- ' + change.id + ': ' + change.from + ' → ' + change.to);

  for (const m of r.milestones) {
    lines.push('', '## ' + m.title + ' — fehlende Tasks (' + m.missing + ')', '');
    if (m.missingTasks.length === 0) lines.push('- none');
    for (const task of m.missingTasks) {
      const issues = task.issues.length ? ' · ' + task.issues.map((n) => '#' + n).join(', ') : '';
      lines.push('- [ ] **' + task.id + '** · ' + task.status + ' · ' + task.title + issues);
    }
  }

  return lines.join('\n') + '\n';
}

if (write) {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(runtimeFile, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(root, contract.generatedStatusPath), renderMarkdown(report));
}

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
