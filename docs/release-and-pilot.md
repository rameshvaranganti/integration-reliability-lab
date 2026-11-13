# Release and pilot plan

## Initial release

1. Create a public GitHub repository named `integration-reliability-lab` and push this project to its default branch.
2. Confirm that the verification workflow passes on Linux, Windows, and macOS and that each job produces its JSON report.
3. On GitHub, draft release `v0.1.0`, select **Publish this Action to the GitHub Marketplace**, choose the closest available category, and complete the required Marketplace terms and checks. Publish the release after checking the action name and listing preview.
4. Verify the public listing and run the README's remote-tag example in a separate test repository.

Suggested release note

> The first release demonstrates a payment timeout after the receiver has already committed the transaction. It includes broken and corrected senders, assertions against the receiver ledger, and a GitHub Action that produces a JSON report. The demo runs locally without installing project dependencies or connecting to a live payment system.

## Independent pilot

Invite three to five practitioners from different organizations or regions to run both demos and then port the scenario to a nonproduction integration. Ask which steps slowed them down, whether their existing tests cover the case, and whether the team would run it on pull requests or before release. Confirm any report of adoption or defects with the team before publishing it.

A short invitation for the SAP Community or conference contacts

> I’ve built a small open-source lab for an integration failure that can be hard to reproduce: the receiver commits a transaction and the sender times out before getting the response. The demo runs with synthetic data and shows how a retry can create a duplicate. I’m looking for engineers to try both examples and tell me whether a similar test would help their team. If you try it on your own test flow, I’d like to hear where the setup or assertions need improvement.

## Follow-on scenarios

Prioritize cases that pilot participants can reproduce. Candidates include duplicated inbound messages, a missing acknowledgment past an agreed deadline, a transient outage with bounded retries, and validation errors that require correction. For each case, provide a broken implementation, a corrected one, and observable business outcomes. Use the same scenario for the first runnable example outside SAP. Consider an editor extension after teams can describe the CI or authoring task it would simplify.
