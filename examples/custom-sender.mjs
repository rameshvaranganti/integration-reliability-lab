// Replace this adapter with a call into your own sender or integration route.
export default async function sendPayment(url, payment) {
  const send = () => fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': payment.reference,
    },
    body: JSON.stringify(payment),
    signal: AbortSignal.timeout(1000),
  });

  try {
    const first = await send();
    await first.body?.cancel();
    return [{ event: 'unexpected-first-response', status: first.status }];
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
  }
  const retry = await send();
  const result = await retry.json();
  return [
    { event: 'timeout', attempt: 1 },
    { event: 'retry-response', attempt: 2, status: retry.status, transactionId: result.transactionId },
  ];
}
