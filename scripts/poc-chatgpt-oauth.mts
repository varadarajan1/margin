import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { createModels } from '@earendil-works/pi-ai/models';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';

function getInstallationDeviceId(): string {
  const dataDir = path.resolve(process.env.MARGIN_DATA_DIR || '.data');
  const file = path.join(dataDir, 'pi-chatgpt-oauth-poc-device-id');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  try {
    const stored = readFileSync(file, 'utf8').trim();
    // Repair IDs written by the first POC version with a literal backslash-n suffix.
    const id = stored.endsWith('\\n') ? stored.slice(0, -2) : stored;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('Stored POC device ID is invalid; remove .data/pi-chatgpt-oauth-poc-device-id and retry.');
    }
    chmodSync(file, 0o600);
    if (id !== stored) writeFileSync(file, `${id}\n`, { encoding: 'utf8', mode: 0o600 });
    return id;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const id = randomUUID();
  try {
    writeFileSync(file, `${id}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    return id;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    return readFileSync(file, 'utf8').trim();
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: npm run poc:chatgpt-oauth [-- --run-request]');
    console.log('Default: complete OAuth sign-in only; --run-request asks for confirmation before sending a tiny model request.');
    return;
  }
  const runRequest = process.argv.includes('--run-request');
  const modelId = process.env.MARGIN_POC_MODEL?.trim() || 'gpt-6.1-sol';
  const readline = createInterface({ input: stdin, output: stdout });
  const models = createModels(); // In-memory credential store: OAuth tokens are not persisted by this POC.
  models.setProvider(openaiProvider());

  try {
    const model = models.getModel('openai', modelId);
    if (!model) throw new Error(`Model ${modelId} is not present in pi-ai's OpenAI catalog.`);

    console.log('Starting Pi AI ChatGPT OAuth. This POC does not save OAuth credentials to disk.');
    await models.login('openai', 'oauth', {
      prompt: async (prompt) => {
        if (prompt.type === 'manual_code') {
          console.log(`\n${prompt.message}`);
          // When the localhost callback wins, pi-ai aborts this prompt. Pass that signal
          // through so readline releases its pending question before the next prompt.
          return readline.question(
            `${prompt.placeholder || 'Paste the full redirect URL or authorization code'}: `,
            { signal: prompt.signal },
          );
        }
        if (prompt.type === 'select') {
          console.log(prompt.message);
          prompt.options.forEach((option, index) => console.log(`  ${index + 1}. ${option.label}${option.description ? ` — ${option.description}` : ''}`));
          const answer = await readline.question('Choose an option: ');
          const option = prompt.options[Number(answer) - 1];
          if (!option) throw new Error('Invalid selection.');
          return option.id;
        }
        return readline.question(`${prompt.message}${prompt.placeholder ? ` (${prompt.placeholder})` : ''}: `);
      },
      notify: (event) => {
        if (event.type === 'auth_url') {
          console.log(`\nOpen this URL and sign in: ${event.url}`);
          if (event.instructions) console.log(event.instructions);
        } else if (event.type === 'device_code') {
          console.log(`\nGo to ${event.verificationUri} and enter code ${event.userCode}`);
        } else if (event.type === 'info') {
          console.log(event.message);
          for (const link of event.links ?? []) console.log(`${link.label ?? 'More information'}: ${link.url}`);
        } else {
          console.log(event.message);
        }
      },
    }, { getDeviceId: getInstallationDeviceId, agentName: 'Margin OAuth POC' });

    const auth = await models.getAuth(model);
    if (auth?.source !== 'OAuth') throw new Error(`Expected OAuth auth, got ${auth?.source ?? 'no auth'}.`);
    console.log(`\nOAuth authenticated for provider openai; auth source: ${auth.source}.`);

    if (!runRequest) {
      console.log('No model request was sent. Re-run with --run-request to explicitly test a short Responses API request.');
    } else {
      console.log(`\nThis will send a small test request to ${modelId} using your ChatGPT OAuth session.`);
      const confirm = await readline.question('Send it now? Type yes to continue: ');
      if (confirm !== 'yes') {
        console.log('Skipped; no model request was sent.');
      } else {
        const response = await models.completeSimple(model, {
          systemPrompt: 'Reply with exactly: MARGIN_OAUTH_POC_OK',
          messages: [{ role: 'user', content: 'Confirm the OAuth-backed Responses API request is working.', timestamp: Date.now() }],
        }, { signal: AbortSignal.timeout(45_000) });
        if (response.stopReason === 'error' || response.stopReason === 'aborted') {
          throw new Error(response.errorMessage || `Model request ended with ${response.stopReason}.`);
        }
        const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim();
        console.log(`\nModel: ${response.model}`);
        console.log(`Response: ${text || '(no text returned)'}`);
        console.log(`Usage: ${response.usage.input} input / ${response.usage.output} output tokens`);
        console.log('This POC sends no API key and keeps OAuth tokens in memory only for this process.');
      }
    }
  } catch (error) {
    console.error(`POC failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  } finally {
    readline.close();
  }
}

void main();
