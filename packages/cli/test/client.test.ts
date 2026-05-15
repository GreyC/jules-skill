import { JulesClient } from '../src/client';
import assert from 'node:assert';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';

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

test('JulesClient constructor uses API key from config file if not provided via env', (t) => {
  const originalEnvKey = process.env.JULES_API_KEY;
  delete process.env.JULES_API_KEY;
  t.after(() => {
    process.env.JULES_API_KEY = originalEnvKey;
  });

  const configPath = os.homedir() + '/.config/jules/config.json';

  t.mock.method(fs, 'existsSync', (path: string) => {
    if (path === configPath) return true;
    return false;
  });

  t.mock.method(fs, 'readFileSync', (path: string) => {
    if (path === configPath) {
      return JSON.stringify({ apiKey: 'config-api-key' });
    }
    throw new Error('File not found');
  });

  const client = new JulesClient();
  assert.strictEqual((client as any).apiKey, 'config-api-key');
});

test('JulesClient constructor throws error if no API key is found anywhere', (t) => {
  const originalEnvKey = process.env.JULES_API_KEY;
  delete process.env.JULES_API_KEY;
  t.after(() => {
    process.env.JULES_API_KEY = originalEnvKey;
  });

  t.mock.method(fs, 'existsSync', (path: string) => {
    if (path.includes('.config/jules/config.json')) return false;
    return true; // allow other existsSync calls to proceed normally if any
  });

  assert.throws(() => {
    new JulesClient();
  }, {
    message: 'No API key found. Set JULES_API_KEY or run: jules_cli setup'
  });
});
