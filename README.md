# Integration Reliability Lab

A runnable lab for testing how enterprise integrations recover from ambiguous failures. The first scenario uses synthetic payment data to demonstrate what happens when a receiver commits a transaction and the sender times out before getting the response.

Created by **Rameshkumar Varanganti** for [Agentic Integration Hub](https://agenticintegrationhub.com/).

## Run the lab

Install Node.js 24 or newer. From the repository root, run:

```sh
npm test
node src/cli.mjs --strategy broken
node src/cli.mjs --strategy corrected --report reliability-report.json
```

The broken sender uses a different idempotency key on each attempt. The receiver records two transactions and the command exits with code **1**. The corrected sender keeps the same key across attempts. The receiver returns the original transaction ID and the command exits with code **0**. Invalid arguments and execution errors produce exit code **2**.

The mock receiver binds to loopback on a temporary port. The demo uses synthetic data, an in-memory ledger, and built-in Node modules. Network behavior and business outcomes together determine the result. Transaction IDs vary between runs.

## What the test proves

| Check | Expected outcome |
|---|---|
| First request | The receiver records the transaction and withholds its response. |
| Sender | The first call times out and the sender retries once. |
| Receiver ledger | Exactly one business transaction exists after two requests. |
| Retry | The receiver deduplicates the request and returns the original transaction ID. |

The built-in demo exercises the lab's mock sender and receiver. It establishes the expected behavior for an implementation and provides a reproducible example. A real integration requires a separate test against its own sender, receiver, authentication and persistence. See the [porting guide](docs/porting.md).

## Test your own sender

```sh
node src/cli.mjs --sender examples/custom-sender.mjs --report reliability-report.json
```

Use the example as a starting point. A trusted local ES module exports an async function that receives the mock receiver URL and a synthetic payment object. It invokes your code and returns an array with the observed sender events. The lab checks those events against its own receiver ledger. In CI, check out your repository and set the action's `sender` input to the module path. A remotely hosted runtime needs a test receiver reachable from that runtime.

## Use the GitHub Action

After publication, use the release tag in your workflow. For a local checkout of this repository, replace the remote reference with `uses: ./`.

```yaml
name: Payment reliability demo
on: [pull_request]
permissions:
  contents: read
jobs:
  reliability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
      - uses: rameshvaranganti/integration-reliability-lab@v0.1.0
        with:
          strategy: corrected
          report: reliability-report.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: payment-reliability-report
          path: reliability-report.json
```

The action returns a `passed` output and writes a JSON report to the supplied path. Create its parent directory first if you choose a nested path. The example runs the demo as a smoke test. To validate a team’s flow, port the scenario and run that implementation’s test in its release workflow.

## Contribute

Try the two example runs and open an issue to share what worked or propose a new failure case. Read the [pilot and release plan](docs/release-and-pilot.md) for ways to participate. Use synthetic data and share adoption details only with the relevant team’s permission.

Released under the [Apache License 2.0](LICENSE).
