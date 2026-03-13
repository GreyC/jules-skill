#!/usr/bin/env node

import { Command } from 'commander';
import { JulesClient } from './client';
import { logError } from './logger';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { version } from '../package.json';

const program = new Command();

program
  .name('jules_cli')
  .description('Jules CLI')
  .version(version)
  .option('-d, --debug', 'Enable debug logging');

program
  .command('list')
  .description('List Jules sessions')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const debug = program.opts().debug;
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
      logError('Error listing sessions.', error, debug);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Setup Jules API key')
  .action(async () => {
    const debug = program.opts().debug;
    try {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your JULES_API_KEY:',
          mask: '*',
        },
      ]);

      const apiKey = answers.apiKey;

      if (!apiKey) {
        logError('API key is required.', null, debug);
        process.exit(1);
      }

      console.log('Validating API key...');
      await JulesClient.validateKey(apiKey);

      const configDir = path.join(os.homedir(), '.config', 'jules');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configPath = path.join(configDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ apiKey }, null, 2));

      console.log('Setup complete. API key saved to ~/.config/jules/config.json');
    } catch (error: any) {
      logError('Setup failed.', error, debug);
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create a Jules session')
  .requiredOption('--repo <repo>', 'GitHub repository (owner/repo)')
  .requiredOption('--prompt <prompt>', 'Prompt for Jules')
  .option('--auto-pr', 'Automatically create a PR')
  .option('--approve-plan', 'Require plan approval')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();

      const payload: any = {
        prompt: options.prompt,
        sourceContext: {
          source: `sources/github/${options.repo}`,
        },
      };

      if (options.autoPr) {
        payload.automationMode = 'AUTO_CREATE_PR';
      }

      if (options.approvePlan) {
        payload.requirePlanApproval = true;
      }

      const response = await client.createSession(payload);

      if (options.json) {
        console.log(JSON.stringify(response, null, 2));
      } else {
        const nameParts = response.name ? response.name.split('/') : [];
        const sessionId = nameParts.length > 0 ? nameParts[nameParts.length - 1] : 'unknown';
        const state = response.state || 'UNKNOWN';
        console.log(`Session created: ${sessionId}`);
        console.log(`State: ${state}`);
      }
    } catch (error: any) {
      logError('Error creating session.', error, debug);
      process.exit(1);
    }
  });

program
  .command('show <session-id>')
  .description('Show details of a Jules session')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();
      const session = await client.getSession(sessionId);

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
      } else {
        const state = session.state || 'UNKNOWN';
        const title = session.title || 'Untitled';
        const lastUpdated = session.updateTime || 'Unknown';

        console.log(`Session: ${sessionId}`);
        console.log(`State: ${state}`);
        console.log(`Title: ${title}`);
        console.log(`Last Updated: ${lastUpdated}`);
      }
    } catch (error: any) {
      logError('Error fetching session.', error, debug);
      process.exit(1);
    }
  });

program
  .command('approve <session-id>')
  .description('Approve a Jules session plan')
  .action(async (sessionId) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();
      await client.approvePlan(sessionId);
      console.log(`Successfully approved plan for session ${sessionId}`);
    } catch (error: any) {
      logError('Error approving plan.', error, debug);
      process.exit(1);
    }
  });

program
  .command('send <session-id>')
  .description('Send a message to a Jules session')
  .requiredOption('--message <message>', 'Message to send')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();
      const response = await client.sendMessage(sessionId, options.message);

      if (options.json) {
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.log(`Successfully sent message to session ${sessionId}`);
      }
    } catch (error: any) {
      logError('Error sending message.', error, debug);
      process.exit(1);
    }
  });

program
  .command('last-msg <session-id>')
  .description('Get the last message sent by Jules')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();
      const response = await client.getActivities(sessionId);
      const activities = response.activities || [];

      // Filter for Jules's outbound messages
      const julesMessages = activities.filter((a: any) => a.originator === 'agent');

      const lastMsg = julesMessages.length > 0 ? julesMessages[julesMessages.length - 1] : null;

      if (options.json) {
        console.log(JSON.stringify(lastMsg || {}, null, 2));
      } else {
        if (!lastMsg) {
          console.log('No message found from Jules.');
        } else {
          let text = JSON.stringify(lastMsg, null, 2);
          if (lastMsg.planGenerated?.plan?.steps) {
            text = lastMsg.planGenerated.plan.steps
              .map((s: any, i: number) => `Step ${i + 1}: ${s.title}`)
              .join('\n');
          } else if (lastMsg.userFeedbackRequired?.message) {
            text = lastMsg.userFeedbackRequired.message;
          }

          console.log(text);
        }
      }
    } catch (error: any) {
      logError('Error fetching activities.', error, debug);
      process.exit(1);
    }
  });

program
  .command('pr-url <session-id>')
  .description('Get the PR URL for a completed session')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    const debug = program.opts().debug;
    try {
      const client = new JulesClient();
      const session = await client.getSession(sessionId);

      const outputs = session.outputs || [];
      const prOutput = outputs.find((o: any) => o.pullRequest?.url);
      const url = prOutput?.pullRequest?.url;

      if (options.json) {
        console.log(JSON.stringify(url ? { pullRequestUrl: url } : {}, null, 2));
      } else {
        if (url) {
          console.log(url);
        } else {
          console.log('No PR URL found in session outputs.');
        }
      }
    } catch (error: any) {
      logError('Error fetching session.', error, debug);
      process.exit(1);
    }
  });

program.parse(process.argv);
