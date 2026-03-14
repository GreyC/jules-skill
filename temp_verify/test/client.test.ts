import { JulesClient } from '../src/client.ts';
import assert from 'node:assert';
import { test } from 'node:test';
import * as auth from '../src/auth.ts';

test('JulesClient constructor uses provided API key', () => {
  const apiKey = 'test-api-key';
  const client = new JulesClient(apiKey);
  assert.strictEqual((client as any).apiKey, apiKey);
});

test('JulesClient constructor uses API key from auth if not provided', (t) => {
  t.mock.method(auth, 'getApiKey', () => 'mock-api-key');

  const client = new JulesClient();
  assert.strictEqual((client as any).apiKey, 'mock-api-key');
});
