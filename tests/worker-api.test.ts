import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { exportJWK, SignJWT } from 'jose';

const projectId = 'portfoliohubs-update';
const keyId = 'portfoliohubs-worker-test-key';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...(await exportJWK(publicKey)), kid: keyId, use: 'sig', alg: 'RS256' };
const jwksServer = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' });
  response.end(JSON.stringify({ keys: [publicJwk] }));
});
await new Promise<void>((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
const jwksAddress = jwksServer.address();
if (!jwksAddress || typeof jwksAddress === 'string') throw new Error('Could not start test JWKS server.');

class LocalStatement {
  private parameters: unknown[] = [];

  constructor(private readonly database: DatabaseSync, private readonly sql: string) {}

  bind(...values: unknown[]) {
    this.parameters = values;
    return this;
  }

  async first<T>() {
    return (this.database.prepare(this.sql).get(...this.parameters as never[]) as T | undefined) || null;
  }

  async all<T>() {
    return { results: this.database.prepare(this.sql).all(...this.parameters as never[]) as T[] };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.parameters as never[]);
    return { meta: { changes: Number(result.changes) } };
  }
}

class LocalD1 {
  constructor(private readonly database: DatabaseSync) {}

  prepare(sql: string) {
    return new LocalStatement(this.database, sql);
  }

  async batch(statements: LocalStatement[]) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

const localDatabase = new DatabaseSync(':memory:');
localDatabase.exec(await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
localDatabase.exec(await readFile(new URL('../migrations/0004_promo_redemptions.sql', import.meta.url), 'utf8'));
const DB = new LocalD1(localDatabase);
const env = {
  DB,
  FIREBASE_PROJECT_ID: projectId,
  FIREBASE_JWKS_URL: `http://127.0.0.1:${jwksAddress.port}/.well-known/jwks.json`,
  IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/test',
  IMAGEKIT_PUBLIC_KEY: 'public-test-key',
  IMAGEKIT_PRIVATE_KEY: '',
} as never;
const worker = (await import('../worker/index.ts')).default;

after(async () => {
  await new Promise<void>((resolve) => jwksServer.close(() => resolve()));
  localDatabase.close();
});

async function issueToken(email: string, uid: string, emailVerified = true) {
  return new SignJWT({ email, email_verified: emailVerified })
    .setProtectedHeader({ alg: 'RS256', kid: keyId, typ: 'JWT' })
    .setIssuer(`https://securetoken.google.com/${projectId}`)
    .setAudience(projectId)
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

async function request(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return worker.fetch(new Request(`https://worker.example${path}`, { ...init, headers }), env);
}

test('Worker rejects missing, unverified, and non-allowlisted identities for admin routes', async () => {
  const missing = await request('/api/admin/doctors');
  assert.equal(missing.status, 401);

  const unverified = await request('/api/admin/doctors', await issueToken('admin@portfoliohubs.com', 'unverified-worker-admin', false));
  assert.equal(unverified.status, 403);

  const dynamic = await request('/api/admin/doctors', await issueToken('dynamic@example.test', 'dynamic-worker-admin'));
  assert.equal(dynamic.status, 403);
});

test('a verified static admin can access the D1 admin route', async () => {
  const token = await issueToken('admin@portfoliohubs.com', 'static-worker-admin');
  const response = await request('/api/admin/doctors', token);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('admin doctor updates are persisted in D1 and appear in the admin list', async () => {
  localDatabase.prepare('INSERT INTO users (uid, email, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run('doctor-d1', 'doctor@example.test', JSON.stringify({ fullName: 'Test Doctor', status: 'pending_review', caseLimit: 3 }), 'created', 'created');
  const updateUrl = '/api/admin/doctors/doctor-d1';
  const method = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'published', active: true, caseLimit: 8 }) };

  const denied = await request(updateUrl, await issueToken('doctor@example.test', 'ordinary-user'), method);
  assert.equal(denied.status, 403);

  const adminToken = await issueToken('admin@portfoliohubs.com', 'static-admin-edit');
  const updated = await request(updateUrl, adminToken, method);
  assert.equal(updated.status, 200);
  const updatedBody = await updated.json() as { data: { status: string; active: boolean; caseLimit: number } };
  assert.equal(updatedBody.data.status, 'published');
  assert.equal(updatedBody.data.active, true);
  assert.equal(updatedBody.data.caseLimit, 8);

  const adminList = await request('/api/admin/doctors', adminToken);
  const doctors = await adminList.json() as Array<{ uid: string; status: string; caseLimit: number }>;
  assert.deepEqual(doctors.filter((doctor) => doctor.uid === 'doctor-d1').map(({ status, caseLimit }) => ({ status, caseLimit })), [
    { status: 'published', caseLimit: 8 },
  ]);

  const invalid = await request(updateUrl, adminToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin: true }),
  });
  assert.equal(invalid.status, 400);
});

test('admin approval atomically reserves a slug and publishes the current D1 profile and cases', async () => {
  localDatabase.prepare('INSERT INTO users (uid, email, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run('publish-doctor', 'publish@example.test', JSON.stringify({ fullName: 'Publish Test', status: 'pending_review', hasUnreviewedChanges: true }), 'created', 'created');
  localDatabase.prepare('INSERT INTO portfolios (uid, data_json, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run('publish-doctor', JSON.stringify({ title: 'Periodontist', university: 'Dental School' }), 'created', 'created');
  localDatabase.prepare('INSERT INTO cases (id, uid, data_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('publish-case', 'publish-doctor', JSON.stringify({ title: 'Restoration', photos: [{ url: 'https://images.example/case.webp' }] }), 0, 'created', 'created');
  localDatabase.prepare('INSERT INTO slugs (slug, uid, created_at) VALUES (?, ?, ?)')
    .run('taken-slug', 'another-doctor', 'created');

  const adminToken = await issueToken('admin@portfoliohubs.com', 'publish-admin');
  const approve = (slug: string) => request('/api/admin/doctors/publish-doctor/approve', adminToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });

  const collision = await approve('taken-slug');
  assert.equal(collision.status, 409);
  assert.equal(localDatabase.prepare('SELECT uid FROM slugs WHERE slug = ?').get('taken-slug')?.uid, 'another-doctor');

  const approved = await approve('publish-doctor');
  assert.equal(approved.status, 200);
  const approvalResult = await approved.json() as { doctor: { status: string; hasUnreviewedChanges: boolean } };
  assert.equal(approvalResult.doctor.status, 'published');
  assert.equal(approvalResult.doctor.hasUnreviewedChanges, false);

  const publicResponse = await request('/api/website/publish-doctor');
  assert.equal(publicResponse.status, 200);
  const publicWebsite = await publicResponse.json() as { data: { fullName: string; title: string; cases: Array<{ title: string; photos: Array<{ url: string }> }> } };
  assert.equal(publicWebsite.data.fullName, 'Publish Test');
  assert.equal(publicWebsite.data.title, 'Periodontist');
  assert.equal(publicWebsite.data.cases[0].title, 'Restoration');
  assert.equal(publicWebsite.data.cases[0].photos[0].url, 'https://images.example/case.webp');
});

test('non-admin users cannot publish a D1 website', async () => {
  const token = await issueToken('doctor@example.test', 'unapproved-doctor');
  const response = await worker.fetch(new Request('https://worker.example/api/publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'unapproved-doctor' }),
  }), env);
  assert.equal(response.status, 403);
});

test('Worker promo redemption grants once per user and enforces the global limit', async () => {
  const insertUser = localDatabase.prepare('INSERT INTO users (uid, email, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('promo-alice', 'alice@example.test', JSON.stringify({ caseLimit: 3 }), 'created', 'created');
  insertUser.run('promo-bob', 'bob@example.test', JSON.stringify({ caseLimit: 3 }), 'created', 'created');
  localDatabase.prepare('INSERT INTO promo_codes (code, data_json, redeemed_count, updated_at) VALUES (?, ?, ?, ?)')
    .run('ONCE', JSON.stringify({ active: true, caseLimit: 5, maxRedemptions: 1 }), 0, 'created');

  const aliceToken = await issueToken('alice@example.test', 'promo-alice');
  const redeem = (token: string) => worker.fetch(new Request('https://worker.example/api/promo/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'ONCE' }),
  }), env);

  const first = await redeem(aliceToken);
  assert.equal(first.status, 200);
  assert.equal((await first.json() as { caseLimit: number }).caseLimit, 5);

  const repeated = await redeem(aliceToken);
  assert.equal(repeated.status, 400);

  const bobToken = await issueToken('bob@example.test', 'promo-bob');
  const exhausted = await redeem(bobToken);
  assert.equal(exhausted.status, 400);
  assert.equal(localDatabase.prepare('SELECT redeemed_count FROM promo_codes WHERE code = ?').get('ONCE')?.redeemed_count, 1);
  assert.equal(JSON.parse(String(localDatabase.prepare('SELECT data_json FROM users WHERE uid = ?').get('promo-bob')?.data_json)).caseLimit, 3);
  assert.equal(localDatabase.prepare('SELECT COUNT(*) AS total FROM promo_redemptions WHERE code = ?').get('ONCE')?.total, 1);
});

test('GET /api/profile returns synthesized default schema (never 404) for newly registered doctor', async () => {
  const newUserToken = await issueToken('brandnewdr@example.test', 'new-dr-123');
  const response = await request('/api/profile', newUserToken);
  assert.equal(response.status, 200);
  const body = await response.json() as { uid: string; data: { email: string; title: string; caseLimit: number; status: string } };
  assert.equal(body.uid, 'new-dr-123');
  assert.equal(body.data.email, 'brandnewdr@example.test');
  assert.equal(body.data.title, 'Dental Surgeon');
  assert.equal(body.data.caseLimit, 3);
  assert.equal(body.data.status, 'pending_review');
});

test('Cases CRUD and reordering operate atomically with sort_order and limit enforcement', async () => {
  const drToken = await issueToken('casedr@example.test', 'case-dr-456');
  
  // 1. Add 3 cases
  for (let i = 1; i <= 3; i++) {
    const res = await request('/api/cases', drToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: `c-${i}`, title: `Case ${i}`, sortOrder: i - 1 }),
    });
    assert.equal(res.status, 200);
  }

  // 2. 4th case should be rejected by case limit (limit is 3 by default)
  const fourthRes = await request('/api/cases', drToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'c-4', title: 'Case 4' }),
  });
  assert.equal(fourthRes.status, 403);

  // 3. Reorder cases
  const reorderRes = await request('/api/cases/reorder', drToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ['c-3', 'c-1', 'c-2'] }),
  });
  assert.equal(reorderRes.status, 200);

  // 4. Retrieve ordered cases
  const getCasesRes = await request('/api/cases', drToken);
  assert.equal(getCasesRes.status, 200);
  const cases = await getCasesRes.json() as Array<{ id: string; sort_order: number }>;
  assert.equal(cases.length, 3);
  assert.equal(cases[0].id, 'c-3');
  assert.equal(cases[1].id, 'c-1');
  assert.equal(cases[2].id, 'c-2');
});
