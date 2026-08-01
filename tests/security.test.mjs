import assert from 'node:assert/strict';
import test from 'node:test';
import { canMutateProject, canReadProject } from '../src/lib/project-access.ts';
import { getOriginRejection } from '../src/lib/request-origin.ts';
import { hashSecurityKey } from '../src/lib/security-hash.ts';
import { buildContentSecurityPolicy } from '../src/lib/content-security-policy.ts';
import { authCredentialsSchema, signupCredentialsSchema } from '../src/lib/auth-validation.ts';
import { updateProjectSchema } from '../src/lib/project-validation.ts';

const contributor = {
  uid: 'auth-1',
  email: 'engineer@example.com',
  role: 'contributor',
  dbUserId: '11111111-1111-4111-8111-111111111111',
  name: 'Engineer',
  createdAt: '2026-01-01T00:00:00Z',
  assuranceLevel: 'aal1',
};

const admin = { ...contributor, role: 'admin', assuranceLevel: 'aal2' };
const ownDraft = { id: 'p1', submitted_by: contributor.dbUserId, status: 'draft' };
const otherDraft = { id: 'p2', submitted_by: '22222222-2222-4222-8222-222222222222', status: 'draft' };
const otherApproved = { ...otherDraft, status: 'approved' };

test('project access keeps other contributors drafts private', () => {
  assert.equal(canReadProject(contributor, ownDraft), true);
  assert.equal(canReadProject(contributor, otherDraft), false);
  assert.equal(canReadProject(contributor, otherApproved), true);
  assert.equal(canReadProject(admin, otherDraft), true);
});

test('project mutation requires ownership or admin role', () => {
  assert.equal(canMutateProject(contributor, ownDraft), true);
  assert.equal(canMutateProject(contributor, otherDraft), false);
  assert.equal(canMutateProject(contributor, otherApproved), false);
  assert.equal(canMutateProject(admin, otherApproved), true);
});

test('project patch schema blocks protected-column mass assignment', () => {
  assert.equal(updateProjectSchema.safeParse({ project_name: 'Allowed' }).success, true);
  assert.equal(updateProjectSchema.safeParse({ status: 'approved' }).success, false);
  assert.equal(updateProjectSchema.safeParse({ submitted_by: contributor.dbUserId }).success, false);
  assert.equal(updateProjectSchema.safeParse({}).success, false);
});

test('signup passwords require length and mixed character classes', () => {
  assert.equal(authCredentialsSchema.safeParse({ email: 'a@b.com', password: 'existing' }).success, true);
  assert.equal(signupCredentialsSchema.safeParse({ email: 'a@b.com', password: 'weakpassword' }).success, false);
  assert.equal(signupCredentialsSchema.safeParse({ email: 'a@b.com', password: 'StrongPass12!' }).success, true);
});

test('mutation origin validation blocks cross-site requests', () => {
  assert.equal(getOriginRejection('POST', 'https://platform.example.com', 'same-origin', 'https://platform.example.com', true), null);
  assert.equal(getOriginRejection('POST', 'https://evil.example', 'cross-site', 'https://platform.example.com', true), 'cross-site');
  assert.equal(getOriginRejection('POST', null, null, 'https://platform.example.com', true), 'missing-origin');
  assert.equal(getOriginRejection('GET', null, 'cross-site', 'https://platform.example.com', true), null);
});

test('rate-limit identifiers are deterministic hashes without raw values', () => {
  const first = hashSecurityKey('auth-account', 'Engineer@Example.com');
  const second = hashSecurityKey('auth-account', 'engineer@example.com');
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(first.includes('engineer'), false);
});


test('production CSP authorizes only nonce-bearing inline scripts', () => {
  const policy = buildContentSecurityPolicy('testnonce', false);
  assert.match(policy, /script-src 'self' 'nonce-testnonce' 'strict-dynamic'/);
  assert.equal(policy.includes("script-src 'self' 'unsafe-inline'"), false);
  assert.equal(policy.includes("'unsafe-eval'"), false);
});
