// VTID-03849/03857 screenshot stub: the not-yet-deployed gateway BackOffice routes, mocked to the router's exact shapes.
// Never proxies anything; every response is canned. BRIDGE=down makes POST /commands answer 503 bridge_not_configured.
import http from 'node:http';
import fs from 'node:fs';
// VTID-03888: shapes resolve through a colon-separated dir chain (newest capture first).
const DIRS = (process.env.SHAPES_DIRS || process.env.SHAPES || '').split(':').filter(Boolean);
// A missing fixture must not kill the stub for the rest of the run (it did once, on
// set-opportunity-pipeline-stage): report it as an ERPClaw error so the run log names it.
const readShape = (n) => {
  const f = DIRS.map((d) => `${d}/${n}.txt`).find((p) => fs.existsSync(p)) || `${DIRS[0]}/${n}.txt`;
  if (!fs.existsSync(f)) { console.log('STUB MISSING SHAPE', n); return { status: 'error', message: `stub: no captured shape for ${n}` }; }
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.log('STUB BAD SHAPE', n, e.message); return { status: 'error', message: `stub: unreadable shape for ${n}` }; }
};
const BRIDGE = process.env.BRIDGE || 'up';
const CATALOG = ['crm.view','crm.manage','sales.view','sales.draft','sales.commit','finance.view','finance.approve','finance.pay','finance.reconcile','accounting.view','accounting.post','accounting.configure','accounting.close','reports.view','audit.view','approvals.policy','ops.view','ops.manage','ops.commit','hr.view','hr.manage','hr.approve','payroll.view','payroll.approve','marketing.view','marketing.manage','legal.view','legal.manage','legal.sign','erp.admin'];
const ME_ID = 'a27552a3-0257-4305-8ed0-351a80fd3701';
const PERSONA = process.env.PERSONA || 'admin';
const caps = PERSONA === 'sales' ? ['crm.view','sales.view'] : PERSONA === 'salesmanager' ? ['crm.view','crm.manage','sales.view','sales.draft'] : PERSONA === 'controller' ? ['accounting.view','accounting.post','accounting.close','reports.view','finance.view','finance.approve','sales.view','sales.commit'] : PERSONA === 'bookkeeper'
  ? ['finance.view','finance.reconcile','accounting.view','accounting.post','reports.view']
  : CATALOG.filter(c => !['finance.pay','accounting.close','hr.view','hr.manage','hr.approve','payroll.view','payroll.approve','ops.manage','ops.commit','marketing.manage','legal.manage','legal.sign'].includes(c));
