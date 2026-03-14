import { JulesClient } from '../src/client';
import assert from 'node:assert';
import { test, mock } from 'node:test';

test('JulesClient constructor uses provided API key', () => {
  const apiKey = 'test-api-key';
  const client = new JulesClient(apiKey);
  assert.strictEqual((client as any).apiKey, apiKey);
});

test('JulesClient constructor uses API key from environment if not provided', (t) => {
  const originalEnvKey = process.env.JULES_API_KEY;
  // Node's process.env properties are not standard getters and cannot be mocked with mock.getter.
  // We use direct mutation but leverage t.after for safe cleanup, which is a common testing pattern.
  process.env.JULES_API_KEY = 'env-api-key';
  t.after(() => {
    if (originalEnvKey === undefined) {
      delete process.env.JULES_API_KEY;
    } else {
      process.env.JULES_API_KEY = originalEnvKey;
    }
  });

  const client = new JulesClient();
  assert.strictEqual((client as any).apiKey, 'env-api-key');
});
