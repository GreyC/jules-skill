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
  // We use direct mutation here because process.env is a special object
  // and node:test mocks are not yet compatible with it for simple property replacement.
  // Using t.after ensures the environment is restored regardless of test outcome.
  process.env.JULES_API_KEY = 'env-api-key';
  t.after(() => {
    process.env.JULES_API_KEY = originalEnvKey;
  });

  const client = new JulesClient();
  assert.strictEqual((client as any).apiKey, 'env-api-key');
});
