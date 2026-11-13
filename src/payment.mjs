import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const payment = Object.freeze({
  reference: 'demo-payment-001',
  amountMinor: 12500,
  currency: 'USD',
});

export const strategies = {
  broken: (attempt) => `${payment.reference}-attempt-${attempt}`,
  corrected: () => payment.reference,
};

async function send(url, key, timeoutMs) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(payment),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function runDemoSender(url, keyForAttempt, timeoutMs) {
  const events = [];
  try {
    const first = await send(url, keyForAttempt(1), timeoutMs);
    await first.body?.cancel();
    return [{ event: 'unexpected-first-response', status: first.status }];
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    events.push({ event: 'timeout', attempt: 1 });
  }

  const retry = await send(url, keyForAttempt(2), timeoutMs);
  const result = retry.ok ? await retry.json() : null;
  if (!retry.ok) await retry.body?.cancel();
  events.push({
    event: 'retry-response',
    attempt: 2,
    status: retry.status,
    transactionId: result?.transactionId ?? null,
  });
  return events;
}

export async function runPaymentScenario(keyForAttempt, {
  timeoutMs = 1000,
  sender = (url) => runDemoSender(url, keyForAttempt, timeoutMs),
} = {}) {
  const ledger = new Map();
  const attempts = [];
  const pending = new Set();

  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/payments') {
      response.writeHead(404).end();
      return;
    }
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const payload = JSON.parse(Buffer.concat(chunks).toString());
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || !key.trim()) {
        response.writeHead(400).end();
        return;
      }

      const existing = ledger.get(key);
      if (existing && JSON.stringify(existing.payment) !== JSON.stringify(payload)) {
        response.writeHead(409).end();
        return;
      }
      const entry = existing ?? { transactionId: randomUUID(), payment: payload };
      ledger.set(key, entry);
      attempts.push({
        key,
        transactionId: entry.transactionId,
        outcome: existing ? 'deduplicated' : 'committed',
      });

      // The receiver commits the first request, then deliberately withholds its response.
      if (attempts.length === 1) return;
      response.writeHead(existing ? 200 : 201, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ transactionId: entry.transactionId }));
    } catch {
      if (!response.destroyed) response.writeHead(400).end();
    }
  });

  server.on('connection', (socket) => {
    pending.add(socket);
    socket.once('close', () => pending.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const url = `http://127.0.0.1:${server.address().port}/payments`;
    const senderEvents = await sender(url, payment);
    if (!Array.isArray(senderEvents) || senderEvents.some((event) =>
      !event || typeof event !== 'object' || typeof event.event !== 'string')) {
      throw new Error('Sender must return an array of event records.');
    }
    const timedOut = senderEvents.some(({ event, attempt }) => event === 'timeout' && attempt === 1);
    const retryEvent = senderEvents.find(({ event }) => event === 'retry-response');
    const checks = {
      firstRequestCommitted: attempts[0]?.outcome === 'committed',
      firstResponseTimedOut: timedOut,
      exactlyTwoAttempts: attempts.length === 2,
      expectedPaymentOnBothAttempts: attempts.length === 2 &&
        Array.from(ledger.values()).every(({ payment: payload }) =>
          payload.reference === payment.reference &&
          payload.amountMinor === payment.amountMinor &&
          payload.currency === payment.currency),
      exactlyOneBusinessTransaction: ledger.size === 1,
      retryDeduplicated: attempts[1]?.outcome === 'deduplicated',
      originalTransactionConfirmed: retryEvent?.status === 200 &&
        retryEvent.transactionId === attempts[0]?.transactionId,
    };
    return {
      scenario: 'payment-timeout-after-commit',
      passed: Object.values(checks).every(Boolean),
      transactionCount: ledger.size,
      checks,
      attempts,
      senderEvents,
    };
  } finally {
    const closed = once(server, 'close');
    server.close();
    for (const socket of pending) socket.destroy();
    await closed;
  }
}
