import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260703000000_fix_july_19_kira_ticket_price.sql',
);
const workflowPath = resolve(
  repoRoot,
  '.github/workflows/apply-july-19-kira-ticket-price-migration.yml',
);

const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ok ${message}`);
    return;
  }

  failures.push(message);
  console.error(`  x ${message}`);
}

console.log('\n[maxina-kira-price] July 19 event price consistency');

assert(existsSync(migrationPath), 'the targeted price-correction migration exists');

if (existsSync(migrationPath)) {
  const sql = readFileSync(migrationPath, 'utf8');
  const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

  assert(
    normalized.includes('3ed6c7e1-d284-42bb-bc0f-ef8e8c655bb7'),
    'the migration targets the July 19 KIRA Rooftop event',
  );
  assert(
    normalized.includes('2528505b-007b-421b-bc22-064894706e2e'),
    'the migration targets its General Admission ticket type',
  );
  assert(
    /update\s+public\.global_community_events\s+set[\s\S]*to_jsonb\(99\)/i.test(sql),
    'the event-list metadata price is set to 99',
  );
  assert(
    /update\s+public\.event_ticket_types\s+set\s+price\s*=\s*99\s*,\s*currency\s*=\s*'eur'/i.test(sql),
    'the detail and checkout ticket price is set to 99 EUR',
  );
}

console.log('\n[maxina-kira-price] deployment workflow');

assert(existsSync(workflowPath), 'the live migration workflow exists');

if (existsSync(workflowPath)) {
  const workflow = readFileSync(workflowPath, 'utf8');

  assert(
    workflow.includes('supabase/migrations/20260703000000_fix_july_19_kira_ticket_price.sql'),
    'the workflow applies the targeted migration file',
  );
  assert(
    workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'),
    'the workflow uses the repository Supabase deployment credential',
  );
  assert(
    workflow.includes("metadata->>'price'") && workflow.includes('event_ticket_types'),
    'the workflow verifies both event metadata and ticket rows after applying',
  );
}

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} assertion(s) failed.`);
  process.exit(1);
}

console.log('\nOK: July 19 KIRA Rooftop is consistently priced at 99 EUR.');
