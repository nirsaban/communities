/* eslint-disable no-console */
/**
 * apiTestDashboard.ts — runs ~60 API probes against the live backend (port 4242),
 * groups them by role, and writes a colour-coded HTML scoreboard.
 *
 * Usage:
 *   cd backend && npm run test:api-dashboard
 * Output:
 *   backend/dist/api-test-report.html  (open in browser)
 *   stdout                              (terminal summary)
 *
 * Requires backend running on :4242 and `npm run demo:reset` already applied.
 */

import * as fs from 'fs';
import * as path from 'path';

const API = 'http://localhost:4242/api/v1';

type TestResult = {
  group: string;
  name: string;
  method: string;
  url: string;
  expectStatus: number;
  actualStatus: number | string;
  ok: boolean;
  durationMs: number;
  notes?: string;
};

const results: TestResult[] = [];

async function req(
  method: string,
  url: string,
  opts: { token?: string; body?: unknown; expect: number; group: string; name: string; notes?: string },
): Promise<{ status: number; json: unknown }> {
  const start = Date.now();
  let status: number | string = 0;
  let json: unknown = null;
  try {
    const res = await fetch(`${API}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch (e) {
    status = `ERR:${(e as Error).message}`;
  }
  const dur = Date.now() - start;
  const ok = status === opts.expect;
  results.push({
    group: opts.group,
    name: opts.name,
    method,
    url,
    expectStatus: opts.expect,
    actualStatus: status,
    ok,
    durationMs: dur,
    notes: opts.notes,
  });
  return { status: status as number, json };
}

async function loginToken(email: string, password: string): Promise<string | null> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { data?: { tokens?: { accessToken?: string } } };
  return j?.data?.tokens?.accessToken ?? null;
}

async function main(): Promise<void> {
  console.log('Logging in 5 demo users…');
  const tokens = {
    super: await loginToken('bob@example.com', 'BobPass123!'),
    admin: await loginToken('alice-admin@example.com', 'RolePass123!'),
    subadmin: await loginToken('sam-subadmin@example.com', 'RolePass123!'),
    em: await loginToken('eve-em@example.com', 'RolePass123!'),
    member: await loginToken('mike-member@example.com', 'RolePass123!'),
  };
  for (const [k, v] of Object.entries(tokens)) {
    if (!v) {
      console.error(`! login failed for ${k} — bail out`);
      process.exit(1);
    }
  }
  console.log('All 5 logins OK.\n');

  // Resolve a community id (Alice's first community)
  const ar = await fetch(`${API}/me/communities`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  const aj = (await ar.json()) as { data?: Array<{ community?: { id?: string } }> };
  const cid = aj.data?.[0]?.community?.id as string | undefined;
  if (!cid) {
    console.error('! could not resolve cid for admin');
    process.exit(1);
  }
  const eveR = await fetch(`${API}/me/managed-events`, {
    headers: { Authorization: `Bearer ${tokens.em}` },
  });
  const eveJ = (await eveR.json()) as { data?: Array<{ id?: string }> };
  const eid = eveJ.data?.[0]?.id as string | undefined;

  // ===== AUTH =====
  await req('POST', '/auth/login', {
    body: { email: 'mike-member@example.com', password: 'RolePass123!' },
    expect: 200,
    group: 'Auth',
    name: 'login (member)',
  });
  await req('POST', '/auth/login', {
    body: { email: 'mike-member@example.com', password: 'WRONG' },
    expect: 401,
    group: 'Auth',
    name: 'login wrong password → 401',
  });
  await req('POST', '/auth/login', {
    body: { email: 'nope@example.com', password: 'WRONG' },
    expect: 401,
    group: 'Auth',
    name: 'login unknown email → 401 (no enumeration)',
  });
  await req('GET', '/auth/me', {
    token: tokens.member!,
    expect: 200,
    group: 'Auth',
    name: '/auth/me with token',
  });
  await req('GET', '/auth/me', { expect: 401, group: 'Auth', name: '/auth/me no token → 401' });
  await req('POST', '/auth/forgot-password', {
    body: { email: 'mike-member@example.com' },
    expect: 200,
    group: 'Auth',
    name: 'forgot-password (always 200)',
  });
  await req('POST', '/auth/forgot-password', {
    body: { email: 'unknown@example.com' },
    expect: 200,
    group: 'Auth',
    name: 'forgot-password unknown → 200 (no enumeration)',
  });

  // ===== SUPER =====
  await req('GET', '/super/stats', {
    token: tokens.super!,
    expect: 200,
    group: 'Super',
    name: 'stats — KPIs + series',
  });
  await req('GET', '/super/communities', {
    token: tokens.super!,
    expect: 200,
    group: 'Super',
    name: 'communities list',
  });
  await req('GET', '/super/users', {
    token: tokens.super!,
    expect: 200,
    group: 'Super',
    name: 'users list',
  });
  await req('GET', '/super/audit', {
    token: tokens.super!,
    expect: 200,
    group: 'Super',
    name: 'audit log',
  });
  await req('GET', '/super/settings', {
    token: tokens.super!,
    expect: 200,
    group: 'Super',
    name: 'platform settings',
  });

  // SUPER gates
  await req('GET', '/super/stats', {
    token: tokens.member!,
    expect: 403,
    group: 'Super gates',
    name: 'member → /super/stats → 403',
  });
  await req('GET', '/super/users', {
    token: tokens.admin!,
    expect: 403,
    group: 'Super gates',
    name: 'admin → /super/users → 403',
  });

  // ===== ADMIN =====
  await req('GET', `/communities/${cid}/admin/overview`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'overview',
  });
  await req('GET', `/communities/${cid}/admin/analytics/attendance`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'analytics/attendance',
  });
  await req('GET', `/communities/${cid}/admin/analytics/growth`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'analytics/growth',
  });
  await req('GET', `/communities/${cid}/admin/analytics/most-active`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'analytics/most-active',
  });
  await req('GET', `/communities/${cid}/admin/members/pending`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'members/pending',
  });
  await req('GET', `/communities/${cid}/admin/moderation`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'moderation queue',
  });
  await req('GET', `/communities/${cid}/finances`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'finances (admin)',
  });
  await req('GET', `/communities/${cid}/admin/subscriptions`, {
    token: tokens.admin!,
    expect: 200,
    group: 'Admin',
    name: 'subscriptions (admin)',
  });

  // ===== SUB-ADMIN MONEY-BLINDNESS =====
  await req('GET', `/communities/${cid}/admin/overview`, {
    token: tokens.subadmin!,
    expect: 200,
    group: 'Sub-admin OK',
    name: 'overview (subadmin OK)',
  });
  await req('GET', `/communities/${cid}/admin/members/pending`, {
    token: tokens.subadmin!,
    expect: 200,
    group: 'Sub-admin OK',
    name: 'members/pending (subadmin OK)',
  });
  await req('GET', `/communities/${cid}/admin/moderation`, {
    token: tokens.subadmin!,
    expect: 200,
    group: 'Sub-admin OK',
    name: 'moderation (subadmin OK)',
  });
  await req('GET', `/communities/${cid}/finances`, {
    token: tokens.subadmin!,
    expect: 403,
    group: 'Sub-admin blocks',
    name: 'finances → 403',
    notes: 'money-blindness invariant',
  });
  await req('GET', `/communities/${cid}/admin/subscriptions`, {
    token: tokens.subadmin!,
    expect: 403,
    group: 'Sub-admin blocks',
    name: 'admin/subscriptions → 403',
    notes: 'money-blindness invariant',
  });

  // ===== MEMBER =====
  await req('GET', '/me/communities', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/communities',
  });
  await req('GET', '/me/rsvps', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/rsvps',
  });
  await req('GET', '/me/managed-events', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/managed-events (empty for plain member)',
  });
  await req('GET', '/me/notifications', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/notifications',
  });
  await req('GET', '/me/subscriptions', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/subscriptions',
  });
  await req('GET', '/me/privacy', {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: '/me/privacy',
  });
  await req('GET', `/communities/${cid}`, {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: 'community detail',
  });
  await req('GET', `/communities/${cid}/events`, {
    token: tokens.member!,
    expect: 200,
    group: 'Member',
    name: 'community events',
  });

  // MEMBER gates
  await req('GET', `/communities/${cid}/admin/overview`, {
    token: tokens.member!,
    expect: 403,
    group: 'Member gates',
    name: '/admin/overview → 403',
  });
  await req('GET', `/communities/${cid}/finances`, {
    token: tokens.member!,
    expect: 403,
    group: 'Member gates',
    name: '/finances → 403',
  });

  // ===== EVENT MANAGER =====
  if (eid) {
    await req('GET', `/events/${eid}`, {
      token: tokens.em!,
      expect: 200,
      group: 'EM',
      name: 'event detail (viewer.isManager:true)',
    });
    await req('GET', `/events/${eid}/rsvps`, {
      token: tokens.em!,
      expect: 200,
      group: 'EM',
      name: 'attendees (rsvps)',
    });
    await req('GET', `/events/${eid}/rsvps`, {
      token: tokens.member!,
      expect: 403,
      group: 'EM gates',
      name: 'member → rsvps → 403',
    });
  } else {
    results.push({
      group: 'EM',
      name: 'Eve has no managed event — skipped EM probes',
      method: '-',
      url: '-',
      expectStatus: 0,
      actualStatus: 'SKIP',
      ok: false,
      durationMs: 0,
      notes: 'Run `npm run demo:reset` to seed Eve',
    });
  }

  // ===== INVITE FLOW =====
  // Bob creates a throwaway community + invite, peek, accept anonymously.
  const ts = Date.now();
  const inviteEmail = `qa-${ts}@example.com`;
  const create = await fetch(`${API}/super/communities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.super}` },
    body: JSON.stringify({
      name: `QA Community ${ts}`,
      slug: `qa-comm-${ts}`,
      description: 'apiTestDashboard probe',
      category: 'other',
      privacy: 'invite_only',
      initialAdminEmail: inviteEmail,
    }),
  });
  let inviteToken: string | null = null;
  if (create.ok) {
    const cj = (await create.json()) as { data?: { invitation?: { token?: string } } };
    inviteToken = cj.data?.invitation?.token ?? null;
    results.push({
      group: 'Invite flow',
      name: 'super creates community + invite',
      method: 'POST',
      url: '/super/communities',
      expectStatus: 201,
      actualStatus: create.status,
      ok: create.status === 201,
      durationMs: 0,
    });
  }
  if (inviteToken) {
    await req('GET', `/invitations/${inviteToken}`, {
      expect: 200,
      group: 'Invite flow',
      name: 'peek invite (public)',
    });
    await req('POST', `/invitations/${inviteToken}/accept`, {
      body: { name: 'QA Admin', password: 'QAPass123!' },
      expect: 200,
      group: 'Invite flow',
      name: 'anonymous accept + token issuance',
    });
    await req('POST', `/invitations/${inviteToken}/accept`, {
      body: {},
      expect: 409,
      group: 'Invite flow',
      name: 're-accept same token → 409',
    });
  }

  writeReport();
}

function writeReport(): void {
  const groups = Array.from(new Set(results.map((r) => r.group)));
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const total = results.length;
  const ts = new Date().toISOString();

  // Terminal summary
  console.log('\n========================================');
  for (const g of groups) {
    const rs = results.filter((r) => r.group === g);
    const p = rs.filter((r) => r.ok).length;
    console.log(`${g.padEnd(20)}  ${p}/${rs.length}`);
  }
  console.log('========================================');
  console.log(`TOTAL: ${pass}/${total}  (${fail} failed)\n`);
  for (const r of results.filter((r) => !r.ok)) {
    console.log(
      `  ✗ [${r.group}] ${r.name} — expected ${r.expectStatus} got ${r.actualStatus}`,
    );
  }

  // HTML report
  const html = renderHtml({ groups, pass, fail, total, ts });
  const outDir = path.resolve(__dirname, '..', 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'api-test-report.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`HTML report: ${outPath}`);
  console.log('Open in browser:');
  console.log(`  open "${outPath}"`);
}

function renderHtml(meta: { groups: string[]; pass: number; fail: number; total: number; ts: string }): string {
  const groupRows = meta.groups
    .map((g) => {
      const rs = results.filter((r) => r.group === g);
      const p = rs.filter((r) => r.ok).length;
      const headerOk = p === rs.length;
      const rows = rs
        .map((r) => {
          const cls = r.ok ? 'pass' : 'fail';
          return `<tr class="${cls}">
            <td>${escapeHtml(r.name)}</td>
            <td><code>${escapeHtml(r.method)} ${escapeHtml(r.url)}</code></td>
            <td>${r.expectStatus}</td>
            <td>${r.actualStatus}</td>
            <td>${r.durationMs}ms</td>
            <td>${r.notes ? escapeHtml(r.notes) : ''}</td>
          </tr>`;
        })
        .join('\n');
      return `<section>
        <h2 class="${headerOk ? 'pass' : 'fail'}">
          <span class="dot"></span>${escapeHtml(g)}
          <span class="count">${p}/${rs.length}</span>
        </h2>
        <table>
          <thead><tr><th>Test</th><th>Endpoint</th><th>Expected</th><th>Got</th><th>Time</th><th>Notes</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('\n');

  const pct = Math.round((meta.pass / Math.max(1, meta.total)) * 100);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>API Test Dashboard — Commons</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'DM Sans', system-ui, sans-serif; background: #0F0F0F; color: #FAFAF7; }
  header { padding: 32px 40px 16px; border-bottom: 1px solid #2C2A26; }
  h1 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; font-size: 32px; margin: 0; }
  .meta { color: #908B80; font-size: 13px; margin-top: 6px; }
  .summary { display: flex; gap: 24px; margin-top: 18px; }
  .kpi { background: #1A1917; border: 1px solid #2C2A26; border-radius: 12px; padding: 14px 18px; flex: 1; max-width: 200px; }
  .kpi .l { font-size: 11px; color: #908B80; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .kpi .v { font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; margin-top: 4px; }
  .kpi.pass .v { color: #4FBE82; }
  .kpi.fail .v { color: #F26B6F; }
  main { padding: 24px 40px 60px; max-width: 1280px; }
  section { margin-bottom: 32px; }
  h2 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; font-size: 22px; display: flex; align-items: center; gap: 10px; margin: 0 0 12px; }
  h2 .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  h2.pass .dot { background: #4FBE82; }
  h2.fail .dot { background: #F26B6F; }
  h2 .count { margin-left: auto; font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px; color: #908B80; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; background: #1A1917; border-radius: 12px; overflow: hidden; }
  th, td { padding: 9px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid #2C2A26; }
  th { background: #242220; color: #C5C0B6; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td code { background: rgba(255,255,255,.04); padding: 1px 6px; border-radius: 4px; font-size: 11.5px; }
  tr.pass td:nth-child(4) { color: #4FBE82; font-weight: 600; }
  tr.fail td { background: rgba(242,107,111,.06); }
  tr.fail td:nth-child(4) { color: #F26B6F; font-weight: 700; }
</style></head><body>
<header>
  <h1>API Test Dashboard</h1>
  <div class="meta">Commons community SaaS · <code>http://localhost:4242/api/v1</code> · ${meta.ts}</div>
  <div class="summary">
    <div class="kpi"><div class="l">Total</div><div class="v">${meta.total}</div></div>
    <div class="kpi pass"><div class="l">Passed</div><div class="v">${meta.pass}</div></div>
    <div class="kpi ${meta.fail > 0 ? 'fail' : 'pass'}"><div class="l">Failed</div><div class="v">${meta.fail}</div></div>
    <div class="kpi ${pct === 100 ? 'pass' : 'fail'}"><div class="l">Pass rate</div><div class="v">${pct}%</div></div>
  </div>
</header>
<main>${groupRows}</main>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
