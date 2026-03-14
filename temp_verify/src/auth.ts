import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getApiKey(): string {
  // 1. Check environment variable
  const envKey = process.env.JULES_API_KEY;
  if (envKey) {
    return envKey;
  }

  // 2. Check config file: ~/.config/jules/config.json
  const configPath = path.join(os.homedir(), '.config', 'jules', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      if (config.apiKey) {
        return config.apiKey;
      }
    }
  } catch (error) {
    console.error('Warning: could not read config file:', configPath);
  }

  // 3. Neither found, exit with error message
  console.error('No API key found. Set JULES_API_KEY or run: jules_cli setup');
  process.exit(1);
}
