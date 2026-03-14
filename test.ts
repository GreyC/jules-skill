import * as mod from './mod.ts';
import { mock } from 'node:test';
try {
  mock.method(mod, 'foo', () => 'baz');
  console.log(mod.foo());
} catch (e) {
  console.error(e.message);
}
