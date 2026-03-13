#!/usr/bin/env node

import { Command } from 'commander';
import { JulesClient } from './client';

const program = new Command();

program
  .name('jules_cli')
  .description('Jules CLI')
  .version('0.1.0');

program
  .command('list')
  .description('List Jules sessions')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    try {
      const client = new JulesClient();
      const response = await client.getSessions();
      const sessions = response.sessions || [];

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
      } else {
        if (sessions.length === 0) {
          console.log('No sessions found.');
          return;
        }

        sessions.forEach((session: any) => {
          // Parse session ID from name e.g., "sessions/123-abc" -> "123-abc"
          const nameParts = session.name ? session.name.split('/') : [];
          const sessionId = nameParts.length > 0 ? nameParts[nameParts.length - 1] : 'unknown';

          const state = session.state || 'UNKNOWN';
          const title = session.title || 'Untitled';

          console.log(`${sessionId} - [${state}] ${title}`);
        });
      }
    } catch (error: any) {
      console.error('Error listing sessions:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
