import { JulesClient } from '../src/client.ts';
import assert from 'node:assert';
import { test } from 'node:test';

test('JulesClient constructor uses provided API key', () => {
  const apiKey = 'test-api-key';
  const client = new JulesClient(apiKey);
  assert.strictEqual((client as any).apiKey, apiKey);
});

test('JulesClient constructor uses API key from environment if not provided', () => {
  const originalEnvKey = process.env.JULES_API_KEY;
  process.env.JULES_API_KEY = 'env-api-key';
  try {
    const client = new JulesClient();
    assert.strictEqual((client as any).apiKey, 'env-api-key');
  } finally {
    process.env.JULES_API_KEY = originalEnvKey;
  }
});
