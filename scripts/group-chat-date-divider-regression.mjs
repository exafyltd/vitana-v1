import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
function assert(condition, message) {
  if (!condition) {
    failures.push(message);
    console.error(`  x ${message}`);
  } else {
    console.log(`  ok ${message}`);
  }
}

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), 'utf8');
}

function loadTsModule(rel) {
  const path = resolve(repoRoot, rel);
  assert(existsSync(path), `${rel} exists`);
  if (!existsSync(path)) return null;

  const source = readFileSync(path, 'utf8');
  const runnable = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({
    exports: module.exports,
    module,
  });
  vm.runInContext(runnable, context, { filename: path });
  return module.exports;
}

console.log('\n[group-chat-date-divider] behavior');

const helper = loadTsModule('src/lib/messageDateSeparators.ts');
if (helper) {
  const rows = helper.getDateSeparatedMessageItems(
    [
      { id: 'before-midnight', created_at: '2026-06-15T10:34:00.000Z' },
      { id: 'after-midnight', created_at: '2026-06-16T10:24:00.000Z' },
      { id: 'same-day-followup', created_at: '2026-06-16T11:01:00.000Z' },
    ],
    message => message.created_at,
    date => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
  );

  assert(
    JSON.stringify(rows.map(row => row.type)) === JSON.stringify(['date', 'message', 'date', 'message', 'message']),
    'messages are prefixed with one date divider per calendar day',
  );
  assert(rows[0]?.text === '2026-6-15', 'first divider uses the first message date label');
  assert(rows[2]?.text === '2026-6-16', 'second divider uses the next day label');
  assert(rows[3]?.message?.id === 'after-midnight', 'message order is preserved after a new-day divider');
}

console.log('\n[group-chat-date-divider] GroupChat integration');

const groupChat = read('src/pages/messages/GroupChat.tsx');
assert(
  groupChat.includes('MessageDivider'),
  'GroupChat imports and renders the shared MessageDivider date chip',
);
assert(
  groupChat.includes('getDateSeparatedMessageItems'),
  'GroupChat builds a date-separated render list before mapping bubbles',
);
assert(
  /item\.type\s*===\s*["']date["']/.test(groupChat),
  'GroupChat renders date rows separately from message rows',
);

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} assertion(s) failed.`);
  process.exit(1);
}

console.log('\nOK: group chat date divider regression checks passed.');
