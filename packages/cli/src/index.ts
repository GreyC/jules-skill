#!/usr/bin/env node

import { Command } from 'commander';
import { JulesClient } from './client';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

program
  .command('setup')
  .description('Setup Jules API key')
  .action(async () => {
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
        console.error('API key is required.');
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
      console.error('Setup failed:', error.message);
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
      console.error('Error creating session:', error.message);
      process.exit(1);
    }
  });

program
  .command('show <session-id>')
  .description('Show details of a Jules session')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
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
      console.error('Error fetching session:', error.message);
      process.exit(1);
    }
  });

program
  .command('approve <session-id>')
  .description('Approve a Jules session plan')
  .action(async (sessionId) => {
    try {
      const client = new JulesClient();
      await client.approvePlan(sessionId);
      console.log(`Successfully approved plan for session ${sessionId}`);
    } catch (error: any) {
      console.error('Error approving plan:', error.message);
      process.exit(1);
    }
  });

program
  .command('send <session-id>')
  .description('Send a message to a Jules session')
  .requiredOption('--message <message>', 'Message to send')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    try {
      const client = new JulesClient();
      const response = await client.sendMessage(sessionId, options.message);

      if (options.json) {
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.log(`Successfully sent message to session ${sessionId}`);
      }
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      process.exit(1);
    }
  });

program
  .command('last-msg <session-id>')
  .description('Get the last message sent by Jules')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    try {
      const client = new JulesClient();
      const response = await client.getActivities(sessionId);
      const activities = response.activities || [];

      // Filter for Jules's outbound messages
      // We assume activities contain state changes and messages.
      // Typically activities have something like `type: "MESSAGE"`, `actor: "JULES"` or similar.
      // Given no explicit schema details for activities in api_reference.md, we assume
      // activities might have a "message" or "actor" attribute. If an activity has 'message' but not 'actor'="USER",
      // or similar, we log it. We'll simply find the last message-like activity.
      // Wait, let's look at standard Jules API: Activities have a message object.
      // Let's print the last activity that is a message from JULES.

      const julesMessages = activities.filter((a: any) => {
        // We'll assume the activity has an "actor" or "role" field, or we check "type"
        // Without clear schema, we will try our best: check for "message" payload and check if not user
        if (a.actor === 'USER') return false;
        if (a.role === 'user') return false;
        return a.message !== undefined || a.text !== undefined || a.prompt !== undefined;
      });

      const lastMsg = julesMessages.length > 0 ? julesMessages[julesMessages.length - 1] : null;

      if (options.json) {
        console.log(JSON.stringify(lastMsg || {}, null, 2));
      } else {
        if (!lastMsg) {
          console.log('No message found from Jules.');
        } else {
          // Attempt to extract text content
          const text = lastMsg.message || lastMsg.text || lastMsg.prompt || JSON.stringify(lastMsg, null, 2);
          console.log(text);
        }
      }
    } catch (error: any) {
      console.error('Error fetching activities:', error.message);
      process.exit(1);
    }
  });

program
  .command('pr-url <session-id>')
  .description('Get the PR URL for a completed session')
  .option('--json', 'Output raw JSON')
  .action(async (sessionId, options) => {
    try {
      const client = new JulesClient();
      const response = await client.getActivities(sessionId);
      const activities = response.activities || [];

      // Find an activity with a pullRequestUrl or similar
      const prActivity = activities.find((a: any) => a.pullRequestUrl !== undefined);

      if (options.json) {
        console.log(JSON.stringify(prActivity ? { pullRequestUrl: prActivity.pullRequestUrl } : {}, null, 2));
      } else {
        if (prActivity && prActivity.pullRequestUrl) {
          console.log(prActivity.pullRequestUrl);
        } else {
          console.log('No PR URL found in session activities.');
        }
      }
    } catch (error: any) {
      console.error('Error fetching activities:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
