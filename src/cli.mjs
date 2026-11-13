import { parseArgs } from 'node:util';
import { writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runPaymentScenario, strategies } from './payment.mjs';

try {
  const { values } = parseArgs({
    options: {
      strategy: { type: 'string', default: 'corrected' },
      report: { type: 'string' },
      sender: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log('Usage: node src/cli.mjs [--strategy broken|corrected | --sender path] [--report path]');
  } else {
    if (!Object.hasOwn(strategies, values.strategy)) {
      throw new Error('Strategy must be broken or corrected.');
    }
    let sender;
    if (values.sender) {
      ({ default: sender } = await import(pathToFileURL(values.sender).href));
      if (typeof sender !== 'function') throw new Error('Sender module must export a default function.');
    }
    const result = await runPaymentScenario(strategies[values.strategy], { sender });
    const report = { strategy: sender ? 'custom' : values.strategy, ...result };
    const json = JSON.stringify(report, null, 2) + '\n';
    if (values.report) await writeFile(values.report, json);
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, `passed=${report.passed}\n`);
    }
    console.log(json.trimEnd());
    process.exitCode = report.passed ? 0 : 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
