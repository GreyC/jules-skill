import { JulesClient } from '../src/client';
import assert from 'node:assert';
import { test } from 'node:test';

test('JulesClient constructor uses provided API key', () => {
  const apiKey = 'test-api-key';
  const client = new JulesClient(apiKey);
  assert.strictEqual((client as any).apiKey, apiKey);
});

test('JulesClient constructor uses API key from environment if not provided', (t) => {
  const originalEnvKey = process.env.JULES_API_KEY;
  process.env.JULES_API_KEY = 'env-api-key';
  t.after(() => {
    process.env.JULES_API_KEY = originalEnvKey;
  });

  const client = new JulesClient();
  assert.strictEqual((client as any).apiKey, 'env-api-key');
});
