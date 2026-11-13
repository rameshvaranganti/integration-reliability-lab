# Port the timeout-after-commit test

Use a nonproduction flow and a disposable receiver. Use a fresh synthetic business reference for each test run. Configure the receiver to record a transaction on the first request, withhold the response until the sender times out, and respond normally on later requests.

## SAP Integration Suite Cloud Integration

1. Point the HTTPS receiver adapter in a test iFlow at the mock receiver hosted in a test environment reachable from the SAP tenant. The supplied loopback server runs on the same host as the Node sender.
2. Carry the synthetic payment reference through the route. Send the same idempotency key on the first call and the retry, using the receiver's agreed header or another documented idempotency mechanism.
3. Configure an explicit timeout. Use the retry mechanism that applies to your flow and trigger it once in the test. Capture the request count, receiver transaction count, and returned transaction ID independently of the CPI message-processing status.
4. Re-run with a deliberately changed retry key and assert that the check detects the duplicate. Clear test data between runs.

## Apache Camel or another HTTP integration runtime

Use the same mock receiver behavior and assertions. Configure the route to preserve a business-derived key across retries. Ensure the redelivery mechanism repeats the outbound request you intend to test. Preserve the returned transaction ID in the test result.

If a real receiver uses a transaction-status API instead of idempotent POST, assert that the sender checks the status after an ambiguous timeout and confirms the original transaction. The exact mechanism depends on the receiver contract. With either mechanism, prove the business side effect from durable receiver state in the integration test.
