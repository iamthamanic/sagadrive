#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

const contract = JSON.parse(fs.readFileSync('.qa/release/readiness.json', 'utf8'));

function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'gh failed');
    process.exit(result.status || 1);
  }
  return result.stdout.trim();
}

const existing = JSON.parse(
  gh(['api', 'repos/' + contract.repository + '/milestones?state=all&per_page=100']),
);

for (const milestone of contract.milestones) {
  const found = existing.find((item) => item.title === milestone.title);
  if (found) {
    console.log('exists: ' + milestone.title + ' #' + found.number);
    continue;
  }

  const created = JSON.parse(
    gh([
      'api',
      'repos/' + contract.repository + '/milestones',
      '--method',
      'POST',
      '-f',
      'title=' + milestone.title,
      '-f',
      'description=' + milestone.meaning,
      '-f',
      'state=open',
    ]),
  );
  console.log('created: ' + created.title + ' #' + created.number);
}
