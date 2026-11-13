import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

test('the broken sender fails after producing two committed transactions', () => {
  const result = spawnSync(process.execPath, [cli, '--strategy', 'broken'], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, false);
  assert.equal(report.transactionCount, 2);
  assert.equal(report.checks.firstResponseTimedOut, true);
  assert.equal(report.checks.exactlyTwoAttempts, true);
  assert.notEqual(report.attempts[0].transactionId, report.attempts[1].transactionId);
});

test('the corrected sender confirms the original transaction and writes its CI output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reliability-lab-'));
  try {
    const reportPath = join(directory, 'payment.json');
    const outputPath = join(directory, 'github-output');
    const result = spawnSync(process.execPath, [cli, '--report', reportPath], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: outputPath },
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    assert.equal(report.transactionCount, 1);
    assert.equal(report.passed, true);
    assert.equal(report.attempts[0].transactionId, report.attempts[1].transactionId);
    assert.equal(await readFile(outputPath, 'utf8'), 'passed=true\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an unsupported strategy produces a usage error', () => {
  const result = spawnSync(process.execPath, [cli, '--strategy', 'constructor'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Strategy must be broken or corrected/);
});

test('a custom sender runs against the same receiver and assertions', () => {
  const sender = fileURLToPath(new URL('../examples/custom-sender.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, '--sender', sender], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.strategy, 'custom');
  assert.equal(report.checks.expectedPaymentOnBothAttempts, true);
  assert.equal(report.checks.originalTransactionConfirmed, true);
});