const me = { ok: true, user_id: ME_ID, tenant_id: 't', role: PERSONA === 'bookkeeper' ? 'backoffice' : 'admin', is_exafy_admin: false, capabilities: caps, defaults: [], explicit: [], can_manage_access: PERSONA !== 'bookkeeper', catalog: CATALOG };
const ts = (h) => new Date(Date.UTC(2026, 8, 13, 6, 0, 0) + h * 3600e3).toISOString();
const receipt = (action, result, ms) => ({ status: 'executed', replayed: false, idempotency_key: 'k', action, tier: 'read', rc: 0, duration_ms: ms, result });
const commands = [
  { command_id: '9a1f4c2e-1111-4a1a-8b1b-000000000001', type: 'settings.company.list', action: 'list-companies', tier: 'read', status: 'executed', reason: null, approval_id: null, receipt: receipt('list-companies', readShape('list-companies'), 412), escalations: [], channel: 'web', requester_id: ME_ID, created_at: ts(3), executed_at: ts(3) },
  { command_id: '9a1f4c2e-2222-4a1a-8b1b-000000000002', type: 'finance.payment.submit', action: 'submit-payment', tier: 'high', status: 'awaiting_approval', reason: 'requires_approval', approval_id: 'ap-1', receipt: null, escalations: ['kind:pay'], channel: 'web', requester_id: ME_ID, created_at: ts(2.5), executed_at: null },
  { command_id: '9a1f4c2e-3333-4a1a-8b1b-000000000003', type: 'crm.lead.create', action: 'add-lead', tier: 'draft', status: 'executed', reason: null, approval_id: null, receipt: receipt('add-lead', { id: 'lead-7', name: 'Example Lead', status: 'ok' }, 388), escalations: [], channel: 'voice', requester_id: 'u-sales-00000000', created_at: ts(2), executed_at: ts(2) },
  { command_id: '9a1f4c2e-4444-4a1a-8b1b-000000000004', type: 'accounting.journal.submit', action: 'submit-journal-entry', tier: 'commit', status: 'failed', reason: 'erp_action_failed', approval_id: null, receipt: { status: 'failed', replayed: false, idempotency_key: 'k4', action: 'submit-journal-entry', tier: 'commit', rc: 1, duration_ms: 240, stderr_tail: 'journal entry is not balanced' }, escalations: [], channel: 'chat', requester_id: 'u-bookkeeper-0000', created_at: ts(1.5), executed_at: null },
  { command_id: '9a1f4c2e-5555-4a1a-8b1b-000000000005', type: 'crm.contact.remove', action: 'remove-crm-contact', tier: 'commit', status: 'rejected', reason: 'confirmation_required', approval_id: null, receipt: null, escalations: [], channel: 'voice', requester_id: 'u-sales-00000000', created_at: ts(1), executed_at: null },
  { command_id: '9a1f4c2e-6666-4a1a-8b1b-000000000006', type: 'accounting.journal.submit', action: 'submit-journal-entry', tier: 'high', status: 'awaiting_approval', reason: 'requires_approval', approval_id: 'ap-2', receipt: null, escalations: ['amount>=threshold'], channel: 'web', requester_id: 'u-bookkeeper-0000', created_at: ts(0.5), executed_at: null },
  { command_id: '9a1f4c2e-7777-4a1a-8b1b-000000000007', type: 'erp.health.read', action: 'status', tier: 'read', status: 'executed', reason: null, approval_id: null, receipt: { ...receipt('status', readShape('status'), 301), replayed: true }, escalations: [], channel: 'web', requester_id: ME_ID, created_at: ts(0.2), executed_at: ts(0.2) },
];
const approvals = [
  { id: 'ap-2', command_id: '9a1f4c2e-6666-4a1a-8b1b-000000000006', tenant_id: 't', requester_id: 'u-bookkeeper-0000', approve_capability: 'accounting.close', status: 'pending', reason: 'amount>=threshold', decided_by: null, decided_at: null, decision_note: null, created_at: ts(0.5), can_decide: PERSONA !== 'bookkeeper' && false },
  { id: 'ap-1', command_id: '9a1f4c2e-2222-4a1a-8b1b-000000000002', tenant_id: 't', requester_id: ME_ID, approve_capability: 'finance.pay', status: 'pending', reason: 'kind:pay', decided_by: null, decided_at: null, decision_note: null, created_at: ts(2.5), can_decide: false },
  { id: 'ap-0', command_id: '9a1f4c2e-0000-4a1a-8b1b-000000000000', tenant_id: 't', requester_id: 'u-sales-00000000', approve_capability: 'finance.approve', status: 'pending', reason: 'kind:credit_note', decided_by: null, decided_at: null, decision_note: null, created_at: ts(-2), can_decide: PERSONA !== 'bookkeeper', command: { command_id: '9a1f4c2e-0000-4a1a-8b1b-000000000000', type: 'sales.invoice.cancel', action: 'cancel-sales-invoice', tier: 'high', status: 'awaiting_approval', reason: 'awaiting_approval', approval_id: 'ap-0', receipt: null, escalations: [], channel: 'web', requester_id: 'u-sales-00000000', created_at: ts(-2), executed_at: null, replayed: false, payload: { sales_invoice_id: '581f87fe-b2bc-4568-ac47-bd5c0ef0baa3' }, resolved_payload: null } },
];
const approvedRows = [
  { id: 'ap-9', command_id: '9a1f4c2e-9999-4a1a-8b1b-000000000009', tenant_id: 't', requester_id: 'u-sales-00000000', approve_capability: 'finance.approve', status: 'approved', reason: 'kind:credit_note', decided_by: ME_ID, decided_at: ts(-20), decision_note: 'Reviewed against the signed credit note', created_at: ts(-26), can_decide: false },
];
const audit = [
  { id: 'au-1', tenant_id: 't', actor_id: ME_ID, actor_role: 'admin', channel: 'web', event: 'command.executed', command_id: commands[0].command_id, approval_id: null, details: { type: 'settings.company.list', tier: 'read' }, created_at: ts(3) },
  { id: 'au-2', tenant_id: 't', actor_id: ME_ID, actor_role: 'admin', channel: 'web', event: 'command.queued', command_id: commands[1].command_id, approval_id: 'ap-1', details: { type: 'finance.payment.submit', tier: 'high', escalations: ['kind:pay'] }, created_at: ts(2.5) },
  { id: 'au-3', tenant_id: 't', actor_id: 'u-sales-00000000', actor_role: 'backoffice', channel: 'voice', event: 'command.executed', command_id: commands[2].command_id, approval_id: null, details: { type: 'crm.lead.create', tier: 'draft' }, created_at: ts(2) },
  { id: 'au-4', tenant_id: 't', actor_id: 'u-bookkeeper-0000', actor_role: 'backoffice', channel: 'chat', event: 'command.failed', command_id: commands[3].command_id, approval_id: null, details: { type: 'accounting.journal.submit', reason: 'erp_action_failed' }, created_at: ts(1.5) },
  { id: 'au-5', tenant_id: 't', actor_id: 'u-sales-00000000', actor_role: 'backoffice', channel: 'voice', event: 'command.rejected', command_id: commands[4].command_id, approval_id: null, details: { type: 'crm.contact.remove', reason: 'confirmation_required' }, created_at: ts(1) },
  { id: 'au-6', tenant_id: 't', actor_id: ME_ID, actor_role: 'admin', channel: 'web', event: 'approval.approved', command_id: approvedRows[0].command_id, approval_id: 'ap-9', details: { approve_capability: 'finance.approve' }, created_at: ts(-20) },
  { id: 'au-7', tenant_id: 't', actor_id: ME_ID, actor_role: 'admin', channel: 'web', event: 'policy.updated', command_id: null, approval_id: null, details: { before: { high_risk_amount_threshold: 25000 }, after: { high_risk_amount_threshold: 25000 } }, created_at: ts(-30) },
];
const COMMIT_TYPES = new Set(['crm.lead.convert','crm.opportunity.mark_won','crm.opportunity.mark_lost','sales.invoice.submit','accounting.journal.submit']);
const HIGH_TYPES = new Map([['sales.invoice.cancel','finance.approve'],['accounting.journal.cancel','accounting.close']]);
const RESULTS = {'crm.lead.convert': 'convert-lead-to-opportunity', 'crm.opportunity.mark_won': 'mark-opportunity-won', 'crm.opportunity.mark_lost': 'mark-opportunity-lost', 'sales.invoice.submit': 'submit-sales-invoice', 'sales.invoice.cancel': 'cancel-sales-invoice', 'accounting.journal.submit': 'submit-journal-entry', 'accounting.journal.cancel': 'cancel-journal-entry', 'crm.lead.update': 'update-lead', 'crm.opportunity.update': 'update-opportunity', 'crm.opportunity.set_stage': 'set-opportunity-pipeline-stage', 'crm.task.update': 'update-crm-task', 'crm.task.complete': 'complete-crm-task', 'crm.task.cancel': 'cancel-crm-task', 'crm.pipeline_stage.list': 'list-crm-pipeline-stages',  'finance.payment.list': 'list-payments', 'finance.payment.get': 'get-payment', 'finance.payment.summary': 'payment-summary', 'finance.fx.list': 'list-currencies', 'finance.fx.list.list_exchange_rates': 'list-exchange-rates', 'crm.lead.list': 'list-leads', 'crm.lead.get': 'get-lead', 'crm.contact.list': 'list-crm-contacts', 'crm.company.list': 'list-crm-companies', 'crm.opportunity.list': 'list-opportunities', 'crm.pipeline.report': 'pipeline-report', 'crm.task.list': 'list-crm-tasks', 'crm.activity.list': 'list-activities', 'sales.customer.list': 'list-customers', 'sales.quotation.list': 'list-quotations', 'sales.quotation.get': 'get-quotation', 'sales.invoice.list': 'list-sales-invoices', 'sales.invoice.get': 'get-sales-invoice', 'sales.credit_note.list': 'list-credit-notes', 'erp.health.read': 'status', 'erp.health.read.check_installation': 'check-installation', 'erp.health.read.get_schema_version': 'get-schema-version', 'erp.health.read.list_modules': 'list-modules', 'audit.erp_log.read': 'get-audit-log', 'settings.company.list': 'list-companies', 'settings.company.get': 'get-company', 'accounting.period.list': 'list-fiscal-years', 'accounting.journal.list': 'list-journal-entries', 'accounting.journal.get': 'get-journal-entry', 'accounting.coa.list': 'list-accounts', 'accounting.coa.get': 'get-account', 'accounting.account.balance': 'get-account-balance', 'accounting.period.validate': 'validate-period-close', 'accounting.gl.integrity_check': 'check-gl-integrity', 'accounting.cost_center.list': 'list-cost-centers', 'reports.pnl': 'profit-and-loss', 'reports.ar_aging': 'ar-aging', 'reports.ap_aging': 'ap-aging', 'reports.balance_sheet': 'balance-sheet', 'reports.trial_balance': 'trial-balance', 'crm.lead.create': 'add-lead', 'crm.contact.create': 'add-crm-contact', 'crm.company.create': 'add-crm-company', 'crm.task.create': 'add-crm-task', 'crm.activity.create': 'add-activity', 'sales.customer.create': 'add-customer', 'sales.credit_note.create': 'create-credit-note', 'finance.payment.record': 'add-payment', 'accounting.journal.create': 'add-journal-entry' };
const CAPS_FOR = {'crm.lead.convert': ['crm.manage'], 'crm.opportunity.mark_won': ['crm.manage'], 'crm.opportunity.mark_lost': ['crm.manage'], 'sales.invoice.submit': ['sales.commit'], 'sales.invoice.cancel': ['sales.commit','finance.approve'], 'accounting.journal.submit': ['accounting.post','payroll.approve','accounting.close'], 'accounting.journal.cancel': ['accounting.close'], 'crm.lead.update': ['crm.manage'], 'crm.opportunity.update': ['crm.manage'], 'crm.opportunity.set_stage': ['crm.manage'], 'crm.task.update': ['crm.manage'], 'crm.task.complete': ['crm.manage'], 'crm.task.cancel': ['crm.manage'], 'crm.pipeline_stage.list': ['crm.view'],  'finance.payment.list': ['finance.view'], 'finance.payment.get': ['finance.view'], 'finance.payment.summary': ['finance.view'], 'finance.fx.list': ['finance.view'], 'finance.fx.list.list_exchange_rates': ['finance.view'], 'crm.lead.list': ['crm.view'], 'crm.lead.get': ['crm.view'], 'crm.contact.list': ['crm.view'], 'crm.company.list': ['crm.view'], 'crm.opportunity.list': ['crm.view'], 'crm.pipeline.report': ['crm.view'], 'crm.task.list': ['crm.view'], 'crm.activity.list': ['crm.view'], 'sales.customer.list': ['sales.view'], 'sales.quotation.list': ['sales.view'], 'sales.quotation.get': ['sales.view'], 'sales.invoice.list': ['sales.view'], 'sales.invoice.get': ['sales.view'], 'sales.credit_note.list': ['sales.view'], 'erp.health.read': ['erp.admin','audit.view'], 'audit.erp_log.read': ['audit.view'], 'settings.company.list': ['erp.admin','accounting.view'], 'settings.company.get': ['erp.admin','accounting.view'], 'accounting.period.list': ['accounting.view'], 'accounting.journal.list': ['accounting.view'], 'accounting.journal.get': ['accounting.view'], 'accounting.coa.list': ['accounting.view'], 'accounting.coa.get': ['accounting.view'], 'accounting.account.balance': ['accounting.view'], 'accounting.period.validate': ['accounting.view'], 'accounting.gl.integrity_check': ['accounting.view'], 'accounting.cost_center.list': ['accounting.view'], 'reports.pnl': ['reports.view'], 'reports.ar_aging': ['reports.view'], 'reports.ap_aging': ['reports.view'], 'reports.balance_sheet': ['reports.view'], 'reports.trial_balance': ['reports.view'], 'crm.lead.create': ['crm.manage'], 'crm.contact.create': ['crm.manage'], 'crm.company.create': ['crm.manage'], 'crm.task.create': ['crm.manage'], 'crm.activity.create': ['crm.manage'], 'sales.customer.create': ['sales.draft'], 'sales.credit_note.create': ['sales.draft'], 'finance.payment.record': ['finance.approve','accounting.post'], 'accounting.journal.create': ['accounting.post'] };
const DRAFT_TYPES = new Set(['crm.lead.update','crm.opportunity.update','crm.opportunity.set_stage','crm.task.update','crm.task.complete','crm.task.cancel','crm.lead.create','crm.contact.create','crm.company.create','crm.task.create','crm.activity.create','sales.customer.create','sales.credit_note.create','finance.payment.record','accounting.journal.create']);
const seenKeys = new Map();
let posts = 0;
const policyState = { high_risk_amount_threshold: 25000, require_mfa_for_high: true };
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://x'); let body = { ok: false, error: 'STUB_404' }, status = 404;
  const anyCap = me.capabilities.length > 0;
  if (u.pathname === '/api/v1/backoffice/me') { body = me; status = 200; }
  else if (u.pathname === '/api/v1/backoffice/commands' && req.method === 'GET') {
    const st = u.searchParams.get('status'); let rows = commands.filter(c => !st || c.status === st);
    if (!me.capabilities.includes('audit.view')) rows = rows.filter(r => r.requester_id === ME_ID);
    body = { ok: true, commands: rows }; status = 200;
  }
  else if (/^\/api\/v1\/backoffice\/commands\/[^/]+$/.test(u.pathname) && req.method === 'GET') {
    const id = u.pathname.split('/').pop(); const c = commands.find(x => x.command_id === id);
    const ap0 = approvals.find(a => a.command_id === id);
    if (c) { body = { ok: true, command: c }; status = 200; }
    else if (ap0) { body = { ok: true, command: ap0.command ?? { command_id: id, type: 'sales.credit_note.submit', action: 'submit-credit-note', tier: 'high', status: ap0.status === 'pending' ? 'awaiting_approval' : ap0.status === 'approved' ? 'executed' : 'rejected', reason: ap0.status === 'pending' ? 'awaiting_approval' : null, approval_id: ap0.id, receipt: null, escalations: ['kind:credit_note'], channel: 'web', requester_id: ap0.requester_id, created_at: ap0.created_at, executed_at: null, replayed: false } }; status = 200; }
    else { body = { ok: false, error: 'NOT_FOUND' }; status = 404; }
  }
  else if (u.pathname === '/api/v1/backoffice/commands' && req.method === 'POST') {
    let raw = ''; req.on('data', d => raw += d); req.on('end', () => {
      posts++; let b = {}; try { b = JSON.parse(raw); } catch {}
      const type = b.type; const isCommit = COMMIT_TYPES.has(type); const isHigh = HIGH_TYPES.has(type); const isDraft = DRAFT_TYPES.has(type) || isCommit || isHigh; const base = { command_id: `stub-${posts}`, type, action: RESULTS[type] || type, tier: isHigh ? 'high' : isCommit ? 'commit' : DRAFT_TYPES.has(type) ? 'draft' : 'read', channel: 'web', requester_id: ME_ID, created_at: new Date().toISOString(), escalations: [], approval_id: null, replayed: false };
      if (isDraft) console.log(isHigh ? 'HIGH' : isCommit ? 'COMMIT' : 'DRAFT', type, 'key=' + b.idempotency_key, 'confirm=' + b.confirm, 'payload=' + JSON.stringify(b.payload));
      if (isDraft && seenKeys.has(b.idempotency_key)) { const prev = seenKeys.get(b.idempotency_key); console.log('REPLAY', b.idempotency_key); res.writeHead(200, cors); return res.end(JSON.stringify({ ok: true, command: { ...prev, replayed: true } })); }
      const need = CAPS_FOR[type] || CAPS_FOR[type.replace(/\.(check_installation|get_schema_version|list_modules)$/, '')] || [];
      let out, st;
      if (!(RESULTS[type])) { out = { ok: false, error: 'INVALID_BODY', issues: ['type: unknown command type'] }; st = 400; }
      else if (need.length && !need.some(c => me.capabilities.includes(c))) { out = { ok: false, command: { ...base, status: 'rejected', reason: 'missing_capability', receipt: null, executed_at: null }, required_capability: need[0] }; st = 403; }
      else if (BRIDGE === 'down') { out = { ok: false, error: 'bridge_not_configured' }; st = 503; }
      // VTID-03888: the orchestrator's tier rules — Commit/High without confirm:true are rejected before anything runs; High never runs here, it is queued.
      else if ((isCommit || isHigh) && b.confirm !== true) { out = { ok: false, command: { ...base, status: 'rejected', reason: 'confirmation_required', receipt: null, executed_at: null } }; st = 403; }
      else if (isHigh) {
        const apId = `ap-new-${posts}`; const cmd = { ...base, status: 'awaiting_approval', reason: 'awaiting_approval', approval_id: apId, receipt: null, executed_at: null, payload: b.payload || {}, resolved_payload: null };
        approvals.unshift({ id: apId, command_id: cmd.command_id, tenant_id: 't', requester_id: ME_ID, approve_capability: HIGH_TYPES.get(type), status: 'pending', reason: 'awaiting_approval', decided_by: null, decided_at: null, decision_note: null, created_at: cmd.created_at, can_decide: false, command: cmd });
        commands.unshift(cmd); seenKeys.set(b.idempotency_key, cmd);
        out = { ok: true, command: cmd, approval: { approval_id: apId, approve_capability: HIGH_TYPES.get(type), status: 'pending', reason: 'awaiting_approval' } }; st = 202;
      }
      else {
        const shape = readShape(RESULTS[type]);
        // ERPClaw reported an error (rc != 0): the orchestrator maps that to 502 erp_action_failed with the receipt's stderr tail.
        if (shape && shape.status === 'error') { out = { ok: false, error: 'erp_action_failed', command: { ...base, status: 'failed', reason: 'erp_action_failed', executed_at: null, receipt: { status: 'failed', replayed: false, idempotency_key: 'k', action: RESULTS[type], tier: 'read', rc: 1, duration_ms: 120, stderr_tail: String(shape.message || shape.error || '').slice(0, 200) } } }; st = 502; }
        else { const cmd = { ...base, status: 'executed', reason: null, executed_at: new Date().toISOString(), receipt: { ...receipt(RESULTS[type], shape, 300 + posts), tier: base.tier, idempotency_key: b.idempotency_key } }; if (isDraft) seenKeys.set(b.idempotency_key, cmd); out = { ok: true, command: cmd }; st = 200; }
      }
      console.log('POST', type, st); res.writeHead(st, cors); res.end(JSON.stringify(out));
    }); return;
  }
  else if (/^\/api\/v1\/backoffice\/approvals\/[^/]+\/(approve|reject)$/.test(u.pathname) && req.method === 'POST') {
    const [, , , , , apId, verdict] = u.pathname.split('/');
    let raw = ''; req.on('data', d => raw += d); req.on('end', () => {
      let b = {}; try { b = JSON.parse(raw); } catch {}
      const ap = approvals.find(a => a.id === apId); let out, st;
      console.log('DECIDE', verdict, apId, 'note=' + JSON.stringify(b.note ?? null));
      if (!ap) { out = { ok: false, error: 'NOT_FOUND' }; st = 404; }
      else if (ap.status !== 'pending') { out = { ok: false, error: 'ALREADY_DECIDED', status: ap.status }; st = 409; }
      else if (ap.requester_id === ME_ID) { out = { ok: false, error: 'self_approval_forbidden' }; st = 403; }
      else if (!me.capabilities.includes(ap.approve_capability)) { out = { ok: false, error: 'approver_capability_missing' }; st = 403; }
      else {
        const now = new Date().toISOString(); ap.status = verdict === 'approve' ? 'approved' : 'rejected'; ap.decided_by = ME_ID; ap.decided_at = now; ap.decision_note = b.note ?? null;
        const cmd = { command_id: ap.command_id, type: 'sales.credit_note.submit', action: 'submit-credit-note', tier: 'high', channel: 'web', requester_id: ap.requester_id, created_at: ap.created_at, escalations: ['kind:credit_note'], approval_id: ap.id, replayed: false, reason: null, executed_at: verdict === 'approve' ? now : null };
        if (verdict === 'reject') { out = { ok: true, command: { ...cmd, status: 'rejected', reason: 'approval_rejected', receipt: null } }; st = 200; }
        else if (BRIDGE === 'down') { out = { ok: false, command: { ...cmd, status: 'failed', reason: 'bridge_not_configured', receipt: { error: 'bridge_not_configured' } } }; st = 502; }
        else { out = { ok: true, command: { ...cmd, status: 'executed', receipt: { status: 'executed', replayed: false, idempotency_key: 'k-ap', action: 'submit-credit-note', tier: 'high', rc: 0, duration_ms: 640, result: { status: 'ok', credit_note_id: '5d1c0c47-derived-4c0d-9d3e-000000000001', message: 'Credit note submitted' } } } }; st = 200; }
        audit.unshift({ id: 'au-dec-' + posts, tenant_id: 't', actor_id: ME_ID, actor_role: me.role, channel: 'web', event: 'approval.' + ap.status, command_id: ap.command_id, approval_id: ap.id, details: { note: b.note ?? null }, created_at: now });
      }
      console.log('POST', u.pathname, st); res.writeHead(st, cors); res.end(JSON.stringify(out));
    }); return;
  }
  else if (u.pathname === '/api/v1/backoffice/policy' && req.method === 'PUT') {
    let raw = ''; req.on('data', d => raw += d); req.on('end', () => {
      let b = {}; try { b = JSON.parse(raw); } catch {}
      console.log('POLICY PUT', JSON.stringify(b));
      let out, st;
      if (!me.capabilities.includes('approvals.policy')) { out = { ok: false, error: 'FORBIDDEN', required: 'approvals.policy' }; st = 403; }
      else if (typeof b.high_risk_amount_threshold !== 'number' || typeof b.require_mfa_for_high !== 'boolean') { out = { ok: false, error: 'INVALID_BODY' }; st = 400; }
      else { policyState.high_risk_amount_threshold = b.high_risk_amount_threshold; policyState.require_mfa_for_high = b.require_mfa_for_high; out = { ok: true, policy: { ...policyState } }; st = 200; }
      console.log('PUT', u.pathname, st); res.writeHead(st, cors); res.end(JSON.stringify(out));
    }); return;
  }
  else if (u.pathname === '/api/v1/backoffice/approvals') {
    if (!anyCap) { body = { ok: false, error: 'FORBIDDEN' }; status = 403; }
    else { const st = u.searchParams.get('status') || 'pending'; body = { ok: true, approvals: st === 'approved' ? approvedRows : st === 'rejected' ? [] : approvals }; status = 200; }
  }
  else if (u.pathname === '/api/v1/backoffice/audit') { if (!me.capabilities.includes('audit.view')) { body = { ok: false, error: 'FORBIDDEN', required: 'audit.view' }; status = 403; } else { body = { ok: true, audit }; status = 200; } }
  else if (u.pathname === '/api/v1/backoffice/policy' && req.method === 'GET') { if (!me.capabilities.some(c => c === 'approvals.policy' || c === 'audit.view')) { body = { ok: false, error: 'FORBIDDEN' }; status = 403; } else { body = { ok: true, policy: { ...policyState }, defaults: { high_risk_amount_threshold: 25000, require_mfa_for_high: true } }; status = 200; } }
  else if (u.pathname === '/api/v1/admin/users') { body = { ok: true, users: [], total: 0 }; status = 200; }
  else if (req.method !== 'GET') { body = { ok: false, error: 'STUB_WRITE_BLOCKED' }; status = 403; }
  console.log(req.method, u.pathname, status);
  res.writeHead(status, cors); res.end(JSON.stringify(body));
}).listen(8090, '127.0.0.1', () => console.log(`stub on 8090 persona=${PERSONA} bridge=${BRIDGE}`));
